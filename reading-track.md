# 📖 低設備複習路線：讀 Paper · 懂架構 · 通程式用法（Reading-First Track）

> 適用：設備受限、暫時不跑 SITL/Isaac Lab，傾向**讀論文、理解系統架構、看懂程式怎麼用**。
> 原本的動手路線（[01](01-phase1-control-sim.md)–[04](04-phase4-integration-papers.md)）保留不動，等設備到位或用雲端 GPU 再接回。

## 核心原則：用「理解產出物」取代「跑出來的東西」
每個模組的驗收，不是「讓它動」，而是你**產出一個證明你懂了的東西**：
- 🗺️ **架構圖**（自己畫資料流 / 模組關係）
- 📝 **Code-reading 筆記**（逐段看懂一份真實 repo 的範例）
- 🔧 **API cheat-sheet**（「要做 X，呼叫哪幾個函式、傳什麼」）
- 📄 **論文 5 點筆記**（問題 / 方法 / 關鍵設計 / 結果 / 對我的啟發）

> 全程「純讀」即可：GitHub 線上看原始碼、官方 docs、arXiv。標 ☁️ 的是**無 GPU 可選輕量驗證**（API 呼叫或免費 Colab）。

---

## Module 1 · 飛控與中介層「架構與用法」（取代 Phase 1–2）

**讀什麼**
- PX4 架構與 uORB 概念頁、Controller Diagrams、MC PID Tuning Guide（[resources.md](resources.md)）。
- ROS2 概念：Nodes / Topics / Services / Actions / **DDS QoS**。
- **重點 code-reading**：`px4_ros_com` 的 `offboard_control` 範例（GitHub 線上看）。

**要看懂**
- 資料流：sensors → EKF2（狀態估測）→ rate/attitude/position 控制器 → mixer → 輸出；uORB 在哪一層。
- ROS2↔PX4 用 **uXRCE-DDS** 怎麼橋（`/fmu/out/*`、`/fmu/in/*`）、為何取代 MAVROS。
- Offboard 的**程式用法**：先以 ≥2Hz 送 `OffboardControlMode` + `TrajectorySetpoint`，再用 `VehicleCommand` 切模式 / arm——這個順序在範例程式碼裡長怎樣。

**理解產出物**
- 一張「指令從 ROS2 節點 → DDS → PX4 → 馬達」的資料流圖。
- `offboard_control` 範例的逐段 code-reading 筆記 + 一份「送一個定點要呼叫哪些 message / 欄位」cheat-sheet。

**☁️ 可選輕量**：CPU 跑 `rclpy` 的 talker/listener 玩具（純邏輯，無需真機/模擬器）。

> 📖 **帶讀**：兩份產出物的陪讀導讀（閱讀順序、停點自問、難點比喻、分級小考）見 [m1-guided-reading.md](m1-guided-reading.md)。

---

## Module 2 · 控制理論與 PID（純概念，取代 Phase 1 調參）

**讀什麼**：PX4 Controller Diagrams + PID Tuning Guide；Brian Douglas 控制系列影片。
**要看懂**：級聯控制（位置→速度→姿態→角速度）、P/I/D 各自作用、`MC_ROLL_P` vs `MC_ROLLRATE_P` 屬哪一環、調太大/太小的症狀。
**理解產出物**：級聯控制方塊圖 + 「症狀 ↔ 參數」對照表（不需實際調，理解因果即可）。

> 📖 **帶讀**：方塊圖與對照表的陪讀導讀（閱讀順序、停點自問、難點比喻、分級小考）見 [m2-guided-reading.md](m2-guided-reading.md)。

---

## Module 3 · AI 模型「架構與程式用法」（取代 Phase 3）

**讀什麼（論文）**：VLA Survey → RT-2 → OpenVLA → Diffusion Policy → Swift → Learning High-Speed Flight →（OmniDrones / Aerial Gym 文件）。連結見 [papers-reading-list.md](papers-reading-list.md)。

**要看懂（架構）**
- VLM 三段式：vision encoder → projector → LLM（LLaVA / OpenVLA）。
- **VLA**：把動作當成 text token，與網路知識共同訓練（RT-2）。
- **Diffusion Policy**：以條件去噪生成動作序列；receding horizon、visual conditioning。
- **Sim-to-Real RL**：Swift 用經驗噪聲模型、domain randomization 縮 gap 的「機制」。

**通程式用法（讀 repo，不必訓練）**
- OpenVLA repo：看「如何 **load 模型 + 跑一次 inference**」那幾行、輸入輸出長相、LoRA/量化選項。
- Diffusion Policy repo：看 policy 的輸入（觀測）/輸出（action chunk）介面結構。
- OmniDrones / Aerial Gym：看 task / config / reward 怎麼**寫**（理解「要客製一個任務改哪裡」）。

**理解產出物**
- 每篇 5 點筆記 + 一張「**傳統管線 vs VLA vs Diffusion Policy vs RL**」對照表（輸入/輸出/資料需求/即時性/優缺點）。
- 一份「OpenVLA 推論 API cheat-sheet」。

**☁️ 可選輕量（無 GPU）**
- 用 **Claude（Opus 4.8 / Sonnet 4.6）或 GPT 多模態 API** 對一張無人機視角圖做語義（純 API，要求 JSON 輸出）。
- 免費 **Colab GPU** 跑 CLIP / 小型 VLM / OpenVLA 的 **inference** demo（只推論、不訓練，免費額度就夠）。

> 📖 **帶讀**：三份 M3 產出物的陪讀導讀（閱讀順序、停點自問、難點比喻、分級小考）見 [m3-guided-reading.md](m3-guided-reading.md)。

---

## Module 4 · 前沿 Aerial VLN 與收斂（取代 Phase 4 論文段）

**讀什麼**：AerialVLN → CityNavAgent → OpenFly → UAV-VLN Survey 2026 + 你的文獻綜述 [Research_Report.docx](research_output/Research_Report.docx) 與 [synthesis note](research_output/knowledge_base/uav-embodied-ai-synthesis.md)。
**要看懂**：aerial VLN 問題定義、五類方法（seq2seq / 端到端 LLM-VLM / 階層 / 多代理 / 對話）、**七大未解問題**。
**理解產出物**：論文追蹤表（≥6 篇）+ 一頁研究方向草稿。
> synthesis note 裡的 starter project（把離散 aerial VLN 動作換成連續 `TrajectorySetpoint`）即使純讀也能設計成「方法提案」，等有設備或雲端 GPU 再做雛形。

---

## 建議節奏
純讀路線可比原 8 週鬆：每模組約 1.5–2 週，依你時間。順序仍是 **M1 架構 → M2 控制 → M3 AI 模型 → M4 前沿**（由底層往上）。
進度一樣回 [progress-tracker.md](progress-tracker.md) 勾「自我驗收 checkpoint」——把每條「你應該要能…」當口頭小考。

## 怎麼用我（Claude Code）跑這條路線
- **陪讀 repo**：「帶我逐段看 `px4_ros_com` 的 offboard 範例，解釋每段在幹嘛」。
- **解釋用法**：「OpenVLA 要跑一次推論，程式上要做哪些事？給我最小範例並解說」。
- **濃縮論文**：「把 RT-2 用 5 點講，並對照 OpenVLA 差在哪」。
- **做對照表 / cheat-sheet**：「幫我把 Diffusion Policy 跟 Swift 的輸入輸出做成表」。
- **出題驗收**：「用 Module 1 的 checkpoint 考我 uXRCE-DDS 橋接」。

## 何時切回動手路線
設備到位、或願意用雲端 GPU（RunPod / vast.ai / Lambda）/ 免費 Colab 時，回到 [01–04 動手路線](01-phase1-control-sim.md)，先補做各 Phase 的「本週交付物」。
