# 📖 M1 帶讀筆記（完整版）· `px4_ros_com` offboard_control.cpp 逐段解說

> 模組：[reading-track.md](reading-track.md) Module 1（飛控與中介層架構與用法）
> 來源檔：`PX4/px4_ros_com` → `src/examples/offboard/offboard_control.cpp`（main 分支，已核對 GitHub raw）
> 對應動手路線：[02-phase2-ros2-comm.md](02-phase2-ros2-comm.md) Week 4 Day 3–4
> 搭配速查：[m1-offboard-code-reading.md](m1-offboard-code-reading.md)（精簡版 + cheat-sheet）

---

## 0. 先看大局：三個 message 的分工

整支程式其實只在做一件事——**用三種訊息對 PX4 喊話**。先記住這張分工表，後面每段都會回扣到它：

| 訊息 | 角色 | 比喻 | 發送頻率 |
|---|---|---|---|
| `OffboardControlMode` | **心跳 + 宣告「我要控哪一層」**（position / velocity / attitude / rate…） | 「我還活著，而且我要用『位置』來指揮」 | 每個 cycle（≥2Hz）|
| `TrajectorySetpoint` | **實際的數值命令**（飛到哪、朝哪、多快） | 「目標：(0,0,-5)，機頭轉 180°」 | 每個 cycle，跟上面成對 |
| `VehicleCommand` | **一次性指令**（切模式、arm/disarm） | 「現在切 Offboard」「上鎖！」 | 只在需要時送一次 |

資料流：`你的節點 → /fmu/in/* topic → uXRCE-DDS Agent → PX4 commander/控制器 → mixer → 馬達`。

---

## 1. License + 檔頭註解（41 行版權，略讀）

```cpp
/****  Copyright 2020 PX4 Development Team ... ****/
/**
 * @brief Offboard control example
 * @file offboard_control.cpp
 */
```

BSD 授權 + Doxygen 檔頭。讀 code 時直接跳過，但知道它在那就好。

---

## 2. Includes 與 using

```cpp
#include <px4_msgs/msg/offboard_control_mode.hpp>
#include <px4_msgs/msg/trajectory_setpoint.hpp>
#include <px4_msgs/msg/vehicle_command.hpp>
#include <px4_msgs/msg/vehicle_control_mode.hpp>
#include <rclcpp/rclcpp.hpp>
#include <stdint.h>
#include <chrono>
#include <iostream>

using namespace std::chrono;
using namespace std::chrono_literals;   // 讓你能寫 100ms
using namespace px4_msgs::msg;          // 直接寫 OffboardControlMode 而不用全名
```

- 前三個 include = 上面那三種訊息，**這就是整個 Offboard 的核心 API 表面**。
- `vehicle_control_mode.hpp` 被 include 了**但這個最小範例其實沒用到**——它是留給你擴充用的：訂閱 `/fmu/out/vehicle_control_mode` 可以回讀「PX4 現在是否真的進了 Offboard」。先記著，Week 4 Day 6 做穩健性時會用到。
- `rclcpp` = ROS2 的 C++ client library（對應 Python 的 `rclpy`）。
- `chrono_literals` 是為了能直接寫 `100ms` 這種字面量。

---

## 3. 類別宣告與建構子（整支程式的心臟）

```cpp
class OffboardControl : public rclcpp::Node
{
public:
	OffboardControl() : Node("offboard_control")
	{
		offboard_control_mode_publisher_ = this->create_publisher<OffboardControlMode>("/fmu/in/offboard_control_mode", 10);
		trajectory_setpoint_publisher_   = this->create_publisher<TrajectorySetpoint>("/fmu/in/trajectory_setpoint", 10);
		vehicle_command_publisher_       = this->create_publisher<VehicleCommand>("/fmu/in/vehicle_command", 10);

		offboard_setpoint_counter_ = 0;
		...
```

**逐點拆解：**

1. `: public rclcpp::Node` —— 這個類別**就是一個 ROS2 節點**，節點名叫 `offboard_control`（之後 `ros2 node list` 看得到）。
2. 三個 publisher，各對應一種訊息，發布到 `/fmu/in/...`。
   - 注意 topic 命名 **`/fmu/in/xxx`** = 「給 PX4 的輸入」。`/fmu/out/xxx` 才是 PX4 吐出來的狀態。這是 uXRCE-DDS 的命名慣例（取代舊版 MAVROS 的 `/mavros/...`）。
   - 第二個參數 `10` 是 QoS 的 **queue depth**（預設 reliable）。⚠️ **重點**：這支範例**只發布、不訂閱**，所以踩不到你 Week 3/4 學的「QoS 不匹配收不到」陷阱——那個陷阱只在訂閱 `/fmu/out/*`（best-effort）時出現。
3. `offboard_setpoint_counter_ = 0` —— 一個計數器，等下用它當**狀態機的時鐘**。

接著是核心的 timer callback：

```cpp
		auto timer_callback = [this]() -> void {

			if (offboard_setpoint_counter_ == 10) {
				// Change to Offboard mode after 10 setpoints
				this->publish_vehicle_command(VehicleCommand::VEHICLE_CMD_DO_SET_MODE, 1, 6);
				// Arm the vehicle
				this->arm();
			}

			// offboard_control_mode needs to be paired with trajectory_setpoint
			publish_offboard_control_mode();
			publish_trajectory_setpoint();

			// stop the counter after reaching 11
			if (offboard_setpoint_counter_ < 11) {
				offboard_setpoint_counter_++;
			}
		};
		timer_ = this->create_wall_timer(100ms, timer_callback);
```

**這是整支程式最重要的 20 行，慢慢看：**

- `create_wall_timer(100ms, ...)` —— 每 **100ms = 10Hz** 跑一次這個 lambda。10Hz 遠高於 Offboard 要求的 ≥2Hz。
- **每個 cycle 一定做的事**：`publish_offboard_control_mode()` + `publish_trajectory_setpoint()` 成對發送。註解 `needs to be paired` 講白了就是：**心跳（mode）和命令（setpoint）必須一起、持續地送**，缺一不可。
- **只在 `counter == 10` 那一次才做的事**：送 `DO_SET_MODE`（切 Offboard）+ `arm()`。
- 計數器跑到 11 就**封頂不再加**（避免溢位，也標記「進入穩定 streaming 狀態」）。

**追一遍時間軸（這就是你 checkpoint 要會講的「啟動順序」）：**

| 時間 | counter | 動作 |
|---|---|---|
| t=0.0s | 0 | 只送 mode+setpoint，counter→1 |
| t=0.1~0.9s | 1→9 | 持續送 mode+setpoint（**累積 10 次 streaming**）|
| **t=1.0s** | **10** | **先**送 DO_SET_MODE + arm，**再**送 mode+setpoint，counter→11 |
| t>1.0s | 11 | 永遠持續送 mode+setpoint（維持 Offboard 不掉）|

> 關鍵：在切模式之前，**已經有整整 1 秒、10 筆 setpoint 在 streaming 了**。這直接帶到核心問題 ——

---

## 🔑 為什麼一定要「先送 setpoint，才能切模式」？

這是 PX4 的**安全設計**，不是程式風格問題：

1. **Offboard = 把控制權交給外部電腦。** PX4 在交權之前，要先看到「外部控制器確實活著、而且正在穩定吐命令」的證據。
2. 所以 PX4 commander 規定：**進入 Offboard 模式的前提，是已經有 setpoint 以 ≥2Hz 的頻率在進來。** 如果你還沒 streaming 就送 `DO_SET_MODE → OFFBOARD`，commander 會**直接拒絕**，模式切不過去（連帶常常 arm 也失敗）。
3. **而且這是持續性的要求**：一旦進了 Offboard，setpoint 流若中斷超過 `COM_OF_LOSS_T`（預設 ~0.5s），PX4 會判定「外部控制器掛了」→ **觸發 failsafe**（懸停/RTL/降落）。這就是為什麼 counter 封頂後**還要永遠送下去**。

> 一句話記法：**setpoint 流是 Offboard 的「生命徵象」。沒有徵象，PX4 不交權；徵象斷了，PX4 收回權。** 範例用「先空送 10 筆」來確保切模式那一刻，生命徵象已經建立。

---

## 4. arm() / disarm()

```cpp
void OffboardControl::arm()
{
	publish_vehicle_command(VehicleCommand::VEHICLE_CMD_COMPONENT_ARM_DISARM, 1.0);
	RCLCPP_INFO(this->get_logger(), "Arm command send");
}
void OffboardControl::disarm()
{
	publish_vehicle_command(VehicleCommand::VEHICLE_CMD_COMPONENT_ARM_DISARM, 0.0);
	RCLCPP_INFO(this->get_logger(), "Disarm command send");
}
```

兩個都只是 `VehicleCommand` 的薄包裝：同一個指令 `COMPONENT_ARM_DISARM`，靠 **param1**（`1.0`=arm，`0.0`=disarm）區分。`RCLCPP_INFO` 是 ROS2 的 log。

---

## 5. publish_offboard_control_mode()（宣告控制層級）

```cpp
void OffboardControl::publish_offboard_control_mode()
{
	OffboardControlMode msg{};
	msg.position     = true;
	msg.velocity     = false;
	msg.acceleration = false;
	msg.attitude     = false;
	msg.body_rate    = false;
	msg.timestamp = this->get_clock()->now().nanoseconds() / 1000;
	offboard_control_mode_publisher_->publish(msg);
}
```

- 五個 bool 是**控制層級的選擇器**，對應 PX4 級聯控制的不同入口（position → velocity → attitude → body_rate，越上層越「高階」）。
- 這裡 `position=true`，其餘 false → 告訴 PX4：「**用位置控制**，請去讀 `TrajectorySetpoint` 的 `position` 欄位，然後自己跑位置→速度→姿態→角速度的級聯。」
- PX4 會挑**最高優先級為 true** 的那層當作控制入口。所以這個 bool 決定了「下面那個 setpoint 訊息裡，哪些欄位才有意義」。
- `timestamp = now().nanoseconds() / 1000` —— **轉成微秒（µs）**。PX4 內部（uORB）的時間戳一律用 µs，所以這裡除以 1000。每個 publish 函式都會做這一步。

---

## 6. publish_trajectory_setpoint()（實際命令）

```cpp
void OffboardControl::publish_trajectory_setpoint()
{
	TrajectorySetpoint msg{};
	msg.position = {0.0, 0.0, -5.0};
	msg.yaw = -3.14; // [-PI:PI]
	msg.timestamp = this->get_clock()->now().nanoseconds() / 1000;
	trajectory_setpoint_publisher_->publish(msg);
}
```

- `position = {0.0, 0.0, -5.0}` —— **NED 座標**（North-East-**Down**）。⚠️ **z 向下為正，所以「飛到 5 公尺高」是 z = -5，不是 +5。**（這就是你常見坑清單裡那條。）
- `yaw = -3.14` rad ≈ -180°，機頭朝南（範圍 `[-π, π]`）。
- 因為上面 `OffboardControlMode.position=true`，PX4 只會讀 `position` + `yaw`；`velocity / acceleration` 這些就算有值也不驅動。**要做部分控制（例如只控速度某軸）時，慣例是把不想控的欄位設成 `NaN` 代表「忽略」**——但本例用位置模式，所以不需要。

**OffboardControlMode 與 TrajectorySetpoint 怎麼搭（回扣大局表）：**
> `OffboardControlMode` 說「**用哪種控制**」，`TrajectorySetpoint` 給「**具體數值**」。兩者**必須成對、同頻發送**：前者是 PX4 路由 setpoint 到正確控制迴路的依據，也是 Offboard 的心跳；後者是 payload。少了前者，PX4 不知道把數值送進哪一層；少了後者，有路由卻沒命令。

---

## 7. publish_vehicle_command()（通用指令打包）

```cpp
void OffboardControl::publish_vehicle_command(uint16_t command, float param1, float param2)
{
	VehicleCommand msg{};
	msg.param1 = param1;
	msg.param2 = param2;
	msg.command = command;
	msg.target_system = 1;       // 目標飛控的 MAVLink system id
	msg.target_component = 1;
	msg.source_system = 1;
	msg.source_component = 1;
	msg.from_external = true;     // 標記「這是外部來的指令」
	msg.timestamp = this->get_clock()->now().nanoseconds() / 1000;
	vehicle_command_publisher_->publish(msg);
}
```

- 這是個**通用打包器**：`command` 是指令碼（對齊 MAVLink 的 `MAV_CMD`），`param1/param2` 是參數。arm 和切模式都復用它。
- 回看切模式那一行 `publish_vehicle_command(VEHICLE_CMD_DO_SET_MODE, 1, 6)`：
  - **param1 = 1** → base mode = 「啟用 custom mode」（`MAV_MODE_FLAG_CUSTOM_MODE_ENABLED`）。
  - **param2 = 6** → PX4 的 custom main mode = **6 = OFFBOARD**。
  - 合起來就是：「啟用自訂模式，主模式設為 Offboard。」
- `target_system = 1`：對單機 SITL，飛控的 system id 預設是 1。
- `from_external = true`：**必填**，告訴 PX4 這指令來自機外（offboard 源），PX4 才會正確接受/處理。

---

## 8. main()

```cpp
int main(int argc, char *argv[])
{
	std::cout << "Starting offboard control node..." << std::endl;
	setvbuf(stdout, NULL, _IONBF, BUFSIZ);   // 關掉 stdout 緩衝，log 即時印出
	rclcpp::init(argc, argv);
	rclcpp::spin(std::make_shared<OffboardControl>());  // 建節點 + 進事件迴圈
	rclcpp::shutdown();
	return 0;
}
```

- `setvbuf(..._IONBF...)` = 把 stdout 設成**無緩衝**，確保 log 立刻看得到（除錯友善）。
- `rclcpp::spin(...)` = 建立節點並進入**事件迴圈**：從這裡開始，前面那個 100ms timer 就會一直被觸發，直到 Ctrl-C。`spin` 是阻塞的，程式就卡在這跑。

---

## 🧾 Cheat-sheet：「送一個定點懸停」最小要做的事

| 步驟 | 訊息 → topic | 關鍵欄位 | 值（範例）|
|---|---|---|---|
| ① 持續宣告控制層 | `OffboardControlMode` → `/fmu/in/offboard_control_mode` | `position` | `true`（其餘 false）|
| ② 持續送目標點 | `TrajectorySetpoint` → `/fmu/in/trajectory_setpoint` | `position[3]`, `yaw` | `{0,0,-5}`（NED，高 5m）, `-3.14` |
| ①② 都要 | 兩者每 cycle 成對，頻率 ≥2Hz（範例用 10Hz） | `timestamp` | `now().nanoseconds()/1000`（µs）|
| ③ 切 Offboard | `VehicleCommand` → `/fmu/in/vehicle_command` | `command=DO_SET_MODE`, `param1=1`, `param2=6` | — |
| ④ Arm | `VehicleCommand` 同上 | `command=COMPONENT_ARM_DISARM`, `param1=1.0` | — |
| 通用 | `VehicleCommand` | `target_system=1`, `from_external=true` | — |

**順序鐵律**：①②先 streaming 一段時間 → 再 ③ 切模式 → ④ arm → ①② 永遠不能停。

---

## 🧠 深入理解：Position setpoint 的位置從哪來？

`TrajectorySetpoint.position = {0, 0, -5}` 是你「命令」PX4 飛去哪的**目標值**，不是感測器讀值。PX4 內部用 **EKF2**（Extended Kalman Filter 2）融合多種感測器估算當前位置，再拿估算值與你的 setpoint 做誤差計算：

```
感測器融合 → EKF2 → vehicle_local_position（uORB）
                               ↓
你的 setpoint → [誤差] → 位置控制器 → 速度控制器 → 姿態控制器 → 馬達
```

| 感測器 | 貢獻 | 侷限 |
|---|---|---|
| IMU（加速度計+陀螺儀）| 高頻短期運動 | 積分漂移，獨立使用幾秒就跑掉 |
| GPS/GNSS | 絕對位置（戶外）| 室內無訊號 |
| 氣壓計 | 高度 | 只有 z 軸，精度約 ±1m |
| 光流（Optical Flow）| 相對速度/位移 | 需要紋理豐富的地面 |
| VIO / Motion Capture | 室內精確位置 | 需額外硬體（T265、VICON 等）|

> IMU 是 EKF2 的輸入之一，**不是**位置估算的唯一來源。如果想在節點裡讀回 PX4 當前估算的位置，訂閱 `/fmu/out/vehicle_local_position`。

---

## 🎛️ 何時選用不同的控制層？

`OffboardControlMode` 的五個 bool 決定你「在級聯控制的哪個入口插手」。越往下層，你需要在 companion 上自己實作的控制邏輯越多，但換來更高的敏捷性與控制彈性：

```
[你的節點] → position → velocity → acceleration → attitude → body_rate → mixer → 馬達
              ↑                                                              ↑
         最上層，最容易用                                          最下層，最敏捷
```

| 模式 | 典型場景 | 為什麼選它 |
|---|---|---|
| **position**（本例）| 定點懸停、航點任務 | 最省力，PX4 跑完整個級聯。**前提：有可靠位置估算（GPS 或 VIO）** |
| **velocity** | 跟蹤移動目標、視覺伺服、GPS denied 環境 | 沒有絕對位置也能飛；用「往哪個方向、多快」語義，不需指定終點座標 |
| **acceleration** | 軌跡規劃器直接輸出加速度（MPC 等）| 減少中間轉換誤差，作為 feedforward 使用 |
| **attitude** | Companion 自跑位置/速度外環，只讓 PX4 穩定姿態 | 需要更快的外環回應，或需精細姿態控制（如無人機掛載機械臂）|
| **body_rate** | 競速機、強化學習 policy、高敏捷動作（翻滾）| 最快響應；companion 需自己跑完整姿態控制，RL controller 常直接輸出角速度指令 |

**選擇原則**：有 GPS/VIO + 任務簡單 → `position`；GPS denied 或需速度語義 → `velocity`；Companion 有自己的控制器 → `attitude` 或 `body_rate`；追求最小延遲 → `body_rate`（你要負責姿態穩定）。

---

## ⚠️ 讀這份範例要注意的版本/座標陷阱

- **topic 命名**：`/fmu/in/*` 與 `/fmu/out/*` 是 **uXRCE-DDS（PX4 v1.14+）** 的命名。更舊的 micrortps_bridge 是 `/fmu/xxx/in` 這種，別搞混。
- **`px4_msgs` 版本要對齊你的 PX4 版本**，否則 `TrajectorySetpoint.position` 這類欄位對不上（早期版本是分開的 `x,y,z`，現在是 `float[3] position`）。
- **NED 的 z 向下為正** → 想飛高用負值。
- 這支只發布不訂閱，所以**沒處理「確認真的進了 Offboard」**——進階版要訂閱 `/fmu/out/vehicle_status` 或 `vehicle_control_mode` 來確認（對應那個沒被用到的 include）。

---

## ✅ 自我驗收（對應 Week 4 checkpoint）
- [ ] 能說出 Offboard 啟動順序：先 streaming setpoint → 切模式 → arm，且永不停
- [ ] 能解釋為何先送 setpoint：生命徵象 → PX4 才交權 / 斷了觸 failsafe
- [ ] 能說 OffboardControlMode（控哪層+心跳）vs TrajectorySetpoint（數值）vs VehicleCommand（切模式/arm）三者分工
- [ ] 記得 NED z 向下為正、timestamp 用 µs、from_external=true 必填
