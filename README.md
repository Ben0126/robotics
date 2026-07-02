# 🚀 8 週 UAV / 具身智能 衝刺複習課程

> 目標：高效率找回 C++/Python、PX4/ROS2、AI 感知的手感，並接軌 2026 最新研究趨勢。
> 策略：**由底層往上層推進，以「模擬 / 專案」驅動複習** —— 每個階段都以一個可驗證的小成果收尾。

---

## 📌 如何使用本課程

1. **每週開始**：打開對應的 phase 檔（如 Week 1 → [01-phase1-control-sim.md](phases/01-phase1-control-sim.md)），看「本週目標」。
2. **每日執行**：照「每日學習清單 Day 1–6」做，每天分〔觀念複習〕〔動手任務〕〔資源連結〕三塊。
3. **打勾驗收**：完成後到 [progress-tracker.md](progress-tracker.md) 勾選里程碑與 checkpoint。
4. **卡關**：先看該週的「常見坑 & 除錯提示」，再查 [resources.md](resources.md)。
5. **環境**：動手前先讀 [00-environment-setup.md](phases/00-environment-setup.md) 把環境建好。

### 🛤️ 兩條路線（依設備選）
- **動手路線（預設）**：[01](phases/01-phase1-control-sim.md)–[04](phases/04-phase4-integration-papers.md)，以 SITL/模擬驅動，每週有可跑的交付物。
- **低設備閱讀路線**：[reading-track.md](reading-track.md) —— 設備受限時，改以**讀 paper、懂架構、通程式用法**為主，產出架構圖 / code-reading 筆記 / cheat-sheet，全程純讀可完成。

### ⏱️ 投入強度假設
本課程每日清單以 **每日 3–5 小時、每週 5–6 天（Day 7 留作休息/緩衝）** 的衝刺節奏設計。
- 時間較少 → 把每週拉長為 1.5–2 週，或只做「★ 必做」項、跳過「◇ 進階」項。
- 時間較多 → 把每週的「本週交付物」再延伸（每個 phase 檔末有延伸建議）。

---

## 🗺️ 8 週總覽

| 週次 | 階段 | 主題 | 核心交付物 |
|---|---|---|---|
| **W1** | Phase 1 | C++/Python 手感 + PX4 架構 | 開發環境就緒、能讀懂 uORB 資料流 |
| **W2** | Phase 1 | 飛行模式 + PID 級聯調參 + SITL | **SITL+Gazebo 虛擬無人機成功起飛、手動調 PID** |
| **W3** | Phase 2 | ROS2 核心 (Node/Topic/Service/Action/QoS) | 自寫 pub/sub 節點、看懂 DDS QoS |
| **W4** | Phase 2 | Micro XRCE-DDS + Offboard | **自寫節點送 `TrajectorySetpoint` 走定點/Z 字軌跡** |
| **W5** | Phase 3 | PyTorch + VLM/LLM 基礎 + 影像語義 | **把 ROS2 影像餵給 VLM，輸出障礙物/地標語義** |
| **W6** | Phase 3 | Diffusion Policy / 模仿學習 / RL 概念 | 端到端 視覺→動作 的觀念筆記 + 小實驗 |
| **W7** | Phase 4 | 端到端整合 Demo | **最小 Embodied UAV Demo：自然語言 → LLM → ROS2 → PX4** |
| **W8** | Phase 4 | 前沿論文研讀 + 收斂 | 一份論文研讀筆記 + 個人研究方向草稿 |

各週詳細內容：
- 📘 [Phase 1（W1–2）底層控制與模擬](phases/01-phase1-control-sim.md)
- 📗 [Phase 2（W3–4）ROS2 + Micro XRCE-DDS](phases/02-phase2-ros2-comm.md)
- 📙 [Phase 3（W5–6）AI 感知與具身智能](phases/03-phase3-ai-perception.md)
- 📕 [Phase 4（W7–8）系統整合與論文研讀](phases/04-phase4-integration-papers.md)

---

## 🧭 環境建議（一句話結論）

> **Windows 11 使用者：Week 1–4 用 WSL2 (Ubuntu 22.04 + ROS2 Humble) 最務實；Week 5–6 若要跑 Isaac Lab / RL 訓練，改用原生 Linux + NVIDIA GPU 或雲端 GPU。**

完整評估與逐步建置指令見 👉 [00-environment-setup.md](phases/00-environment-setup.md)。

---

## 📂 檔案結構

**根目錄（全局文件）**

| 檔案 | 內容 |
|---|---|
| [README.md](README.md) | 本檔：總覽、使用方式、8 週總覽表 |
| [reading-track.md](reading-track.md) | 低設備路線：讀 paper / 懂架構 / 通程式用法（純讀可完成） |
| [resources.md](resources.md) | 官方文件、課程、工具、必讀論文清單 |
| [papers-reading-list.md](papers-reading-list.md) | 標註版必讀論文清單（含難度、為何讀、各週閱讀排程） |
| [progress-tracker.md](progress-tracker.md) | 勾選式進度追蹤 |

**[phases/](phases/) — 課程大綱 & 環境設定**

| 檔案 | 內容 |
|---|---|
| [00-environment-setup.md](phases/00-environment-setup.md) | 環境選擇評估 + WSL2/Linux/Docker 建置指南 |
| [01-phase1-control-sim.md](phases/01-phase1-control-sim.md) | Week 1–2 底層控制與模擬 |
| [02-phase2-ros2-comm.md](phases/02-phase2-ros2-comm.md) | Week 3–4 ROS2 + Micro XRCE-DDS |
| [03-phase3-ai-perception.md](phases/03-phase3-ai-perception.md) | Week 5–6 VLM/LLM 感知、Diffusion Policy |
| [04-phase4-integration-papers.md](phases/04-phase4-integration-papers.md) | Week 7–8 端到端整合 + 論文研讀 |

**[m0-foundations/](m0-foundations/) — C++/Python 基礎**

| 檔案 | 內容 |
|---|---|
| [m0-cpp-python-foundations.md](m0-foundations/m0-cpp-python-foundations.md) | M0 前置（閱讀版）：C++/Python 手感，讀 code/對照表/分級小考 |
| [m0-cpp-python-walkthrough.md](m0-foundations/m0-cpp-python-walkthrough.md) | M0 完整版筆記：stack/heap、智慧指標、RAII、move、多執行緒、NumPy、asyncio |

**[m1-offboard-control/](m1-offboard-control/) — Module 1：Offboard 控制**

| 檔案 | 內容 |
|---|---|
| [m1-guided-reading.md](m1-offboard-control/m1-guided-reading.md) | M1 帶讀筆記：陪讀導讀（閱讀順序、停點自問、難點比喻、分級小考）|
| [m1-offboard-code-reading.md](m1-offboard-control/m1-offboard-code-reading.md) | M1 產出物①：`offboard_control` 逐段 code-reading 筆記 + 送定點 cheat-sheet |
| [m1-dataflow-diagram.md](m1-offboard-control/m1-dataflow-diagram.md) | M1 產出物②：ROS2 → DDS → PX4 → 馬達 資料流圖（Mermaid + ASCII）|
| [m1-offboard-walkthrough.md](m1-offboard-control/m1-offboard-walkthrough.md) | M1 完整版逐步說明 |

**[m2-cascade-control/](m2-cascade-control/) — Module 2：串級控制**

| 檔案 | 內容 |
|---|---|
| [m2-guided-reading.md](m2-cascade-control/m2-guided-reading.md) | M2 帶讀筆記：方塊圖陪讀導讀（閱讀順序、停點自問、難點比喻、分級小考）|
| [m2-cascade-control-diagram.md](m2-cascade-control/m2-cascade-control-diagram.md) | M2 產出物：位置→速度→姿態→角速度 級聯方塊圖 + 症狀↔參數對照表 |

**[m3-ai-perception/](m3-ai-perception/) — Module 3：AI 感知 / VLA**

| 檔案 | 內容 |
|---|---|
| [m3-guided-reading.md](m3-ai-perception/m3-guided-reading.md) | M3 帶讀筆記：陪讀導讀（閱讀順序、停點自問、難點比喻、分級小考）|
| [m3-ai-models-comparison.md](m3-ai-perception/m3-ai-models-comparison.md) | M3 產出物①：VLA/Diffusion/RL 5 點論文筆記 + 四典範對照表 |
| [m3-openvla-inference-cheatsheet.md](m3-ai-perception/m3-openvla-inference-cheatsheet.md) | M3 產出物②：OpenVLA「load 模型→跑一次推論」API cheat-sheet |
| [m3-perception-pipeline-diagram.md](m3-ai-perception/m3-perception-pipeline-diagram.md) | M3 產出物③：感知 pipeline 架構圖（相機影像→VLM→語義 JSON）|
| [m3-vla-survey-guided-reading.md](m3-ai-perception/m3-vla-survey-guided-reading.md) | VLA Survey 逐章帶讀（三軸分類、演進史、停點自問、分級小考）|
| [m3-rt2-guided-reading.md](m3-ai-perception/m3-rt2-guided-reading.md) | RT-2 論文帶讀 |
| [m3-openvla-guided-reading.md](m3-ai-perception/m3-openvla-guided-reading.md) | OpenVLA 論文帶讀 |
| [m3-diffusion-policy-guided-reading.md](m3-ai-perception/m3-diffusion-policy-guided-reading.md) | Diffusion Policy 論文帶讀 |
| [m3-swift-guided-reading.md](m3-ai-perception/m3-swift-guided-reading.md) | Swift 論文帶讀 |
| [m3-high-speed-flight-guided-reading.md](m3-ai-perception/m3-high-speed-flight-guided-reading.md) | Learning High-Speed Flight 論文帶讀 |
| [m3-sim-platforms-guided-reading.md](m3-ai-perception/m3-sim-platforms-guided-reading.md) | 模擬平台（OmniDrones / Aerial Gym）帶讀 |

**[m4-swarm-collision-avoidance/](m4-swarm-collision-avoidance/) — Module 4：多機群飛與避碰（延伸主題，非 8 週主線）**

> 20 台無人機群飛（1 主控 + 19 僚機）、僚機動態脫隊執行任務後自動歸隊、以及避碰穩定性的先備知識與論文清單。

| 檔案 | 內容 |
|---|---|
| [m4-swarm-guided-reading.md](m4-swarm-collision-avoidance/m4-swarm-guided-reading.md) | M4① 帶讀筆記：群飛/隊形控制基礎、Leader-Follower 架構選型、任務分配與脫隊歸隊 |
| [m4-collision-avoidance-diagnosis.md](m4-swarm-collision-avoidance/m4-collision-avoidance-diagnosis.md) | M4② 避碰演算法深度比較（APF/ORCA/BVC/DMPC/CBF/學習式）+ 現有模組不穩定的症狀診斷對照表 |
| [m4-ros2-swarm-tooling.md](m4-swarm-collision-avoidance/m4-ros2-swarm-tooling.md) | M4③ ROS2 群飛工具鏈（Crazyswarm2、PX4 multi-vehicle、DDS 擴展性、QoS） |
| [m4-papers-reading-list.md](m4-swarm-collision-avoidance/m4-papers-reading-list.md) | M4④ 產出物：群飛/避碰必讀論文清單（含難度、為何讀） |

**[m5-vla-gps-denied/](m5-vla-gps-denied/) — Module 5：單機 GPS-denied VLA 無人機（延伸主題 · 團隊技術報告）**

> 單機四相機（前/左/右/下）、無 GPS、以 VLA 自主搜索特定目標並避障的專案研究：訓練環境/資料集如何有效建構、用什麼取代 GPS 定位、GPS 失效如何在模擬中重現與驗證。三份業界導向技術報告（繁中正文＋英文摘要）＋論文清單。

| 檔案 | 內容 |
|---|---|
| [m5-vla-training-env-dataset.md](m5-vla-gps-denied/m5-vla-training-env-dataset.md) | M5① 技術報告：VLA 訓練環境與影像資料集建構（3DGS Real2Sim、模擬平台選型、Domain Randomization 與自動標註、資料集盤點）|
| [m5-gps-denied-localization.md](m5-vla-gps-denied/m5-gps-denied-localization.md) | M5② 技術報告：GPS-denied 定位與導航替代方案（GPS 三層拆解、VIO 選型、四相機構型、衛星圖匹配、機載算力）|
| [m5-gps-failure-sim-validation.md](m5-vla-gps-denied/m5-gps-failure-sim-validation.md) | M5③ 技術報告：GPS 失效的模擬與驗證方法（PX4 故障注入、VIO 漂移重現三法、驗證測試矩陣、failsafe 設計）|
| [m5-papers-reading-list.md](m5-vla-gps-denied/m5-papers-reading-list.md) | M5④ 產出物：VLA 訓練/GPS-denied 必讀論文與資源清單（含難度、為何讀）|

---

## 🔄 版本與時效性備註（2026-06）
本課程已對來源計畫做時效性修正：
- 大模型範例更新為當前世代：**Claude Opus 4.8 / Sonnet 4.6**、GPT-4o 級或更新的多模態 API。
- **ROS2 Iron 已 EOL（2024-11）** → 改用 **Humble (LTS, 支援到 2027-05)** 或 **Jazzy (LTS, 支援到 2029-05)**。
- 補上 **Micro XRCE-DDS Agent**、`px4_ros_com` / `px4_msgs`、**PX4 v1.15+** 等當前實作細節（已取代舊版 MAVROS 路線）。
