# 📝 M1 Code-reading 筆記 · `px4_ros_com` offboard_control.cpp

> 模組：[reading-track.md](reading-track.md) Module 1（飛控與中介層架構與用法）
> 來源檔：`PX4/px4_ros_com` → `src/examples/offboard/offboard_control.cpp`（main 分支，已核對 GitHub raw）
> 對應動手路線：[02-phase2-ros2-comm.md](02-phase2-ros2-comm.md) Week 4 Day 3–4
> 產出物類型：逐段 code-reading 筆記 + 「送一個定點」cheat-sheet

---

## 0. 大局：三個 message 的分工

整支程式只做一件事——用三種訊息對 PX4 喊話。

| 訊息 | 角色 | 比喻 | 頻率 |
|---|---|---|---|
| `OffboardControlMode` | 心跳 + 宣告「我要控哪一層」(position/velocity/attitude/rate) | 「我還活著，要用位置指揮」 | 每 cycle（≥2Hz）|
| `TrajectorySetpoint` | 實際數值命令（飛到哪、朝哪、多快） | 「目標 (0,0,-5)，機頭 180°」 | 每 cycle，與 mode 成對 |
| `VehicleCommand` | 一次性指令（切模式、arm/disarm） | 「切 Offboard」「arm」 | 需要時送一次 |

資料流：`本節點 → /fmu/in/* → uXRCE-DDS Agent → PX4 commander/控制器 → mixer → 馬達`
（`/fmu/in/*` = 給 PX4 的輸入；`/fmu/out/*` = PX4 吐出的狀態。這是 uXRCE-DDS 命名，取代舊版 MAVROS。）

---

## 1. Includes 與 using
```cpp
#include <px4_msgs/msg/offboard_control_mode.hpp>   // 三個核心訊息
#include <px4_msgs/msg/trajectory_setpoint.hpp>
#include <px4_msgs/msg/vehicle_command.hpp>
#include <px4_msgs/msg/vehicle_control_mode.hpp>     // ★ 被 include 但本例未用（留給擴充：回讀是否真進 Offboard）
#include <rclcpp/rclcpp.hpp>                          // ROS2 C++ client lib（= rclpy 的 C++ 版）
using namespace std::chrono_literals;                 // 讓你能寫 100ms
using namespace px4_msgs::msg;                         // 省略訊息全名
```

## 2. 類別 = 一個 ROS2 節點
- `class OffboardControl : public rclcpp::Node`，節點名 `offboard_control`。
- 建構子建立三個 publisher，皆發到 `/fmu/in/...`，QoS depth=10（預設 reliable）。
- ⚠️ 本例**只發布、不訂閱** → 踩不到「QoS 不匹配收不到」陷阱（那只在訂閱 `/fmu/out/*` best-effort 時發生，見 Week3/4 QoS 課）。

## 3. 核心：100ms timer 狀態機
```cpp
timer_ = create_wall_timer(100ms, timer_callback);  // 10Hz，遠高於 ≥2Hz 要求
```
callback 每 cycle：
1. `if (counter == 10)` → 送 `DO_SET_MODE`(切 Offboard) + `arm()`（只此一次）
2. **每 cycle 都**成對送 `publish_offboard_control_mode()` + `publish_trajectory_setpoint()`
3. counter 跑到 11 封頂不再加（標記進入穩定 streaming）

**時間軸：**

| 時間 | counter | 動作 |
|---|---|---|
| 0.0s | 0 | 只送 mode+setpoint，counter→1 |
| 0.1–0.9s | 1→9 | 持續 streaming（累積 10 筆）|
| **1.0s** | **10** | **先**切模式+arm，**再**送 mode+setpoint |
| >1.0s | 11 | 永遠持續送 mode+setpoint（維持 Offboard）|

---

## 🔑 為什麼「先送 setpoint，才能切模式」（M1 核心觀念）
PX4 的安全設計，非風格問題：
1. Offboard = 把控制權交給外部電腦；交權前 PX4 要先看到「外部控制器活著且正在穩定吐命令」的證據。
2. commander 規定：**進 Offboard 的前提，是已有 setpoint 以 ≥2Hz 進來**。沒 streaming 就切 → **被拒**（常連帶 arm 失敗）。
3. 持續性要求：進了 Offboard 後，setpoint 中斷超過 `COM_OF_LOSS_T`（~0.5s）→ **觸發 failsafe**。所以 counter 封頂後仍要永遠送。

> 記法：**setpoint 流 = Offboard 的生命徵象。沒徵象不交權；徵象斷了收回權。** 範例用「先空送 10 筆」確保切模式那刻徵象已建立。

---

## 4. arm() / disarm()
同一指令 `VEHICLE_CMD_COMPONENT_ARM_DISARM`，靠 param1 區分：`1.0`=arm、`0.0`=disarm。

## 5. publish_offboard_control_mode()（宣告控制層級）
```cpp
msg.position = true;   // 其餘 velocity/acceleration/attitude/body_rate = false
msg.timestamp = now().nanoseconds() / 1000;   // ★ PX4/uORB 用微秒(µs)
```
- 五個 bool = 級聯控制的層級選擇器（position→velocity→attitude→body_rate）。
- PX4 挑「最高優先級為 true」那層當入口；此 bool 也決定 setpoint 裡哪些欄位有意義。

## 6. publish_trajectory_setpoint()（實際命令）
```cpp
msg.position = {0.0, 0.0, -5.0};   // ★ NED：z 向下為正 → 飛高 5m 是 z=-5
msg.yaw = -3.14;                    // ≈ -180°，範圍 [-π,π]
```
- 因 mode.position=true，PX4 只讀 position+yaw；其餘欄位不驅動。
- 部分控制時慣例把不想控的欄位設 `NaN`=忽略（本例位置模式不需要）。

**mode × setpoint 怎麼搭**：mode 說「用哪種控制」(路由+心跳)，setpoint 給「具體數值」(payload)。必須成對同頻；缺 mode 則數值無處可去，缺 setpoint 則有路由無命令。

## 7. publish_vehicle_command()（通用打包器）
```cpp
msg.command=command; msg.param1=param1; msg.param2=param2;
msg.target_system=1; msg.target_component=1;   // 單機 SITL 飛控 id 預設 1
msg.from_external=true;                          // ★ 必填：標記機外來源，PX4 才接受
msg.timestamp = now().nanoseconds()/1000;
```
切 Offboard 那行 `DO_SET_MODE, param1=1, param2=6`：
- param1=1 → 啟用 custom mode（`MAV_MODE_FLAG_CUSTOM_MODE_ENABLED`）
- param2=6 → PX4 custom main mode **6 = OFFBOARD**

## 8. main()
- `setvbuf(stdout,_IONBF)`：stdout 無緩衝，log 即時印。
- `rclcpp::spin(node)`：建節點 + 進事件迴圈（阻塞），timer 從此每 100ms 觸發到 Ctrl-C。

---

## 🧾 Cheat-sheet：「送一個定點懸停」最小步驟

| 步驟 | 訊息 → topic | 關鍵欄位 | 值 |
|---|---|---|---|
| ① 持續宣告控制層 | `OffboardControlMode` → `/fmu/in/offboard_control_mode` | `position` | `true`（其餘 false）|
| ② 持續送目標 | `TrajectorySetpoint` → `/fmu/in/trajectory_setpoint` | `position[3]`,`yaw` | `{0,0,-5}`(NED,5m),`-3.14` |
| ①② | 每 cycle 成對，≥2Hz（範例 10Hz）| `timestamp` | `now().nanoseconds()/1000` (µs) |
| ③ 切 Offboard | `VehicleCommand` → `/fmu/in/vehicle_command` | `command=DO_SET_MODE`,`param1=1`,`param2=6` | — |
| ④ Arm | `VehicleCommand` 同上 | `command=COMPONENT_ARM_DISARM`,`param1=1.0` | — |
| 通用 | `VehicleCommand` | `target_system=1`,`from_external=true` | — |

**順序鐵律**：①②先 streaming → ③切模式 → ④arm → ①②永不停。

---

## ⚠️ 版本/座標陷阱
- topic 命名 `/fmu/in/*`、`/fmu/out/*` 是 uXRCE-DDS（PX4 v1.14+）；舊 micrortps_bridge 是 `/fmu/xxx/in`。
- `px4_msgs` 版本要對齊 PX4 版本，否則 `TrajectorySetpoint.position` 等欄位對不上（早期是分開的 x,y,z）。
- NED z 向下為正 → 飛高用負值。
- 本例只發布不訂閱，未確認「真的進了 Offboard」；進階版訂閱 `/fmu/out/vehicle_status` 或 `vehicle_control_mode` 確認（= 那個未用的 include）。

---

## ✅ 自我驗收（對應 Week4 checkpoint）
- [ ] 能說出 Offboard 啟動順序：先 streaming setpoint → 切模式 → arm，且永不停
- [ ] 能解釋為何先送 setpoint：生命徵象 → PX4 才交權 / 斷了觸 failsafe
- [ ] 能說 OffboardControlMode（控哪層+心跳）vs TrajectorySetpoint（數值）vs VehicleCommand（切模式/arm）三者分工
- [ ] 記得 NED z 向下為正、timestamp 用 µs、from_external=true 必填
