# ✅ 進度追蹤（Progress Tracker）

> 用法：完成一項就把 `[ ]` 改成 `[x]`。每週的「自我驗收 checkpoint」全勾才算過關，再進下一週。
> 對應詳細內容見各 phase 檔。開始日期：______ ／ 目標結束：______（約 8 週後）

---

## 🔧 環境就緒（開始前）
對應 [00-environment-setup.md](00-environment-setup.md) §5
- [ ] `ros2 doctor` / `ros2 topic list` 可執行
- [ ] `make px4_sitl gz_x500` 能編譯並開 Gazebo
- [ ] `commander takeoff` 能讓無人機起飛
- [ ] `MicroXRCEAgent udp4 -p 8888` 能啟動（Week 3 前）
- [ ] `~/ws_offboard` `colcon build` 成功（Week 3 前）

---

## 🧱 Module 0 — C++/Python 手感（閱讀路線前置）
對應 [m0-cpp-python-foundations.md](m0-cpp-python-foundations.md)（動手路線走 Phase 1 Week 1 者可略過此塊）
- [ ] 能說清 `unique_ptr`/`shared_ptr`/`weak_ptr` 差別與循環引用怎麼解
- [ ] 能在一段 code 上指出 leak/dangling/double-free 並用 RAII 修
- [ ] 能解釋飛控為何多執行緒，並圈出 producer-consumer 臨界區
- [ ] 能說出哪種 for 不能向量化，並寫出向量化 vs for 對照
- [ ] 能解釋 async 是單線協作式、誤用阻塞呼叫的後果

---

## 📘 Phase 1 — Week 1（C++/Python + PX4 架構）
里程碑
- [ ] Day1 smart pointer 練習　- [ ] Day2 PID class　- [ ] Day3 producer-consumer
- [ ] Day4 NumPy 階躍響應　- [ ] Day5 async stream　- [ ] Day6 uORB 資料流圖
自我驗收
- [ ] 能說清 `unique_ptr` vs `shared_ptr`
- [ ] 能用 mutex 修好 race condition 範例
- [ ] 能用 NumPy 向量化畫階躍響應
- [ ] 能畫 PX4 資料流並指出 uORB 位置
- [ ] 📦 交付物：資料流圖 + 4 個小程式

## 📘 Phase 1 — Week 2（飛行模式 + PID + SITL）
里程碑
- [ ] Day1 飛行模式切換　- [ ] Day2 級聯控制對照原始碼　- [ ] Day3 PID 直覺
- [ ] Day4 找到關鍵參數　- [ ] Day5 調壞→觀察震盪　- [ ] Day6 穩定起飛錄影
自我驗收
- [ ] 能解釋 4 種飛行模式
- [ ] 能畫位置→速度→姿態→角速度級聯圖
- [ ] 能說 `MC_ROLL_P` vs `MC_ROLLRATE_P` 與調壞症狀
- [ ] **SITL+Gazebo 穩定起飛/懸停/降落**
- [ ] 完成一次調壞→調回實驗
- [ ] 📦 交付物：起飛錄影 + PID 症狀對照筆記

---

## 📗 Phase 2 — Week 3（ROS2 核心）
里程碑
- [ ] Day1 建 workspace　- [ ] Day2 pub/sub　- [ ] Day3 service/action
- [ ] Day4 QoS 實驗　- [ ] Day5 rqt/bag　- [ ] Day6 launch/param
自我驗收
- [ ] 能說清 Topic/Service/Action 適用情境
- [ ] 跑通 Python pub/sub + service
- [ ] **能重現 QoS 不匹配並修好**
- [ ] 能用 rqt_graph / ros2 bag
- [ ] 📦 交付物：ROS2 package + 速查表

## 📗 Phase 2 — Week 4（uXRCE-DDS + Offboard）
里程碑
- [ ] Day1 三件套橋接通　- [ ] Day2 訂閱 PX4 狀態　- [ ] Day3 讀懂 Offboard 範例
- [ ] Day4 定點懸停　- [ ] Day5 Z 字/方形軌跡　- [ ] Day6 完整流程 + launch
自我驗收
- [ ] 能解釋 uXRCE-DDS 橋接（為何取代 MAVROS）
- [ ] 能用匹配 QoS 訂閱 PX4 位置/姿態
- [ ] 能說 Offboard 啟動順序
- [ ] **自寫節點定點懸停**
- [ ] **自寫節點走完 Z 字/方形並畫路徑圖**
- [ ] 📦 交付物：Offboard 軌跡節點 + 路徑圖

---

## 📙 Phase 3 — Week 5（PyTorch + VLM + 影像語義）
里程碑
- [ ] Day1 PyTorch 小模型　- [ ] Day2 CLIP zero-shot　- [ ] Day3 本地 VLM
- [ ] Day4 多模態 API（JSON）　- [ ] Day5 cv_bridge 影像　- [ ] Day6 影像→VLM→語義節點
自我驗收
- [ ] 能用 PyTorch 訓練小模型
- [ ] 能解釋 CLIP/VLM 架構
- [ ] 能取得結構化語義（JSON）
- [ ] 能用 cv_bridge 處理 ROS2 Image
- [ ] **完成 影像→VLM→語義 pipeline**
- [ ] 📦 交付物：感知節點 + pipeline 架構圖

## 📙 Phase 3 — Week 6（Diffusion/IL/RL 概念）
里程碑
- [ ] Day1 端到端動機　- [ ] Day2 BC 玩具範例　- [ ] Day3 Diffusion Policy demo
- [ ] Day4 PPO（SB3）　- [ ] Day5 Isaac Lab / sim-to-real　- [ ] Day6 對比筆記 + 選題
自我驗收
- [ ] 能對比傳統 vs 端到端
- [ ] 能解釋 BC vs Diffusion Policy
- [ ] 跑通一個 PPO 範例
- [ ] 能說 Isaac Lab + domain randomization
- [ ] **4 種方法對比筆記 + 選題方向**
- [ ] 📦 交付物：對比筆記 + RL/IL 訓練紀錄

---

## 📕 Phase 4 — Week 7（端到端整合 Demo）
里程碑
- [ ] Day1 介面/JSON schema　- [ ] Day2 LLM 規劃器　- [ ] Day3 ROS2 執行節點
- [ ] Day4 語義導航接入　- [ ] Day5 端到端聯調　- [ ] Day6 打磨 + 錄影
自我驗收
- [ ] 定義並驗證 LLM→ROS2 JSON 介面
- [ ] LLM 把自然語言轉成合法 waypoint
- [ ] ROS2 節點能驗證並執行（含 guardrail）
- [ ] **完整 Demo：自然語言→LLM→ROS2→PX4 飛到目標並拍照**
- [ ] 📦 交付物：Demo 影片 + bag + 架構說明

## 📕 Phase 4 — Week 8（論文研讀 + 收斂）
里程碑
- [ ] Day1 研讀方法 + 追蹤表　- [ ] Day2 主題A LLM/VLM　- [ ] Day3 主題B 端到端
- [ ] Day4 主題C Sim-to-Real　- [ ] Day5 實驗室發表精讀　- [ ] Day6 研究方向草稿
自我驗收
- [ ] 三大主題各精讀 ≥2 篇，填好追蹤表
- [ ] 能口頭講清三大趨勢差異
- [ ] 精讀目標實驗室 2–3 篇並定位貢獻
- [ ] **產出 1–2 頁個人研究方向草稿**
- [ ] 📦 交付物：論文追蹤表（≥6 篇）+ 研究方向草稿

---

## 🎓 結業盤點
- [ ] 可運作的 PX4 SITL + ROS2 環境
- [ ] PID 調參經驗與筆記
- [ ] ROS2 Offboard 軌跡節點
- [ ] 影像→VLM→語義 pipeline
- [ ] 4 種控制典範對比 + RL/IL demo
- [ ] 最小 Embodied UAV Demo
- [ ] 論文研讀筆記 + 研究方向草稿

➡️ 回到 [README](README.md)
