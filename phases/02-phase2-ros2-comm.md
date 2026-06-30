# 📗 Phase 2（Week 3–4）· 中間層通訊與軟體整合

> **階段目標**：掌握 ROS2 核心概念，並透過 **Micro XRCE-DDS** 實現 ROS2 ↔ PX4 通訊，最終自寫節點以 Offboard 模式送 `TrajectorySetpoint` 飛軌跡。
> 圖例：★ 必做 ／ ◇ 進階。每日預設 3–5 小時。
> 前置：先把 [00-environment-setup.md](00-environment-setup.md) 的 2.6 / 2.7（Agent、`px4_ros_com`/`px4_msgs`）裝好。

---

## 🗓️ Week 3 · ROS2 核心觀念

**本週目標**：能自寫 publisher/subscriber/service 節點，理解 DDS 與 QoS，並用 `rqt_graph` 看懂節點圖。

### 每日學習清單

#### Day 1 — ROS2 架構與工具鏈 ★
- 〔觀念〕為何 ROS2 取代 ROS1：去中心化（無 master）、DDS 中介、即時性、跨平台。
- 〔觀念〕workspace / package / `colcon build` / `source install/setup.bash` / `ament`。
- 〔動手〕建一個 workspace，建立 `ament_python` 與 `ament_cmake` 各一個空 package 並編譯成功。
- 〔資源〕[ROS2 Humble Tutorials – Beginner: CLI](https://docs.ros.org/en/humble/Tutorials.html)。

#### Day 2 — Node 與 Topic（pub/sub）★
- 〔觀念〕Node 生命週期、Topic 是多對多非同步串流、message type（`std_msgs`、`geometry_msgs`、`sensor_msgs`）。
- 〔動手〕Python 寫一對 talker/listener（`rclpy`），用 `ros2 topic echo / hz / bw` 觀察。
- 〔動手〕◇ 用 C++（`rclcpp`）也寫一遍，對照兩種 client library。
- 〔資源〕ROS2 Tutorials – Writing a simple publisher/subscriber。

#### Day 3 — Service 與 Action ★
- 〔觀念〕**Service**＝同步請求/回應（一次性，如「回報電量」）；**Action**＝長時間有回饋的任務（如「飛到某點」可取消、有進度）。
- 〔動手〕寫一個 service（加法或「切換模式」假服務）+ client 呼叫。
- 〔動手〕◇ 寫一個簡單 action server/client（倒數計時器）。
- 〔資源〕ROS2 Tutorials – Services / Actions。

#### Day 4 — DDS 與 QoS（關鍵）★
- 〔觀念〕DDS（Data Distribution Service）是 ROS2 底層；**QoS profile**：Reliability（reliable/best-effort）、Durability（volatile/transient-local）、History（keep-last/keep-all）、Depth。
- 〔觀念〕**為何重要**：感測高頻資料常用 best-effort；PX4 topics 有特定 QoS，**QoS 不匹配會收不到訊息**（最常見除錯陷阱）。
- 〔動手〕同一 topic 用不同 QoS 試 pub/sub，重現「收不到」並修好。
- 〔資源〕[ROS2 QoS Concepts](https://docs.ros.org/en/humble/Concepts/Intermediate/About-Quality-of-Service-Settings.html)。

#### Day 5 — 除錯與可視化工具 ★
- 〔觀念〕`rqt_graph`、`ros2 node/topic/service list`、`ros2 bag`（錄製/重播）、`tf2`（座標轉換）、RViz2。
- 〔動手〕錄一段 `ros2 bag` 再重播；用 `rqt_graph` 畫出你前幾天節點的連線圖。
- 〔資源〕ROS2 Tutorials – rqt / tf2 / bag。

#### Day 6 — 參數、launch 與整合 ★
- 〔觀念〕node parameters、`launch`（Python launch file 一次起多個節點）、namespace。
- 〔動手〕寫一個 launch file 同時啟動 talker + listener + 設定參數。
- 〔資源〕ROS2 Tutorials – Launch / Parameters。

> **Day 7**：休息 / 把 ROS2 概念整理成一頁速查表。

### ✅ Week 3 檢查點（自我驗收）
- [ ] 能說清楚 Topic / Service / Action 各自適用情境
- [ ] 能自寫並跑通 Python pub/sub + 一個 service
- [ ] **能解釋 QoS 四要素，並重現「QoS 不匹配收不到訊息」再修好**
- [ ] 能用 `rqt_graph` 與 `ros2 bag` 觀察/重播系統

### ⚠️ 常見坑
- 改了 package 沒重新 `colcon build` / 沒重新 `source` → 跑到舊版。
- QoS 不匹配（最常見）→ subscriber 靜默收不到，無錯誤訊息。
- 忘記 workspace 的 `setup.bash` 疊在 `/opt/ros/humble/setup.bash` 之後（overlay 順序）。

### 📦 Week 3 交付物
- 一個可編譯執行的 ROS2 package（含 pub/sub + service + launch）+ ROS2 速查表。

---

## 🗓️ Week 4 · Micro XRCE-DDS + PX4 Offboard 控制

**本週目標**：理解 PX4↔ROS2 橋接原理，並自寫 Offboard 節點送 `TrajectorySetpoint`，讓 SITL 無人機定點/走 Z 字軌跡。

### 每日學習清單

#### Day 1 — 橋接原理（取代 MAVROS）★
- 〔觀念〕**uXRCE-DDS**：PX4 內建 `uxrce_dds_client`，透過 **Micro XRCE-DDS Agent** 把 uORB topics 橋成 ROS2 topics（`/fmu/out/*` 訂閱、`/fmu/in/*` 發布）。這是現行做法，**已取代舊版 MAVROS**。
- 〔觀念〕`px4_msgs`（PX4 訊息定義）、`px4_ros_com`（範例與工具）的角色。
- 〔動手〕啟動三件套：`make px4_sitl gz_x500` → `MicroXRCEAgent udp4 -p 8888` → `ros2 topic list`，確認看到 `/fmu/out/vehicle_odometry` 等。
- 〔資源〕[PX4 ROS2 User Guide (uXRCE-DDS)](https://docs.px4.io/main/en/ros2/user_guide.html)。

#### Day 2 — 讀取 PX4 狀態 topics ★
- 〔觀念〕常用 out topics：`vehicle_odometry`、`vehicle_status`、`vehicle_local_position`、`vehicle_attitude`。
- 〔觀念〕**PX4 topics 用特定 QoS（best-effort + keep-last）** → 訂閱端 QoS 必須匹配（接 Week3 學到的）。
- 〔動手〕寫 ROS2 訂閱節點印出無人機即時位置/姿態；故意用錯 QoS 重現收不到。
- 〔資源〕`px4_ros_com` 範例 `offboard_control` 內的 QoS 設定。

#### Day 3 — Offboard 模式機制 ★
- 〔觀念〕Offboard 要求：**先以 ≥2Hz 持續送 setpoint**，再切 Offboard 模式並 arm（順序錯會被拒）。
- 〔觀念〕`OffboardControlMode`（宣告控制哪一層：position/velocity/attitude...）+ `TrajectorySetpoint`（實際命令）+ `VehicleCommand`（arm/切模式）。
- 〔動手〕讀懂官方 `offboard_control` 範例（C++ 或 Python）的 state machine。
- 〔資源〕[PX4 Offboard Mode](https://docs.px4.io/main/en/flight_modes/offboard.html)。

#### Day 4 — 自寫 Offboard：定點懸停 ★
- 〔動手〕用 `px4_ros_com` 範例為骨架，寫節點：持續送 `OffboardControlMode`(position=true) + `TrajectorySetpoint`(x,y,z)，arm 後懸停在 (0,0,-5)（NED，z 向下為負）。
- 〔動手〕驗證無人機飛到指定高度並穩定懸停。
- 〔資源〕官方 ROS2 Offboard 範例教學。

#### Day 5 — 走 Z 字 / 方形軌跡 ★
- 〔動手〕設計一串 waypoint（如方形或 Z 字），到點判定（位置誤差 < 閾值）後送下一點。
- 〔動手〕用 `ros2 bag` 錄軌跡、事後用 Python 畫出 XY 平面實際路徑。
- 〔動手〕◇ 改送 velocity setpoint 而非 position，比較行為。
- 〔資源〕`geometry_msgs`、PX4 座標系（NED vs ENU）說明。

#### Day 6 — 整合與穩健性 ★
- 〔觀念〕failsafe：Offboard 訊號中斷 → PX4 自動進入 failsafe（要理解別嚇到）。
- 〔動手〕加入起飛→巡航→降落→disarm 的完整流程，處理切模式失敗的重試。
- 〔動手〕把整個流程寫成 launch file（agent 提示用手動起，其餘自動）。

> **Day 7**：休息 / 整理「Offboard 啟動順序」與「QoS 匹配」筆記。

### ✅ Week 4 檢查點（自我驗收）
- [ ] 能解釋 uXRCE-DDS 如何橋接 uORB ↔ ROS2，以及它為何取代 MAVROS
- [ ] 能用匹配的 QoS 訂閱並印出 PX4 即時位置/姿態
- [ ] 能說出 Offboard 的啟動順序（先送 setpoint → 切模式 → arm）
- [ ] **自寫節點讓 SITL 無人機定點懸停**
- [ ] **自寫節點讓無人機走完 Z 字/方形軌跡，並畫出實際路徑圖**

### ⚠️ 常見坑
- 沒先持續送 setpoint 就切 Offboard → 被拒、無法 arm。
- QoS 不匹配 → 收不到 `/fmu/out/*`（接 Week3 教訓）。
- NED 座標：**z 向下為負**，想飛高是 z = -5 不是 +5。
- `px4_msgs` 版本要與你的 PX4 版本對應，否則訊息欄位對不上。

### 📦 Week 4 交付物
- **Offboard 軌跡節點**（定點 + Z 字/方形）+ 一張用 bag 重建的實際飛行路徑圖。

---

## 🚀 Phase 2 延伸（時間有餘 ◇）
- 用 `tf2` 把 PX4 的 NED 與 ROS 慣用 ENU 做座標轉換。
- 試多機（multi-vehicle SITL）+ namespace 隔離。
- 把軌跡產生器抽成獨立節點，用 Action 介面接收「飛去某點」請求（為 Phase 4 鋪路）。

➡️ 下一階段：[Phase 3 · AI 感知與具身智能](03-phase3-ai-perception.md)
