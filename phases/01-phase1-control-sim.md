# 📘 Phase 1（Week 1–2）· 底層控制與模擬打底

> **階段目標**：找回 C++/Python 手感，熟悉 PX4 韌體與 Pixhawk 硬體架構，並讓虛擬無人機在 SITL 中起飛、手動調 PID。
> 圖例：★ 必做 ／ ◇ 進階（時間有餘再做）。每日預設 3–5 小時。

---

## 🗓️ Week 1 · C++/Python 手感 + PX4 系統架構

**本週目標**：重建程式語言肌肉記憶，並能畫出 PX4 的 uORB 資料流與模組關係圖。

### 每日學習清單

#### Day 1 — C++ 記憶體與指標 ★
- 〔觀念〕stack vs heap、raw pointer、reference、`new/delete` 的坑（dangling / leak / double-free）。
- 〔觀念〕智慧指標：`unique_ptr`（所有權）、`shared_ptr`（引用計數）、`weak_ptr`（破循環）。
- 〔動手〕寫一個小程式：用 `unique_ptr` 管理一個 sensor 物件陣列，故意製造 leak 再用 `valgrind` / AddressSanitizer 抓出來。
- 〔資源〕cppreference smart pointers、learncpp.com 第 15–22 章。

#### Day 2 — C++ OOP 與現代特性 ★
- 〔觀念〕class/繼承/多型/虛函式、RAII、`const` 正確性、move semantics（`std::move`、右值引用）。
- 〔觀念〕`std::vector` / `std::array` / `std::map`、範圍 for、lambda、`auto`。
- 〔動手〕設計一個 `Controller` 基底類別 + `PIDController` 子類別（先純算法，下週接 PX4 概念）。
- 〔資源〕*A Tour of C++*（Stroustrup）精讀 ch.1–6。

#### Day 3 — C++ 多執行緒 ★
- 〔觀念〕`std::thread`、`mutex`、`lock_guard`、`condition_variable`、`atomic`；race condition / deadlock。
- 〔觀念〕為何飛控是多執行緒/多模組（感測讀取、估測、控制、通訊各跑各的）。
- 〔動手〕寫 producer-consumer：一條 thread 產生假 IMU 數據、一條 thread 消費並濾波，用 queue + mutex。
- 〔資源〕*C++ Concurrency in Action*（Williams）ch.2–4 重點。

#### Day 4 — Python 資料處理（NumPy）★
- 〔觀念〕ndarray、broadcasting、向量化（避免 for loop）、切片、`matplotlib` 畫圖。
- 〔動手〕用 NumPy 模擬一階系統階躍響應並畫圖（為下週 PID 鋪路）。
- 〔資源〕NumPy 官方 quickstart、SciPy 訊號處理簡介。

#### Day 5 — Python 非同步與工程實務 ★
- 〔觀念〕`asyncio`（event loop、`async/await`、`gather`）、為何 ROS2/通訊常用非同步。
- 〔觀念〕`venv`、type hints、`dataclass`、`logging`。
- 〔動手〕寫一個 async 腳本：同時「假裝」訂閱兩個感測 stream，印出合併後的時間序列。
- 〔資源〕Python 官方 asyncio 教學。

#### Day 6 — PX4 系統架構總覽 ★
- 〔觀念〕PX4 模組化架構：sensors → EKF2（狀態估測）→ 控制器（rate/attitude/position）→ 混控（mixer）→ 輸出。
- 〔觀念〕**uORB** 是核心 pub/sub 中介；理解 topic（如 `vehicle_attitude`、`sensor_combined`）。
- 〔動手〕在 SITL 用 `listener vehicle_attitude`、`uorb top` 觀察即時 topic 流量，**畫出一張資料流圖**。
- 〔資源〕[PX4 Architecture Overview](https://docs.px4.io/main/en/concept/architecture.html)、uORB messaging 章節。

> **Day 7**：休息 / 補進度 / 整理筆記。

### ✅ Week 1 檢查點（自我驗收）
- [ ] 能說清楚 `unique_ptr` vs `shared_ptr` 差別與各自使用時機
- [ ] 能解釋 race condition 並用 mutex 修好一個範例
- [ ] 能用 NumPy 向量化畫出一個系統的階躍響應
- [ ] 能畫出 PX4 從感測到輸出的資料流，並指出 uORB 在哪一層

### ⚠️ 常見坑
- 把 `shared_ptr` 到處傳造成循環引用 → 記憶體不釋放（用 `weak_ptr`）。
- NumPy 用 Python for loop 跑陣列 → 慢百倍（要向量化）。
- 以為 PX4 是單一大迴圈 → 它是多模組 + uORB 解耦。

### 📦 Week 1 交付物
- 一份 PX4 資料流手繪/數位圖 + 上述 4 個小程式（smart pointer、PID class、producer-consumer、async stream）。

---

## 🗓️ Week 2 · 飛行模式 + PID 級聯調參 + SITL 起飛

**本週目標**：理解飛行模式與級聯 PID，並在 SITL+Gazebo 讓無人機穩定起飛、實際動手調參觀察震盪/收斂。

### 每日學習清單

#### Day 1 — 飛行模式與狀態機 ★
- 〔觀念〕**Stabilize**（自穩，搖桿控姿態）、**Altitude**、**Position**（GPS 定點）、**Offboard**（外部電腦下指令，第 4 週重點）。
- 〔觀念〕arming / failsafe / mode switching 邏輯。
- 〔動手〕SITL 中切換模式：`commander mode manual/altctl/posctl`，觀察行為差異。
- 〔資源〕[PX4 Flight Modes](https://docs.px4.io/main/en/flight_modes/)。

#### Day 2 — 級聯控制架構 ★
- 〔觀念〕**Cascade control**：位置環 → 速度環 → 姿態環（attitude）→ 角速度環（rate），由外而內、頻率由低到高。
- 〔觀念〕每一環的輸入/輸出是什麼（位置誤差→期望速度→期望姿態→期望角速度→力矩）。
- 〔動手〕對照 PX4 原始碼模組 `mc_pos_control`、`mc_att_control`、`mc_rate_control` 找出對應關係。
- 〔資源〕[PX4 Controller Diagrams](https://docs.px4.io/main/en/flight_stack/controller_diagrams.html)。

#### Day 3 — PID 原理複習 ★
- 〔觀念〕P/I/D 各自作用：P=反應速度、I=消除穩態誤差、D=抑制震盪/超調；積分飽和（anti-windup）。
- 〔動手〕用 Week1 的 NumPy 模型，手動調 P/I/D 看階躍響應變化（rise time / overshoot / settling）。
- 〔資源〕Brian Douglas 控制系統 YouTube 系列（PID 直覺）。

#### Day 4 — PX4 關鍵參數 ★
- 〔觀念〕角速度環 `MC_ROLLRATE_P/I/D`、`MC_PITCHRATE_*`；姿態環 `MC_ROLL_P`、`MC_PITCH_P`、`MC_YAW_P`；位置/速度 `MPC_*`。
- 〔觀念〕調參順序：**先內環（rate）再外環（attitude/position）**，先 P 後 D 再 I。
- 〔動手〕在 QGroundControl 參數頁找到這些參數，記錄預設值。
- 〔資源〕[PX4 MC PID Tuning Guide](https://docs.px4.io/main/en/config_mc/pid_tuning_guide_multicopter.html)。

#### Day 5 — 實際調參實驗 ★
- 〔動手〕SITL + QGC：故意把 `MC_ROLLRATE_P` 調太大 → 觀察震盪；調太小 → 觀察反應遲鈍。記錄現象。
- 〔動手〕用 PX4 內建 log（`ulog`）或 QGC 的即時圖，看 rate setpoint vs actual 的追蹤誤差。
- 〔資源〕PID tuning guide 的「symptoms」對照表；Flight Review（logs.px4.io）。

#### Day 6 — 整合：穩定起飛任務 ★
- 〔動手〕用合理參數讓 x500 在 Gazebo 穩定起飛、懸停、降落，並錄一段畫面當交付物。
- 〔動手〕◇ 比較不同機型（`gz_x500` vs 其他 airframe）的調參差異。
- 〔資源〕[PX4 Gazebo Simulation](https://docs.px4.io/main/en/sim_gazebo_gz/)。

> **Day 7**：休息 / 整理 PID 調參筆記（症狀→參數 對照表）。

### ✅ Week 2 檢查點（自我驗收）
- [ ] 能解釋 4 種飛行模式差異與各自用途
- [ ] 能畫出位置→速度→姿態→角速度的級聯控制方塊圖
- [ ] 能說出 `MC_ROLL_P` 與 `MC_ROLLRATE_P` 分屬哪一環、調太大/太小的症狀
- [ ] **能在 SITL+Gazebo 讓無人機穩定起飛、懸停、降落**
- [ ] 完成一次「故意調壞→觀察震盪→調回」的實驗並記錄

### ⚠️ 常見坑
- 從外環（position）開始調 → 內環沒穩，整台震。**永遠先調 rate 內環**。
- D 太大 → 對雜訊敏感、高頻抖動；I 太大 → 慢速震盪 / overshoot。
- SITL 表現好 ≠ 實機好（無雜訊、無風、感測完美），別把 SITL 參數直接搬上實機。

### 📦 Week 2 交付物
- **SITL+Gazebo 起飛/懸停/降落錄影** + 一份「PID 症狀 ↔ 參數」對照筆記。

---

## 🚀 Phase 1 延伸（時間有餘 ◇）
- 讀 EKF2 狀態估測概念（為何需要感測融合）。
- 試 `pyulog` 解析飛行 log、用 Python 自己畫追蹤誤差曲線。
- 看一台真實 Pixhawk 的硬體框圖（FMU、IMU、氣壓計、GPS、PWM 輸出）。

➡️ 下一階段：[Phase 2 · ROS2 + Micro XRCE-DDS](02-phase2-ros2-comm.md)
