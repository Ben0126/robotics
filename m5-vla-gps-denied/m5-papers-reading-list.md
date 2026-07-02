# 📑 M5④ VLA 訓練環境 / GPS-denied 必讀論文與資源清單（Annotated Reading List）

> 格式與根目錄 [papers-reading-list.md](../papers-reading-list.md) 及 [M4④](../m4-swarm-collision-avoidance/m4-papers-reading-list.md) 一致：每篇標註**難度**與**為何讀**。
> 難度：🟢 入門概念 ／ 🟡 方法細節 ／ 🔴 進階/重現級。
> 所有連結皆已於 2026-07 透過網路搜尋／GitHub API／Scopus 逐篇查證（arXiv ID / DOI / repo 活躍度）；少數僅查得會議記錄而未逐字核對全文者，已以 ⚠️ 標明。
> 本清單由三份報告的參考文獻彙整：[M5①](m5-vla-training-env-dataset.md)｜[M5②](m5-gps-denied-localization.md)｜[M5③](m5-gps-failure-sim-validation.md)

---

## A · VLA 訓練環境與資料集（對應 [M5①](m5-vla-training-env-dataset.md)）

| 論文/資源 | 出處 | 難度 | 為何讀 |
|---|---|---|---|
| **3D Gaussian Splatting for Real-Time Radiance Field Rendering** — Kerbl, Kopanas, Leimkühler, Drettakis | ACM TOG 42(4), SIGGRAPH 2023 · [DOI:10.1145/3592433](https://doi.org/10.1145/3592433) | 🟡 | 3DGS 原始論文。整個 M5① 路線的技術地基，至少要懂「高斯點雲＋可微光柵化＝即時 photoreal 渲染」這件事為什麼成立。 |
| **SOUS VIDE: Cooking Visual Drone Navigation Policies in a Gaussian Splatting Vacuum** — Low, Adang, Yu, Nagami, Schwager | IEEE RA-L 2025 · [DOI:10.1109/LRA.2025.3553785](https://doi.org/10.1109/lra.2025.3553785) · [arXiv:2412.16346](https://arxiv.org/abs/2412.16346) · [GitHub](https://github.com/StanfordMSL/SousVide) | 🔴 | **團隊最該精讀的一篇**：在 3DGS 內用特權 MPC 自動生成 10–30 萬筆訓練對、蒸餾出零樣本上實機的視覺 policy（Orin Nano、20 Hz）。就是「訓練環境問題」的完整解答範本。 |
| **Splat-Nav: Safe Real-Time Robot Navigation in Gaussian Splatting Maps** — Chen et al. | IEEE T-RO 2025 · [arXiv:2403.02751](https://arxiv.org/abs/2403.02751) · [GitHub](https://github.com/chengine/splatnav) | 🟡 | GSplat 地圖內的安全走廊規劃＋純 RGB 定位（Splat-Loc）。讀它理解 3DGS 的碰撞幾何怎麼處理，Splat-Loc 對 M5② 的 L2 層也有用。 |
| **GRAD-NAV++: VLM Enabled Visual Drone Navigation with Gaussian Radiance Fields and Differentiable Dynamics** — Chen Q. et al. | IEEE RA-L 2026 · [DOI:10.1109/LRA.2025.3643290](https://doi.org/10.1109/LRA.2025.3643290) | 🔴 | 3DGS 環境＋VLM＋可微動力學合流的最新代表，看「語言模型進訓練迴圈」的做法。 |
| **OpenFly: A Comprehensive Platform for Aerial VLN** — Gao et al. | 2025 · [arXiv:2502.18041](https://arxiv.org/abs/2502.18041) · [專案頁](https://shailab-ipec.github.io/openfly/) | 🟡 | 迄今最大 aerial VLN 資料集（10 萬軌跡/18 場景），四渲染引擎含 3DGS real-to-sim。**其自動化資料工具鏈（點雲→語義→軌跡→指令）就是團隊資料工廠的參考設計。** |
| **CityNav: A Large-Scale Dataset for Real-World Aerial Navigation** — Lee et al. | ICCV 2025 · [arXiv:2406.14240](https://arxiv.org/abs/2406.14240) · [GitHub](https://github.com/water-cookie/citynav) | 🟢 | 32,637 條真實城市（Cambridge/Birmingham）人類示範軌跡；「真實掃描＋人類示範」是評測泛化的稀缺資源。 |
| **AerialVLA: A VLA Model for Aerial Navigation with Online Dialogue** — Chen J. et al. | AAAI 2026 · [DOI:10.1609/aaai.v40i22.38878](https://doi.org/10.1609/aaai.v40i22.38878) | 🟡 | 首批明確以「VLA」定位的空中導航模型之一，看題目從 VLN→VLA 的演進與動作空間設計。 |
| Comparative Analysis of NVS and Photogrammetry for 3D Forest Stand Reconstruction — Tian et al. | Remote Sensing 17(9):1520, 2025 · [DOI:10.3390/rs17091520](https://doi.org/10.3390/rs17091520) | 🟢 | 「樹枝/草地建不好」痛點的實證對照：攝影測量在複雜林分的失敗模式 vs NeRF/3DGS 的表現，選路線前先讀。 |
| **Domain Randomization for Transferring DNNs from Simulation to the Real World** — Tobin et al. | IROS 2017 · [arXiv:1703.06907](https://arxiv.org/abs/1703.06907) | 🟢 | DR 原始論文：為什麼「大量隨機化」能部分替代「完美建模」。一小時讀完，觀念終身受用。 |
| Grounded SAM 2 / Autodistill（自動標註工具鏈）| [IDEA-Research repo](https://github.com/IDEA-Research/Grounded-SAM-2) · [Autodistill](https://github.com/autodistill/autodistill-grounded-sam-2) · [教學](https://blog.roboflow.com/label-data-with-grounded-sam-2/) | 🟢 | 不是論文是工具：文字 prompt → 偵測框（Grounding DINO/Florence-2）→ 分割遮罩（SAM 2），一行指令標整個資料夾。 |
| Isaac Sim 6.0.1 · NuRec 神經渲染 ＋ 3DGRUT | [Release Notes](https://docs.isaacsim.omniverse.nvidia.com/6.0.1/overview/release_notes.html) · [NuRec](https://docs.isaacsim.omniverse.nvidia.com/6.0.1/assets/usd_assets_nurec.html) · [3DGRUT](https://github.com/nv-tlabs/3dgrut) | 🟡 | 官方文件：實景 splat 匯入物理模擬器的正規路徑（3DGRUT 訓練→USD ParticleField→RTX 原生渲染）。 |

---

## B · GPS-denied 定位（對應 [M5②](m5-gps-denied-localization.md)）

| 論文/資源 | 出處 | 難度 | 為何讀 |
|---|---|---|---|
| **OpenVINS: A Research Platform for Visual-Inertial Estimation** — Geneva, Eckenhoff, Lee, Yang, Huang | ICRA 2020 · [DOI:10.1109/ICRA40945.2020.9196524](https://doi.org/10.1109/ICRA40945.2020.9196524) · [GitHub](https://github.com/rpng/open_vins) | 🟡 | 建議主力 VIO：MSCKF 濾波式、原生多相機、仍活躍維護、且被 VOXL 2 商用驗證。docs.openvins.com 的教學同時是最好的 VIO 入門教材。 |
| **ORB-SLAM3** — Campos et al. | IEEE T-RO 2021 · [arXiv:2007.11898](https://arxiv.org/abs/2007.11898) | 🔴 | 精度標竿（EuRoC 雙目慣性公分級）。上機不選它，但評測基線與「完整 SLAM vs 里程計」的觀念對照必讀。 |
| **MAVIS: Multi-Camera Augmented Visual-Inertial SLAM using SE₂(3) Exact IMU Pre-integration** — Wang et al. | ICRA 2024 · [DOI:10.1109/ICRA57147.2024.10609982](https://doi.org/10.1109/icra57147.2024.10609982) · [OpenMAVIS](https://github.com/MAVIS-SLAM/OpenMAVIS) | 🔴 | 多相機 VI-SLAM 的 SOTA 證據（Hilti 2023 視覺賽道冠軍、分數 1.7 倍於第二名）——「四相機是資產不是負擔」的最有力論據。 |
| **VINS-Multi: Robust Asynchronous Multi-camera-IMU State Estimator** | 2024 · [arXiv:2405.14539](https://arxiv.org/abs/2405.14539) | 🟡 | 免硬體同步的多相機 VIO：消費級相機構型（無同步觸發）走這條路線，已在四旋翼實機驗證。 |
| **UAV Geo-Localization for Navigation: A Survey** — Avola et al. | IEEE Access 12, 2024 · [DOI:10.1109/ACCESS.2024.3455096](https://doi.org/10.1109/ACCESS.2024.3455096) | 🟢 | **L2 絕對定位先讀這篇建立全貌**：影像↔衛星圖匹配方法分類與現況。 |
| GNSS-denied UAV localization with satellite and aerial image matching — Lin & Chen | Results in Engineering, 2025 · [DOI:10.1016/j.rineng.2025.108132](https://doi.org/10.1016/j.rineng.2025.108132) | 🟡 | 有具體數字的近期實作：CLIP 式匹配、100 m 高度誤差 39.2 m/15.9°、附開源碼與資料集——評估「衛星圖匹配當絕對修正」可行性的定錨點。 |
| A review on absolute visual localization for UAV — Couturier & Akhloufi | RAS 135, 2020 · [DOI:10.1016/j.robot.2020.103666](https://doi.org/10.1016/j.robot.2020.103666) | 🟢 | 絕對視覺定位的經典綜述，讀 2024 survey 前的背景鋪墊（可略讀）。 |
| ModalAI VOXL 2 技術資源（*Beyond GPS* 部落格＋VIO 文件）| [部落格](https://www.modalai.com/blogs/blog/beyond-gps-how-voxl-uses-vio-to-power-autonomous-drones) · [docs](https://docs.modalai.com/flying-with-vio/) | 🟢 | 產品化參考座標：OpenVINS 核心＋VIO server＋健康監控＋PX4 整合的商用系統切分。 |
| PX4 External Position Estimation（EKF2 external vision）| [官方文件](https://docs.px4.io/main/en/ros/external_position_estimation.html) | 🟢 | VIO 進 PX4 的正規介面：`ODOMETRY`/30–50 Hz 要求/EKF2 融合設定，動手前必讀。 |

---

## C · GPS 失效模擬與驗證（對應 [M5③](m5-gps-failure-sim-validation.md)）

| 論文/資源 | 出處 | 難度 | 為何讀 |
|---|---|---|---|
| PX4 System Failure Injection | [官方文件](https://docs.px4.io/main/en/debug/failure_injection.html) | 🟢 | `SYS_FAILURE_EN`＋`failure gps off/stuck/garbage/wrong/…` 全語法；MAVSDK plugin 對應；**Tier 1 驗證的核心工具**。 |
| PX4 SIH Simulation | [官方文件](https://docs.px4.io/main/en/sim_sih/index.html) | 🟢 | 零依賴、lockstep 確定性的 headless 模擬——CI 迴歸的最快載體。 |
| PX4 Safety (Failsafe) Configuration | [官方文件](https://docs.px4.io/main/en/config/safety.html) | 🟢 | Failsafe 行為全集與觸發機制；無 GPS 專案的 position-loss/geofence 設定陷阱在 M5③ §6。 |
| **evo: evaluation of odometry and SLAM** — Grupp | [GitHub](https://github.com/MichaelGrupp/evo) | 🟢 | ATE/RPE 評估的社群標準工具，支援 TUM/EuRoC/ROS bag；M5③ 指標管線直接用它。 |
| The EuRoC micro aerial vehicle datasets — Burri et al. | IJRR 2016 · [DOI:10.1177/0278364915620033](https://doi.org/10.1177/0278364915620033) | 🟢 | VIO 漂移統計的公版來源（解析漂移模型的參數起點）＋所有 VIO 論文的共同語言。 |
| The TUM VI Benchmark for Evaluating Visual-Inertial Odometry — Schubert et al. | IROS 2018 · [arXiv:1804.06120](https://arxiv.org/abs/1804.06120) | 🟢 | 另一個標準 VI benchmark，含更劇烈運動與光照場景，補 EuRoC 的不足。 |
| gz-sensors NavSat 噪聲 ＋ sdformat issue #1572 | [gz-sensors](https://github.com/gazebosim/gz-sensors) · [issue](https://github.com/gazebosim/sdformat/issues/1572) | 🟡 | 實務坑備忘：gz 的 GPS 水平位置噪聲單位是「度」不是公尺（截至 2026-07 未修），設錯會差六個數量級。 |

---

> ⚠️ **補充：僅查得會議記錄、未逐字核對全文的條目**——Wang et al., *Towards Realistic UAV Vision-Language Navigation (OpenUAV)*, ICLR 2025（[Scopus 記錄](https://www.scopus.com/inward/record.uri?partnerID=HzOxMe3b&scp=105010199605&origin=inward)）；FlightGPT, EMNLP 2025（[DOI:10.18653/v1/2025.emnlp-main.338](https://doi.org/10.18653/v1/2025.emnlp-main.338)）。讀前請自行於 OpenReview/ACL Anthology 確認。

➡️ 回到 [README](../README.md)｜上一份：[M5③ GPS 失效的模擬與驗證方法](m5-gps-failure-sim-validation.md)
