# 🛰️ M5② 技術報告 · GPS-denied 定位與導航替代方案

> 本報告對應團隊問題二的前半：「無 GPS 之下用什麼取代定位？VIO？VLM？還是其他方式？」。核心結論：**這不是單選題——GPS 其實同時提供三種服務，必須分層替代：度量狀態估計靠 VIO（＋下視光流保底），全域絕對定位靠影像對衛星圖匹配，語義找目標才是 VLM/VLA 的位置。**
> 本報告屬 M5 系列：上一份：[M5① VLA 訓練環境與資料集](m5-vla-training-env-dataset.md)｜下一份：[M5③ GPS 失效的模擬與驗證方法](m5-gps-failure-sim-validation.md)｜[M5④ 論文清單](m5-papers-reading-list.md)
> 相關舊筆記：[M1 Offboard 逐步走讀](../m1-offboard-control/m1-offboard-walkthrough.md)（EKF2 感測融合與飛行模式先備）、[M3 感知 pipeline 架構圖](../m3-ai-perception/m3-perception-pipeline-diagram.md)

---

## Executive Summary (English)

**Problem.** The team's single-UAV project (4 cameras: front/left/right/down) must search for targets and avoid obstacles *without GPS*. The open question — "VIO? VLM? something else?" — conflates three distinct services that GPS normally provides.

**Key findings.** (1) GPS should be decomposed into three layers: **L1 metric state estimation** (position/velocity feeding the flight controller's EKF), **L2 global localization** (absolute coordinates), and **L3 semantic navigation** (knowing where the target is). A VLM/VLA can only replace L3; if L1 is missing, the vehicle cannot even hold position. (2) For L1, **VIO (Visual-Inertial Odometry) is the industry-standard answer** — commercial GPS-denied platforms (ModalAI VOXL 2) run OpenVINS onboard; PX4 natively fuses external vision via EKF2. The team's 4-camera rig is an asset: multi-camera VIO (MAVIS, VINS-Multi) is markedly more robust to occlusion, low texture and aggressive rotation than monocular setups, and the downward camera doubles as a PX4-native optical-flow fallback. (3) For L2, cross-view geo-localization (matching onboard images against satellite maps) reached practical accuracy in 2024–25 (~tens of meters at 100 m altitude), sufficient to bound VIO drift outdoors without any infrastructure. UWB is an alternative only for pre-instrumented sites. (4) L3 is exactly what the VLA is being trained for (see report M5①) — but it must sit *on top of* a stable L1 estimate.

**Recommendation.** Architecture: OpenVINS-class multi-camera VIO on the companion computer → EKF2 external-vision fusion; downward optical flow + rangefinder as the degraded-mode fallback; periodic absolute fixes from satellite-map matching; VLA issues velocity/waypoint setpoints only. Onboard compute: Jetson Orin-class minimum; quantized VLM feasible onboard as of 2025–26 (Jetson Thor raises the ceiling to full VLA models).

**Roadmap.** Phase 1: single-camera OpenVINS + EKF2 integration in simulation. Phase 2: 4-camera VIO + fallback chain on the real airframe. Phase 3: satellite-matching absolute fixes + VLA integration. Validation methodology in report M5③.

---

## 0. 問題定義：GPS 到底提供了什麼——三層拆解

「用什麼取代 GPS」問錯了粒度。GPS 在無人機系統中同時扮演三種角色，替代方案各不相同：

```
┌─────────────────────────────────────────────────────────────┐
│ L3 語義導航層：「目標在哪裡？往哪邊找？」                        │
│    GPS 角色：把任務座標變成可導航的目標點                        │
│    替代者：VLM/VLA（語義搜索）、探索策略、離線地圖               │◄── VLM 只能取代這層
├─────────────────────────────────────────────────────────────┤
│ L2 全域定位層：「我在世界座標的哪裡？」                          │
│    GPS 角色：提供絕對座標，消除漂移                              │
│    替代者：影像↔衛星圖匹配（cross-view geo-localization）、      │
│           UWB 錨點（已知場地）、地形相對導航                     │
├─────────────────────────────────────────────────────────────┤
│ L1 度量狀態估計層：「我此刻的位置/速度/姿態？」（餵 EKF2 內環）    │
│    GPS 角色：位置/速度觀測，讓 EKF 收斂、讓 Position mode 可用   │
│    替代者：VIO（主力）、下視光流＋測距儀（保底）                  │◄── 沒有這層就不能穩定懸停
└─────────────────────────────────────────────────────────────┘
```

> **本報告最重要的一句話：VLM/VLA 無法取代 L1。** 端到端 VLA 推論頻率（幾 Hz）與延遲遠不足以支撐位置環（見 [M2 串級控制](../m2-cascade-control/m2-cascade-control-diagram.md)——位置環 50 Hz、姿態環 250 Hz、角速度環 1 kHz）。任何架構下，機上都必須有一個獨立、高頻、低延遲的狀態估計器。「VIO or VLM」的正確答案是 **VIO and VLM，各管一層**。

（EKF2 對各感測來源的融合機制先備知識，見 [M1 走讀 §感測融合](../m1-offboard-control/m1-offboard-walkthrough.md)。）

---

## 1. 第①層主力：VIO 系統比較

### 1.1 開源 VIO/VI-SLAM 現況（維護狀態以 GitHub API 查證於 2026-07-02）

| 系統 | 方法論 | 相機構型 | 維護狀態 | 授權 | 對接 PX4 |
|---|---|---|---|---|---|
| [OpenVINS](https://github.com/rpng/open_vins)（[docs](https://docs.openvins.com/)）| MSCKF 濾波式 | 單目/雙目/**多相機** | ✅ 活躍（push 2025-11）| GPL-3.0 | 社群橋接成熟；**VOXL 2 商用採用**（§1.3）|
| [VINS-Fusion](https://github.com/HKUST-Aerial-Robotics/VINS-Fusion) | 優化式滑動視窗 | 單目+IMU/雙目 | ⚠️ 休眠（push 2024-05，主要開發止於 2019–2021）| GPL-3.0 | 教學資源最多 |
| [ORB-SLAM3](https://github.com/UZ-SLAMLab/ORB_SLAM3) | 特徵式完整 SLAM（含回環）| 單目/雙目/RGB-D＋IMU | ⚠️ 休眠（push 2024-07）| GPL-3.0 | EuRoC 精度標竿（雙目慣性 ATE ~3.5 cm 級，[arXiv:2007.11898](https://arxiv.org/abs/2007.11898)）但 CPU 重、非為嵌入式設計 |
| [OpenMAVIS](https://github.com/MAVIS-SLAM/OpenMAVIS)（MAVIS，[ICRA 2024](https://doi.org/10.1109/icra57147.2024.10609982)·[arXiv:2309.08142](https://arxiv.org/abs/2309.08142)）| 優化式多相機 VI-SLAM | **多相機（部分重疊）** | 研究碼 | 見 repo | Hilti SLAM Challenge 2023 視覺-IMU 全賽道冠軍（分數為第二名 1.7 倍）|
| VINS-Multi（[arXiv:2405.14539](https://arxiv.org/abs/2405.14539)，HKUST）| 優化式、**非同步多相機** | 多相機（免硬體同步）| 研究碼 | — | 已在四旋翼實機驗證 |

選型觀察：
- **工程可靠性優先選 OpenVINS**：濾波式計算量可控、原生多相機支援、文件完整、仍在維護、且已被商用產品（VOXL）驗證過量產可行性。
- ORB-SLAM3 適合當**精度上限參考**與離線評測基線，不適合直接上機。
- GPL-3.0 授權對「業界產品」是實務議題：三大主流全是 GPL——若最終產品不能開源，需及早規劃（自研、商業授權洽談、或把 VIO 隔離成獨立行程以釐清衍生作品邊界，後者需法務確認）。

### 1.2 四相機構型的機會：Multi-camera VIO

團隊的前/左/右/下四相機不是負擔，是**強化 VIO 穩健性的機會**：

- **失效模式互補**：單目 VIO 最怕低紋理（白牆、水面）、快速旋轉、逆光。四個朝向不同的相機同時全部失效的機率遠低於單相機——MAVIS 在 Hilti 挑戰賽的壓倒性成績正來自廣視野多相機＋改良 IMU 預積分（SE₂(3)）對快速旋轉的強健性。
- **免硬體同步的路線**：多數消費級相機沒有同步觸發。VINS-Multi 專門處理**非同步**多相機輸入（平行前端＋動態特徵配額），對成本敏感的產品構型友善。
- **務實起步**：OpenVINS 原生支援多相機配置，可先「前視雙相機（若有重疊）＋下視」三路餵入，左右側視先只做避障/目標偵測，逐步擴充。

### 1.3 商用先例：ModalAI VOXL 2（產品化的參考座標）

[VOXL 2](https://www.modalai.com/products/voxl-2)（16 g，Qualcomm QRB5165，15 TOPS，整合 PX4 飛控）是「GPS-denied 導航」商品化的代表：[官方技術部落格](https://www.modalai.com/blogs/blog/beyond-gps-how-voxl-uses-vio-to-power-autonomous-drones)明確說明其 VIO 以 **OpenVINS** 為核心，配專用 VIO server 做起飛邏輯與失效偵測，另建 VIO benchmark 工作流（[飛行文件](https://docs.modalai.com/flying-with-vio/)）。其 [Starling 2 Max](https://www.modalai.com/products/starling-2-max) 開發機直接以「長程視覺航位推算（dead reckoning）」為賣點。
對團隊的意義：(1) 證明 OpenVINS 路線可以做成產品；(2) 其「VIO server＋健康監控＋PX4 整合」的系統切分值得模仿；(3) 若想買現成參考平台做對照組，這是首選。（註：曾經流行的 Intel RealSense T265 追蹤相機已停產，不要規劃進新設計。）

### 1.4 與 PX4 的對接（官方機制，查證於 [PX4 external position estimation 文件](https://docs.px4.io/main/en/ros/external_position_estimation.html)）

- VIO 位姿以 MAVLink `ODOMETRY` 訊息（或 ROS2 `VehicleVisualOdometry` topic）送入，EKF2 訂閱 `vehicle_visual_odometry` 融合。
- 訊息頻率需 **30–50 Hz** 以上，否則 EKF2 拒絕融合。
- EKF2 是 PX4 預設估計器；external vision 可融合位置、姿態、線速度。
- 融合開關與權重由 `EKF2_EV_CTRL` 等參數控制（參數細節依 PX4 版本查 [參數參考](https://docs.px4.io/main/en/advanced_config/parameter_reference.html)；本專案基準版本 PX4 v1.16.2）。

### 1.5 最低保底：下視光流＋測距儀（PX4 原生）

四相機中的**下視相機**天然對應 PX4 的光流方案（[官方文件](https://docs.px4.io/main/en/sensor/optical_flow.html)）：下視相機＋下視測距儀（雷射優先）即可做無 GNSS 的速度估計，支撐 Position/Hold 模式。現成模組如 ARK Flow、Holybro H-Flow；PX4 的光流演算法庫 [PX4-OpticalFlow](https://github.com/PX4/PX4-OpticalFlow) 仍活躍維護（push 2026-06）。
定位：這不是主定位方案（只有速度、會漂），而是 **VIO 失效時的降級模式**——在 fallback 鏈（§6）中排第二位。

---

## 2. 第②層：無 GPS 的絕對定位

VIO 是相對定位，**必然漂移**（誤差隨距離累積，典型 0.5–2% of distance；漂移建模見 [M5③](m5-gps-failure-sim-validation.md)）。長航程任務需要一個「絕對座標來源」定期歸零漂移。無 GPS 時的選項：

| 方案 | 原理 | 精度量級 | 基礎設施需求 | 成熟度（截至 2026-07）|
|---|---|---|---|---|
| **影像↔衛星圖匹配**（cross-view geo-localization）| 機載下視/斜視影像對預載衛星圖做檢索＋匹配 | 數十公尺級（例：[CLIP 式匹配於 100 m 高度誤差 39.2 m / 15.9°](https://doi.org/10.1016/j.rineng.2025.108132)，2025）| ❌ 只需離線衛星圖 | 研究→早期落地；2024–25 大量新方法（語義+結構層級匹配 [arXiv:2506.09748](https://arxiv.org/abs/2506.09748)、環形分割匹配 [Remote Sens. 2025](https://www.mdpi.com/2072-4292/17/14/2448)）；綜述見 [Avola et al., IEEE Access 2024](https://doi.org/10.1109/ACCESS.2024.3455096) 與 [Couturier & Akhloufi, RAS 2020](https://doi.org/10.1016/j.robot.2020.103666) |
| **UWB 錨點** | 超寬頻測距三邊定位 | 10–30 cm | ✅ 需預先布設錨點 | 成熟；適合固定場域（倉庫、廠區）；與 VIO 融合先例如 [UWB+VIO 室內導航](https://doi.org/10.1016/j.measurement.2022.112256) |
| **地形相對導航**（terrain-relative）| 測高剖面/地貌對 DEM 匹配 | 場景依賴 | ❌ 需離線 DEM | 航太領域成熟（火星降落），民用無人機少見 |
| **在預建 3DGS 地圖內定位**（Splat-Loc）| RGB 影像對已重建 splat 場景做位姿估計 | 公分–分米級（場景內）| ⚠️ 需先重建場景 | 研究（[Splat-Nav, T-RO 2025](https://arxiv.org/abs/2403.02751)，~25 Hz）；與 [M5①](m5-vla-training-env-dataset.md) 的 3DGS 管線**一魚兩吃** |

**建議**：戶外開放場景以「衛星圖匹配」為絕對定位主力（無基礎設施、與 VLM 技術棧同源）；已知固定場域（例如反覆巡檢同一廠區）可加 UWB 或預建 3DGS 地圖用 Splat-Loc。三者都以「低頻絕對修正」姿態融合進 EKF2/後端圖優化，不取代 VIO。

---

## 3. 第③層：VLM/VLA 的正確位置

- **VLA 負責的是「找目標」的語義決策**：看到影像→理解「目標可能在建築物後方」→輸出探索/接近動作。這正是 [M5①](m5-vla-training-env-dataset.md) 資料集訓練的能力（aerial VLN/VLA：OpenFly、AerialVLA 等）。
- **VLM 不做狀態估計**，但可以間接輔助 L2：GRAD-NAV++（[RA-L 2026](https://doi.org/10.1109/LRA.2025.3643290)）示範 VLM 引導＋高斯輻射場的導航；VLM 語義地標（「加油站在我左前方」）對衛星圖匹配的檢索階段有加成——這是研究機會，不是今天的依賴項。
- **架構鐵律**：VLA 輸出只到 setpoint 層（速度/航點指令，經 [M1 Offboard](../m1-offboard-control/m1-offboard-walkthrough.md) 介面），內環穩定永遠由 PX4＋L1 估計負責。即使未來換端到端 VLA 直接出低階指令（如 SOUS VIDE 的 body-rate 輸出），底下仍需要高度/速度/姿態的可靠估計餵給 policy 本身。

---

## 4. 機載算力盤點（截至 2026-07）

| 平台 | 算力 | 記憶體 | 功耗 | 定位 |
|---|---|---|---|---|
| Jetson Orin Nano / NX | 20–100 TOPS (INT8) | 4–16 GB | 7–25 W | **本專案基準**：SOUS VIDE 已示範 policy 在 Orin Nano 20 Hz 推論；VIO＋偵測器＋輕量 policy 的甜蜜點 |
| Jetson AGX Orin | ~275 TOPS | 32–64 GB | 15–60 W | 四相機 VIO＋量化 VLM 同機的安全選擇 |
| [Jetson Thor（T5000/T4000）](https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-thor/)（[2025-08 GA](https://developer.nvidia.com/blog/introducing-nvidia-jetson-thor-the-ultimate-platform-for-physical-ai/)）| 2070 / 1200 TFLOPS (FP4 sparse) | 128 / 64 GB | 40–130 W | 官方明示支援 **VLA 模型**機上推論；7.5× AGX Orin。但重量/功耗適合中大型機架，小型四旋翼短期仍以 Orin 為主 |
| VOXL 2（QRB5165）| 15 TOPS NPU | 8 GB | 數 W | 16 g 極輕量一體機（飛控＋VIO＋NPU），偵測用 TFLite 級模型 |

分工建議：**飛控（PX4）管穩定與 failsafe；伴飛電腦管 VIO、偵測、VLA**。VIO 佔用估計：OpenVINS 多相機約 2–4 個 CPU 核心（解析度/特徵數依機上實測調），與 VLA 推論（GPU/NPU）資源天然分離，同機可行。量化後 3B–7B 級 VLM 在 Orin 上可跑但幀率有限（秒級/次），符合「L3 低頻決策」的角色定位。

---

## 5. 失效模式與工業級冗餘

### 5.1 VIO 失效情境（設計驗證矩陣時的必測項，對應 [M5③ §5](m5-gps-failure-sim-validation.md)）

| 情境 | 機制 | 緩解 |
|---|---|---|
| 低紋理（水面、雪地、白牆）| 特徵不足 → 追蹤丟失 | 多相機互補；特徵數健康監控 |
| 快速旋轉/激烈機動 | 特徵流出視野、運動模糊 | 廣視野多相機（MAVIS 的強項）；IMU 預積分品質 |
| 光照劇變（出入陰影、逆光）| 曝光跳變 → 特徵斷裂 | 相機自動曝光調校；多相機不同朝向曝光互補 |
| 震動 | IMU 噪聲放大、rolling shutter 變形 | 減震安裝、相機-IMU 精確標定（時間同步優先）|
| 尺度漂移（單目）| 觀測不可觀 | IMU 融合＋多相機基線 |

### 5.2 Fallback 鏈（每一級都要在 M5③ 的測試矩陣中驗證）

```
正常：多相機 VIO → EKF2（Position mode，VLA 全功能）
  │ VIO 健康度惡化（特徵數/協方差/創新值超閾）
  ▼
降級 1：下視光流＋測距儀（Position/Hold 維持，任務暫停，原地或緩速）
  │ 光流也失效（高度過高/地面無紋理）
  ▼
降級 2：Altitude mode（僅氣壓/測距定高，操作員接管或執行預定義安全行為)
  │ 通訊也喪失
  ▼
最終：受控降落（PX4 failsafe，見 M5③ §6）
```

健康監控的觸發訊號（VIO 端）：追蹤特徵數、估計協方差、影像亮度統計、IMU 飽和；（EKF2 端）：innovation test ratio、`estimator_status` 旗標。VOXL 的「VIO server 含失效偵測」即此思路的產品化實作。

---

## 6. 建議架構與導入路線圖

### 6.1 建議技術棧

```
              ┌──────────────  伴飛電腦（Jetson Orin NX/AGX）──────────────┐
四相機 ──┬──► │ OpenVINS 多相機 VIO ──► MAVLink ODOMETRY（≥30 Hz）──► PX4 EKF2 │
         │    │ 衛星圖匹配（低頻絕對修正，戶外）                             │
         │    │ 目標偵測（Grounded-SAM 蒸餾的輕量模型）                      │
         └──► │ VLA/VLM（L3 語義決策，輸出 velocity/waypoint setpoint）      │
下視測距儀 ──►│（獨立通道）PX4 光流融合（降級模式）                          │
              └──────────────────────────────────────────────────────────┘
```

### 6.2 路線圖

| 階段 | 內容 | 驗收 |
|---|---|---|
| P1（模擬）| 單/雙相機 OpenVINS → EKF2 external vision 整合，於 [M5① 選定的模擬器](m5-vla-training-env-dataset.md)跑通；建立 ATE/漂移率基線 | 模擬中無 GPS 懸停與航線飛行穩定；指標見 M5③ §4 |
| P2（實機）| 四相機 rig 標定（相機-IMU 時間同步優先）；多相機 VIO 上機；光流降級鏈實測 | 實機無 GPS 位置模式；VIO 漂移 <1.5% of distance；fallback 鏈演練通過 |
| P3（整合）| 衛星圖匹配絕對修正；VLA setpoint 介面接入；長航程任務演示 | 端到端無 GPS 目標搜索任務成功 |

---

## 7. 風險與開放問題

| 風險 | 影響 | 緩解 |
|---|---|---|
| 主流開源 VIO 均為 GPL-3.0 | 產品閉源受限 | 及早法務評估；行程隔離架構；預算商業授權或自研替代 |
| 四相機標定/同步工程量被低估 | VIO 精度直接受害 | P2 預留專門人力；優先硬體觸發同步，否則採 VINS-Multi 式非同步設計 |
| 衛星圖匹配在植被/重複紋理區失效 | 絕對修正不可用 | 該區段退回純 VIO＋提高回航保守度；混合語義地標匹配（研究項）|
| 算力預算與 VLA 模型大小衝突 | 幀率不足 | 量化/蒸餾（M5① 的資料工廠支援小模型訓練）；Thor 級硬體留為升級路徑 |
| VIO 漂移統計缺乏本機資料 | 驗證與模擬參數失真 | P2 起持續記錄飛行 log，建立自家漂移分布（供 M5③ 漂移注入用）|

開放問題：(1) 側視相機是否參與 VIO（增加穩健性）或專職偵測（省算力）——P2 實測決定；(2) 衛星圖匹配的圖資更新頻率與變化容忍度（季節/施工）需field test。

---

## 8. 參考文獻

| # | 來源 | 型態 | 連結 | 查證日期 |
|---|---|---|---|---|
| 1 | Geneva et al., *OpenVINS: A Research Platform for Visual-Inertial Estimation*, ICRA 2020 | 論文＋代碼 | [DOI:10.1109/ICRA40945.2020.9196524](https://doi.org/10.1109/ICRA40945.2020.9196524) · [GitHub](https://github.com/rpng/open_vins)（push 2025-11）· [docs](https://docs.openvins.com/) | 2026-07 |
| 2 | Campos et al., *ORB-SLAM3*, IEEE T-RO 2021 | 論文＋代碼 | [arXiv:2007.11898](https://arxiv.org/abs/2007.11898) · [GitHub](https://github.com/UZ-SLAMLab/ORB_SLAM3)（push 2024-07，休眠）| 2026-07 |
| 3 | Qin et al., VINS-Fusion | 代碼 | [GitHub](https://github.com/HKUST-Aerial-Robotics/VINS-Fusion)（push 2024-05，休眠）| 2026-07 |
| 4 | Wang et al., *MAVIS: Multi-Camera Augmented Visual-Inertial SLAM using SE₂(3) Based Exact IMU Pre-integration*, ICRA 2024 | 論文＋代碼 | [DOI:10.1109/ICRA57147.2024.10609982](https://doi.org/10.1109/icra57147.2024.10609982) · [arXiv:2309.08142](https://arxiv.org/abs/2309.08142) · [OpenMAVIS](https://github.com/MAVIS-SLAM/OpenMAVIS) | 2026-07 |
| 5 | *VINS-Multi: A Robust Asynchronous Multi-camera-IMU State Estimator*, 2024 | 論文 | [arXiv:2405.14539](https://arxiv.org/abs/2405.14539) | 2026-07 |
| 6 | ModalAI，*Beyond GPS: How VOXL Uses VIO*（2025-08）＋ VOXL 2 產品頁＋VIO 飛行文件 | 商用案例 | [部落格](https://www.modalai.com/blogs/blog/beyond-gps-how-voxl-uses-vio-to-power-autonomous-drones) · [VOXL 2](https://www.modalai.com/products/voxl-2) · [docs](https://docs.modalai.com/flying-with-vio/) | 2026-07 |
| 7 | PX4 官方文件：External Position Estimation（EKF2 external vision）/ Optical Flow / 參數參考（基準版本 v1.16.2）| 官方文件 | [external vision](https://docs.px4.io/main/en/ros/external_position_estimation.html) · [optical flow](https://docs.px4.io/main/en/sensor/optical_flow.html) · [PX4-OpticalFlow repo](https://github.com/PX4/PX4-OpticalFlow) | 2026-07 |
| 8 | Lin & Chen, *GNSS-denied UAV localization with satellite and aerial image matching*, Results in Engineering, 2025 | 論文 | [DOI:10.1016/j.rineng.2025.108132](https://doi.org/10.1016/j.rineng.2025.108132) | 2026-07 |
| 9 | Avola et al., *UAV Geo-Localization for Navigation: A Survey*, IEEE Access 12, 2024 | 綜述 | [DOI:10.1109/ACCESS.2024.3455096](https://doi.org/10.1109/ACCESS.2024.3455096) | 2026-07 |
| 10 | Couturier & Akhloufi, *A review on absolute visual localization for UAV*, RAS 135, 2020 | 綜述 | [DOI:10.1016/j.robot.2020.103666](https://doi.org/10.1016/j.robot.2020.103666) | 穩定知識 |
| 11 | Zhang et al., *Hierarchical Image Matching for UAV Absolute Visual Localization*, 2025 | 論文 | [arXiv:2506.09748](https://arxiv.org/abs/2506.09748) | 2026-07 |
| 12 | *UAV-Satellite Cross-View Image Matching Based on Adaptive Threshold-Guided Ring Partitioning*, Remote Sensing 17(14), 2025 | 論文 | [MDPI](https://www.mdpi.com/2072-4292/17/14/2448) | 2026-07 |
| 13 | Lin & Zhan, *GNSS-denied UAV indoor navigation with UWB incorporated VIO*, Measurement 206, 2022 | 論文 | [DOI:10.1016/j.measurement.2022.112256](https://doi.org/10.1016/j.measurement.2022.112256) | 穩定知識 |
| 14 | Chen et al., *Splat-Nav*（Splat-Loc 模組）, T-RO 2025 | 論文 | [arXiv:2403.02751](https://arxiv.org/abs/2403.02751) | 2026-07 |
| 15 | NVIDIA Jetson Thor（2025-08-25 GA）產品頁＋技術部落格 | 官方文件 | [產品頁](https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-thor/) · [blog](https://developer.nvidia.com/blog/introducing-nvidia-jetson-thor-the-ultimate-platform-for-physical-ai/) | 2026-07 |
| 16 | Chen Q. et al., *GRAD-NAV++*, IEEE RA-L 2026 | 論文 | [DOI:10.1109/LRA.2025.3643290](https://doi.org/10.1109/LRA.2025.3643290) | 2026-07 |
| 17 | Low et al., *SOUS VIDE*（Orin Nano 上 20 Hz 端到端 policy 的實例）, RA-L 2025 | 論文 | [arXiv:2412.16346](https://arxiv.org/abs/2412.16346) | 2026-07 |

---

➡️ 回到 [README](../README.md)｜上一份：[M5① VLA 訓練環境與資料集](m5-vla-training-env-dataset.md)｜下一份：[M5③ GPS 失效的模擬與驗證方法](m5-gps-failure-sim-validation.md)
