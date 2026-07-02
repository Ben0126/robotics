# 🏞️ M5① 技術報告 · VLA 訓練環境與影像資料集建構

> 本報告對應團隊問題一：「以 3D 建模建立實景訓練環境，但樹枝、草地等細節不完整；如何有效率地建立保真度足夠的影像資料集」。核心結論：**把工作流從『手工 3D 建模』換成『3D Gaussian Splatting 實景重建 + 模擬器內大量自動生成』**，資料產能與植被細節可同時解決。
> 本報告屬 M5 系列（單機四相機、無 GPS、VLA 自主搜索專案）：下一份：[M5② GPS-denied 定位與導航替代方案](m5-gps-denied-localization.md)｜[M5③ 模擬與驗證方法](m5-gps-failure-sim-validation.md)｜[M5④ 論文清單](m5-papers-reading-list.md)
> 相關舊筆記：[M3 模擬平台帶讀](../m3-ai-perception/m3-sim-platforms-guided-reading.md)、[M3 OpenVLA 帶讀](../m3-ai-perception/m3-openvla-guided-reading.md)、[UAV Embodied AI 綜述筆記](../research_output/knowledge_base/uav-embodied-ai-synthesis.md)

---

## Executive Summary (English)

**Problem.** The team currently hand-builds photorealistic 3D environments for VLA training. Thin structures — tree branches, grass, wires — are poorly reproduced, degrading exactly the imagery that obstacle avoidance and target search depend on. Hand-modeling also scales badly: every new scene costs artist-weeks.

**Key findings.** (1) The bottleneck is a workflow problem, not a rendering-quality problem. VLA policies consume *rendered images*, so what matters is **visual fidelity of the rendered view**, not geometric mesh completeness. (2) **3D Gaussian Splatting (3DGS)** reconstructs real scenes from ordinary video and renders vegetation and thin structures far more faithfully than mesh-based photogrammetry, in real time (>100 fps). It is already used *specifically for drone visuomotor policy training*: Stanford's SOUS VIDE/FiGS (RA-L 2025) trains zero-shot sim-to-real drone policies entirely inside Gaussian Splats; OpenFly (2025) uses 3DGS as one of four rendering engines to auto-generate a 100k-trajectory aerial VLN dataset. (3) NVIDIA Isaac Sim (6.0.1) now renders 3DGS natively (NuRec/ParticleField), so real-scene splats can be dropped into a physics simulator with PX4 SITL in the loop. (4) Foundation-model auto-labeling (Grounded SAM 2 / Autodistill) plus simulator ground truth eliminates most manual annotation.

**Recommendation.** Adopt a hybrid Real2Sim pipeline: capture real target/obstacle scenes with a camera walk-through → reconstruct with 3DGS (Nerfstudio/3DGRUT) → import into Isaac Sim (NuRec) or a FiGS-style lightweight simulator → mass-generate multi-camera trajectories with domain randomization → auto-label with simulator ground truth + Grounded SAM 2 → fine-tune VLA on a mix of synthetic and a small set of real flight clips.

**Roadmap.** Phase 1 (4–6 weeks): single-scene 3DGS pipeline proof-of-concept. Phase 2 (6–10 weeks): Isaac Sim integration, 4-camera rig, randomization, auto-labeling at scale. Phase 3 (continuous): scene library growth and real-data mixing. Details in §6.

---

## 0. 問題定義與範圍

### 0.1 團隊現況與痛點

- 現行做法：以 3D 建模（美術建模 / 傳統攝影測量產 mesh）重建實景，供 VLA 訓練用。
- 痛點：**樹枝、草地、電線等薄結構細節不完整**。VLA 雖然不需要超高畫質，但避障與目標辨識所依賴的影像必須「該有的東西要在、形狀要對」——薄結構恰好是避障最危險、也最難建模的物體。
- 隱藏的第二個痛點：手工建模**不可規模化**。每換一個場景就要重付一次建模成本，而 VLA 訓練需要的是「大量、多樣」的場景與軌跡。

### 0.2 先拆解：「保真度」其實是三件事

| 維度 | 定義 | 對 VLA 的影響 | 手工建模的表現 |
|---|---|---|---|
| **視覺保真度** (visual fidelity) | 渲染出來的影像看起來像不像真的 | **直接決定** sim-to-real gap：policy 的輸入就是這些影像 | 差（薄結構、材質、光照都假）|
| **幾何正確性** (geometric accuracy) | 3D 形狀、尺度、位置對不對 | 影響碰撞判定、ground-truth 標註、深度監督 | 中（大結構可以，細節不行）|
| **語義正確性** (semantic validity) | 場景內容、物體分布合不合理 | 影響目標搜索行為學到的先驗 | 取決於建模者 |

> 關鍵觀念：**VLA policy 吃的是渲染後的 2D 影像，不是 3D 模型本身**。所以「建模不夠細」的正確翻譯是「渲染出的影像不夠真」。這把問題從「怎麼把 mesh 建得更細」（貴且慢）轉向「有沒有別的表示法能直接把實景渲染得更真」（3DGS 的強項，見 §1）。

### 0.3 本報告的比較基準（5 評估軸）

後文所有比較表使用同一組評估軸：**① 視覺保真度**（尤其薄結構/植被）、**② 建置成本**（人力＋資料採集）、**③ 生成速度**（能否即時渲染供 closed-loop 訓練）、**④ 可自動標註性**（能否免費拿到 ground truth）、**⑤ Domain gap**（訓練出的 policy 轉移到真機的落差）。

### 0.4 範圍

本報告只處理「訓練環境與資料集」。定位方案見 [M5②](m5-gps-denied-localization.md)；模擬驗證方法（含在 photoreal 模擬中跑真 VIO）見 [M5③](m5-gps-failure-sim-validation.md)。

---

## 1. Real2Sim 三條路線：Photogrammetry vs NeRF vs 3D Gaussian Splatting

### 1.1 三種技術一句話定位

| 路線 | 表示法 | 一句話 |
|---|---|---|
| 攝影測量 (Photogrammetry / MVS) | 三角網格 mesh + 貼圖 | 從多視角照片解出**明確幾何**，輸出傳統 3D 資產 |
| 神經輻射場 (NeRF, Neural Radiance Field) | 隱式神經網路 | 用網路擬合「從任何角度看過去是什麼顏色」，渲染真但**慢** |
| 3D 高斯潑濺 (3DGS, 3D Gaussian Splatting)，[Kerbl et al., SIGGRAPH 2023](https://doi.org/10.1145/3592433) | 數百萬個各向異性高斯點 | NeRF 級視覺品質＋**即時渲染**（>100 fps），從普通影片就能重建 |

### 1.2 綜合比較（依 §0.3 五軸）

| 評估軸 | Photogrammetry | NeRF | 3DGS |
|---|---|---|---|
| 視覺保真度（薄結構/植被）| ❌ 樹枝斷裂、草地糊成一片、需人工補模 | ✅ 好，但邊緣易霧化 | ✅ **最佳平衡**：植被外觀自然，視角內插品質高 |
| 幾何正確性 | ✅ 明確 mesh，量測級 | ⚠️ 需另外抽表面 | ⚠️ 點雲式、無封閉表面（碰撞處理見 §2.4）|
| 建置成本 | 中～高（採集嚴謹＋人工修模）| 中（影片即可，訓練數小時）| 低～中（影片即可，訓練快於 NeRF）|
| 渲染速度 | ✅ 即時（遊戲引擎）| ❌ 秒級/幀，closed-loop 訓練不可行 | ✅ **>100 fps**，可做 closed-loop |
| 可自動標註 | ✅（引擎內全知）| ⚠️ 困難 | ✅（可配語義嵌入、深度輸出）|
| Domain gap | 高（手工材質假）| 低 | **低**（實景直接重建）|

### 1.3 植被與薄結構的實證證據（這是團隊痛點的直接答案）

三篇近期對照研究，結論一致指向「傳統攝影測量在植被場景的極限」：

1. **森林場景重建對照**（[Tian et al., *Remote Sensing* 17(9):1520, 2025](https://doi.org/10.3390/rs17091520)；預印本 [arXiv:2410.05772](https://arxiv.org/abs/2410.05772)）：攝影測量在複雜林分「樹冠雜訊過多、樹幹重複重建」；NeRF 對樹冠最好；3DGS 點雲較稀但整體效率遠高於攝影測量。
2. **航拍影像三法比較**（[ISPRS Annals X-2-2024](https://isprs-annals.copernicus.org/articles/X-2-2024/97/2024/isprs-annals-X-2-2024-97-2024.pdf)）：對正射式高空航拍、以「點雲密度/幾何精度」為指標時，傳統 COLMAP 流程在高植被、少視角區域仍勝過 Nerfacto/Splatfacto——**注意：這是幾何指標，不是渲染指標**。
3. **植被遮擋分析**（[Petrovska & Jutzi, *ISPRS Open Journal of Photogrammetry and Remote Sensing*, 2025](https://doi.org/10.1016/j.ophoto.2025.100089)）：系統比較 MVS/NeRF/GS 在植被遮擋下的重建行為。

> ⚠️ 誠實的 nuance：如果你要的是**測繪級幾何**（樹幹直徑、正射高程），攝影測量仍有優勢。但我們要的是**給 VLA 看的影像**——渲染視覺保真度——這正是 3DGS 對 mesh 路線的壓倒性強項，也是為什麼 2024–2026 的無人機視覺 policy 訓練研究（§2）幾乎全部改用 3DGS 而不是更細的 mesh。

### 1.4 工具鏈現況（截至 2026-07）

| 工具 | 用途 | 授權/狀態 |
|---|---|---|
| [Nerfstudio](https://docs.nerf.studio/)（含 `splatfacto`）| 影片→COLMAP→3DGS 一條龍，社群標準 | Apache-2.0，活躍 |
| [gsplat](https://github.com/nerfstudio-project/gsplat) | 3DGS CUDA 渲染核心（splatfacto 底層）| Apache-2.0，活躍 |
| [3DGRUT (NVIDIA)](https://github.com/nv-tlabs/3dgrut) | 訓練 splats 並匯出 **USD ParticleField** 給 Omniverse/Isaac Sim | 開源，非常活躍（last push 2026-07）|
| RealityCapture / Metashape | 傳統攝影測量（保留給需要量測級幾何的場合）| 商業授權 |

---

## 2. 3DGS 驅動的無人機模擬：現況盤點（截至 2026-07）

這一節回答「3DGS 不只是重建技術，已經是無人機 policy 訓練的**模擬環境**」。

### 2.1 SOUS VIDE / FiGS（Stanford MSL）——最完整的先例

[SOUS VIDE](https://doi.org/10.1109/LRA.2025.3553785)（[arXiv:2412.16346](https://arxiv.org/abs/2412.16346)，IEEE RA-L 2025；[GitHub](https://github.com/StanfordMSL/SousVide)）值得團隊精讀，因為它就是「在 3DGS 裡訓練端到端視覺飛行 policy 並零樣本上實機」的完整示範：

- **FiGS 模擬器**：3DGS 場景 ＋ 極簡 9 維無人機動力學，photorealistic 渲染達 **130 fps**。
- **資料生成**：由帶特權資訊（真值狀態）的 MPC 專家在 splat 內飛行，自動收集 **10 萬–30 萬筆 影像/狀態-動作對**，同時做動力學參數與空間擾動的隨機化。
- **成果**：蒸餾出的 SV-Net 在 Jetson **Orin Nano** 上以 20 Hz 跑，105 次實機實驗中對 30% 質量變化、40 m/s 陣風、60% 環境亮度變化、場景物體搬移都穩健——**零實機示範資料**。
- 對團隊的啟示：這套「splat 內專家示範 → 行為複製」流程，就是 VLA 訓練資料工廠的原型；且證明 3DGS 保真度足以支撐 sim-to-real。

### 2.2 同系列與後續工作

| 工作 | 出處 | 重點 |
|---|---|---|
| Splat-Nav | [arXiv:2403.02751](https://arxiv.org/abs/2403.02751)（T-RO 2025；[GitHub](https://github.com/chengine/splatnav)）| 在 GSplat 地圖內做安全走廊規劃（Splat-Plan）＋**只用 RGB 在 splat 內定位**（Splat-Loc，~25 Hz）——後者與 [M5②](m5-gps-denied-localization.md) 直接相關 |
| GRAD-NAV++ | [IEEE RA-L 2026, DOI:10.1109/LRA.2025.3643290](https://doi.org/10.1109/LRA.2025.3643290) | VLM 引導的無人機導航＋高斯輻射場＋可微分動力學，代表「3DGS 環境＋語言模型」已合流 |
| OpenFly | [arXiv:2502.18041](https://arxiv.org/abs/2502.18041) | 把 3DGS 列為四大渲染引擎之一，專門負責 real-to-sim（詳見 §5）|

### 2.3 Isaac Sim 原生 3DGS：NuRec + 3DGRUT

NVIDIA 路線已把 3DGS 納入正式產品（查證於 [Isaac Sim 6.0.1 Release Notes](https://docs.isaacsim.omniverse.nvidia.com/6.0.1/overview/release_notes.html) 與 [NuRec 文件](https://docs.isaacsim.omniverse.nvidia.com/6.0.1/assets/usd_assets_nurec.html)，2026-07）：

- **NuRec (Neural Reconstruction)**：實景影像 → 神經體渲染資產（OpenUSD ParticleField，即 3D 高斯潑濺），Omniverse RTX **原生渲染**，可與傳統多邊形場景內容混合。
- 用開源 [3DGRUT](https://github.com/nv-tlabs/3dgrut) 訓練 splats 並匯出 USD 場景。
- Isaac Sim 5.0 首次支援 NuRec；6.0/6.0.1（Kit 110）強化 SPG（Sparse Pixel Gaussian）渲染、NuRec 場景遙操作與 MobilityGen 資料生成整合。
- 意義：**「實景 splat + 物理引擎 + PX4 SITL + Replicator 合成資料」可以在同一個平台完成**，這是其他 3DGS 模擬方案（多半只有簡化動力學）沒有的。

### 2.4 已知限制：碰撞幾何

3DGS 是「一坨會發光的高斯點」，**沒有封閉表面**，物理引擎不能直接拿來算碰撞。三種務實解法：

1. **Mesh 抽取**：從 splat 抽粗網格（或用攝影測量粗 mesh）當隱形碰撞體，splat 只負責視覺——視覺與碰撞分離，是目前主流做法（Isaac Sim NuRec 範例即是：在 splat 場景中加 collision ground plane / proxy）。
2. **點雲膨脹**：直接把高斯中心當點雲做距離查詢（Splat-Nav 的 safe-corridor 走這路線，有數學保證）。
3. **只做視覺、碰撞用程序化場景**：訓練避障時混用程序化幾何場景（見 §4），3DGS 場景負責目標辨識與語義任務。

---

## 3. 無人機模擬平台選型（截至 2026-07）

維護狀態均以 GitHub API `pushed_at` 查證（2026-07-02）。

| 平台 | 物理/渲染 | PX4 整合 | 多相機支援 | 3DGS | 維護狀態 | GPU 需求 |
|---|---|---|---|---|---|---|
| **Isaac Sim 6.0.1** + [Pegasus Simulator](https://github.com/PegasusSimulator/PegasusSimulator) | PhysX / RTX 高保真 | ✅（Pegasus 提供 PX4 SITL 橋接）| ✅ 任意 rig | ✅ NuRec 原生 | Isaac Sim：NVIDIA 官方；Pegasus v5.1.0，push 2026-04，活躍 | RTX 級，高 |
| [Aerial Gym Simulator](https://github.com/ntnu-arl/aerial_gym_simulator) | Isaac Gym GPU 並行 | ❌（RL 導向）| ⚠️ 有限 | ❌ | v2.0.0（2025-04），push 2026-01；注意底層 Isaac Gym 已停止開發 | 高 |
| [OmniDrones](https://github.com/btx0424/OmniDrones) | Isaac Sim 4.1 | ⚠️ | ⚠️ | ❌ | ❌ **作者已於 README 聲明難以繼續維護**（2025）| 高 |
| [gym-pybullet-drones](https://github.com/utiasDSL/gym-pybullet-drones) | PyBullet 輕量 | ⚠️（Betaflight SITL）| ⚠️ 簡易 | ❌ | push 2026-05，活躍；同團隊另有 aerial-autonomy-stack（ROS2+PX4+YOLO）| 低 |
| [Colosseum](https://github.com/CodexLabsLLC/Colosseum)（AirSim 社群後繼）| UE5 渲染佳 | ✅ | ✅ | ❌ | push 2025-12，社群規模小（~660 stars）；原 [AirSim](https://github.com/microsoft/AirSim) 微軟已於 2022 封存 | 中高 |
| [Flightmare](https://github.com/uzh-rpg/flightmare) | Unity + 解耦物理 | ⚠️ | ⚠️ | ❌ | ❌ 實質停止維護（last push 2024-06，主要開發止於 2021）| 中 |
| FiGS（SOUS VIDE 的模擬器，[standalone 版](https://github.com/madang6/FiGS-Standalone)）| 簡化 9 維動力學 + 3DGS 渲染 | ❌ | ⚠️ 需自行擴充 | ✅ 核心賣點 | 研究碼，Stanford MSL 持續發表中 | 中（單卡可跑）|

（GPU 並行 RL 模擬的背景知識見 [M3 模擬平台帶讀](../m3-ai-perception/m3-sim-platforms-guided-reading.md)，此處不重複。）

**選型建議**：
- **主線：Isaac Sim + Pegasus + NuRec**——唯一同時滿足「PX4 SITL in-the-loop、任意四相機 rig、3DGS 實景、合成資料工具鏈（Replicator）」的組合；缺點是 GPU 門檻與學習曲線。
- **快速原型線：FiGS 式輕量 3DGS 模擬**——單卡可跑、上手最快，適合 Phase 1 驗證「splat 品質是否足夠支撐目標辨識/避障」；但沒有 PX4 與完整物理。
- 避免押注 OmniDrones（已停維護）與 Flightmare（休眠）；AirSim 系（Colosseum）只在需要現成 UE 場景資產時考慮。

---

## 4. Domain Randomization 與合成資料自動標註

### 4.1 為什麼 DR 能部分替代「建模保真」

Domain Randomization（[Tobin et al., 2017, arXiv:1703.06907](https://arxiv.org/abs/1703.06907)）的核心論證：與其花錢把模擬做得跟真實一模一樣，不如**大量隨機化**（材質、光照、物體位置、相機參數），讓真實世界看起來只是隨機化分布中的一個樣本。對團隊的意義：

- 樹枝/草地「長得不完全一樣」沒關係——只要**分布夠廣**，policy 學到的是形狀與遮擋的不變特徵，而不是特定貼圖。
- 與 3DGS 互補：3DGS 負責「基準場景像真的」，DR 負責「覆蓋變異」。SOUS VIDE 的做法正是兩者疊加（splat 場景 + 動力學/擾動隨機化）；[M3 Swift 帶讀](../m3-ai-perception/m3-swift-guided-reading.md)裡 RPG 的教訓也一致——用**經驗量測的噪聲模型**做隨機化，比追求完美模擬更有效。

**Omniverse Replicator**（Isaac Sim 內建，[官方文件](https://docs.omniverse.nvidia.com/extensions/latest/ext_replicator.html)）提供現成 randomizer：紋理、光照、位姿、天氣、相機抖動，並直接輸出 2D/3D bbox、語義/實例分割、深度、法向量等 ground truth——**在模擬器內，標註是免費的**。

### 4.2 真實影像的自動標註：foundation model 蒸餾管線

真實航拍影像（以及 3DGS 訓練用素材）可用開放詞彙基礎模型自動標註，人力只做抽驗：

```
真實影像/影片
   │
   ▼
Grounding DINO（文字 prompt → 開放詞彙偵測框）[arXiv:2303.05499]
   │
   ▼
SAM 2（框 → 像素級分割遮罩，影片可追蹤）[arXiv:2408.00714]
   │
   ▼
資料集（COCO/YOLO 格式）──→ 訓練輕量目標偵測器 或 餵 VLA 微調
```

- 現成整合：[Grounded SAM 2（IDEA-Research）](https://github.com/IDEA-Research/Grounded-SAM-2)（含 caption→grounding 級聯自動標註 demo）與 [Autodistill `autodistill-grounded-sam-2`](https://github.com/autodistill/autodistill-grounded-sam-2)（`base_model.label("./images")` 一行標整個資料夾，[操作教學](https://blog.roboflow.com/label-data-with-grounded-sam-2/)）。
- 用法：把團隊的「特定目標」定義成文字 ontology（例如 `{"red vehicle": "target"}`），即可對真實與合成影像做一致標註。
- 品質控管：對 aerial 視角（小目標、俯視）prompt 需先在小樣本上調閾值；自動標註後保留 5–10% 人工抽驗。

---

## 5. 現有 UAV VLA/VLN 資料集與 2025–26 動態

### 5.1 可直接取用的資料集

| 資料集 | 出處 | 規模 | 影像來源 | 任務型態 | 對本團隊可用性 |
|---|---|---|---|---|---|
| **OpenFly** | [arXiv:2502.18041](https://arxiv.org/abs/2502.18041)（2025）· [專案頁](https://shailab-ipec.github.io/openfly/) · [GitHub](https://github.com/SHAILAB-IPEC/openfly) | **10 萬軌跡 / 18 場景**，迄今最大 aerial VLN | UE5、GTA V、Google Earth、**3DGS**（real-to-sim）四引擎 | 語言指令→飛行軌跡 | ★★★ 規模與多樣性最好；且其**自動化工具鏈**（點雲→語義分割→軌跡→指令生成）本身就是團隊資料工廠的參考設計 |
| **AerialVLN** | ICCV 2023 · [GitHub](https://github.com/airvln/airvln)（push 2026-03，仍維護）| ~25 個城市級場景 | AirSim 模擬城市 | 語言導航 | ★★ 經典基準，場景偏城市 |
| **CityNav** | [arXiv:2406.14240](https://arxiv.org/abs/2406.14240)（ICCV 2025 · [官方 repo](https://github.com/water-cookie/citynav)）| 32,637 條**人類示範**軌跡，4.65 km² | 真實城市 3D 掃描（Cambridge/Birmingham）| 語言目標＋地理資訊導航 | ★★ 真實掃描＋人類示範是稀缺屬性；適合評測泛化 |

### 5.2 2025–26 模型/平台動態（挑與團隊最相關者，均經 Scopus/arXiv 查證）

| 工作 | 出處 | 為何相關 |
|---|---|---|
| **AerialVLA** | [AAAI 2026, DOI:10.1609/aaai.v40i22.38878](https://doi.org/10.1609/aaai.v40i22.38878) | 首批明確以「VLA」定位的空中導航模型（含線上對話），代表題目已從 VLN 演進到 VLA |
| FlightGPT | [EMNLP 2025, DOI:10.18653/v1/2025.emnlp-main.338](https://doi.org/10.18653/v1/2025.emnlp-main.338) | VLM 驅動、強調可解釋與泛化的 UAV VLN |
| OpenUAV 平台 | Wang et al., "Towards Realistic UAV Vision-Language Navigation," ICLR 2025（[Scopus 記錄](https://www.scopus.com/inward/record.uri?partnerID=HzOxMe3b&scp=105010199605&origin=inward)）| 主打「真實感 UAV VLN 平台＋benchmark」，與 OpenFly 互為對照 |
| GRAD-NAV++ | [RA-L 2026](https://doi.org/10.1109/LRA.2025.3643290) | VLM＋3DGS＋可微動力學（見 §2.2）|

> 帶走的訊息：**「3DGS real-to-sim ＋ 自動化軌跡/指令生成」已是 2025–26 aerial VLA 資料建構的社群共識做法**，團隊不必自己發明流程，重點是把 OpenFly 式工具鏈適配到自己的場景與四相機構型。

---

## 6. 建議方案：混合資料策略與導入路線圖

### 6.1 建議管線（總覽）

```
【真實世界】                【重建】              【模擬器】                    【資料】
實地影片採集（手機/無人機） ─→ 3DGS 重建 ─→ 匯入 Isaac Sim（NuRec USD）─→ 專家軌跡自動飛行
目標物近距離環拍           (Nerfstudio     ＋ 碰撞 proxy mesh            ＋ Replicator DR
                            或 3DGRUT)     ＋ PX4 SITL（可選）            （光照/材質/位姿）
                                                                          │
真實航拍影像 ──────────────────────────────┐                              ▼
                                           ▼                        四相機影像＋動作
                                    Grounded SAM 2 自動標註 ←── 模擬器 ground truth（免費）
                                           │
                                           ▼
                              混合資料集（合成為主、真實為錨）──→ VLA 微調（OpenVLA 類）
```

設計原則：
1. **合成資料出量，真實資料定錨**：合成負責覆蓋度（場景×光照×視角），少量真實飛行片段防止 policy 過擬合模擬器特性。
2. **一魚三吃**：同一批 3DGS 場景同時服務 (a) VLA 訓練影像、(b) 避障幾何（proxy mesh）、(c) [M5③](m5-gps-failure-sim-validation.md) 的 real-VIO-in-the-loop 驗證。
3. **標註零人工為預設**：模擬內用引擎真值；真實影像用 §4.2 管線；人工只做抽驗。

### 6.2 三階段路線圖

| 階段 | 時程（估）| 內容 | 產出/驗收 |
|---|---|---|---|
| **P1 單場景 PoC** | 4–6 週 | 選 1 個含植被的實測場地：影片採集 → Nerfstudio splatfacto 重建 → FiGS 式渲染腳本產出四相機視角影像；Grounded SAM 2 標註跑通 | 渲染影像人眼/偵測器雙評：目標偵測器在渲染影像 vs 實拍影像的 mAP 落差 < 15% |
| **P2 模擬器整合與量產** | 6–10 週 | 3DGRUT 匯 USD → Isaac Sim NuRec；掛 Pegasus/PX4 SITL；建 4 相機 rig；Replicator 隨機化；自動軌跡生成（參考 OpenFly 工具鏈）| 每日可產 ≥1 萬條四相機軌跡樣本；標註全自動 |
| **P3 規模化與混真** | 持續 | 場景庫擴充（5–10 個場景）；納入 OpenFly/CityNav 公開資料；混入真實飛行片段；建立資料版本管理 | VLA 在留出真實場景的目標搜索成功率、避障違規率達標 |

**算力備註**：3DGS 重建單場景約單張 RTX 4090 級 GPU 數十分鐘～數小時；Isaac Sim 建議 RTX A 系列/4090 以上；VLA 微調（7B 級，LoRA）約 1–8×A100/H100 等級，可租雲端。P1 用一張高階消費卡即可起步。

---

## 7. 風險與開放問題

| 風險 | 影響 | 緩解 |
|---|---|---|
| 3DGS 幾何不可靠 → 避障訓練學到錯誤距離感 | 中 | 視覺用 splat、碰撞用 proxy mesh（§2.4）；避障關鍵訓練混用程序化幾何場景 |
| Sim-to-real gap 未量化就上機 | 高 | P1 就建立「渲染 vs 實拍」偵測器 mAP 落差指標；上機前過 [M5③](m5-gps-failure-sim-validation.md) 驗證矩陣 |
| 3DGS 對**動態物體**與大範圍光照外插弱 | 中 | 動態物體以 Replicator 資產疊加；每場景採集多光照時段素材 |
| 公開資料集授權（GTA V 素材、學術 license）| 中 | 業界產品化前逐一確認授權；自建場景為主、公開資料只做預訓練/評測 |
| Isaac Sim 版本迭代快（5.x→6.x API 變動）| 低 | 鎖定 6.0.1 LTS 式使用；Pegasus 版本對應表跟隨官方 |
| 團隊 GPU 資源不足 | 中 | P1 走 FiGS 輕量線；量產階段再上 Isaac Sim/雲端 |

開放問題：(1) 四相機 rig 的側視/下視影像在 3DGS 場景邊緣（重建視角覆蓋外）品質會下降，需要規劃採集路徑覆蓋側視角；(2) 草地在近地高度（<2 m）的渲染品質仍需 P1 實測確認。

---

## 8. 參考文獻

| # | 來源 | 型態 | 連結 | 查證日期 |
|---|---|---|---|---|
| 1 | Kerbl et al., *3D Gaussian Splatting for Real-Time Radiance Field Rendering*, ACM TOG 42(4), 2023 | 論文 | [DOI:10.1145/3592433](https://doi.org/10.1145/3592433) | 2026-07 |
| 2 | Low et al., *SOUS VIDE: Cooking Visual Drone Navigation Policies in a Gaussian Splatting Vacuum*, IEEE RA-L 2025 | 論文＋代碼 | [DOI:10.1109/LRA.2025.3553785](https://doi.org/10.1109/lra.2025.3553785) · [arXiv:2412.16346](https://arxiv.org/abs/2412.16346) · [GitHub](https://github.com/StanfordMSL/SousVide) | 2026-07 |
| 3 | Chen et al., *Splat-Nav: Safe Real-Time Robot Navigation in Gaussian Splatting Maps*, T-RO 2025 | 論文＋代碼 | [arXiv:2403.02751](https://arxiv.org/abs/2403.02751) · [GitHub](https://github.com/chengine/splatnav) | 2026-07 |
| 4 | Chen Q. et al., *GRAD-NAV++: VLM Enabled Visual Drone Navigation with Gaussian Radiance Fields and Differentiable Dynamics*, IEEE RA-L 2026 | 論文 | [DOI:10.1109/LRA.2025.3643290](https://doi.org/10.1109/LRA.2025.3643290) | 2026-07 |
| 5 | Tian et al., *Comparative Analysis of NVS and Photogrammetry for 3D Forest Stand Reconstruction*, Remote Sensing 17(9):1520, 2025 | 論文 | [DOI:10.3390/rs17091520](https://doi.org/10.3390/rs17091520) · [arXiv:2410.05772](https://arxiv.org/abs/2410.05772) | 2026-07 |
| 6 | *The Potential of NeRF and 3DGS for 3D Reconstruction from Aerial Imagery*, ISPRS Annals X-2-2024 | 論文 | [PDF](https://isprs-annals.copernicus.org/articles/X-2-2024/97/2024/isprs-annals-X-2-2024-97-2024.pdf) | 2026-07 |
| 7 | Petrovska & Jutzi, *Seeing beyond vegetation: comparative occlusion analysis MVS/NeRF/GS*, ISPRS Open J. Photogramm. RS, 2025 | 論文 | [DOI:10.1016/j.ophoto.2025.100089](https://doi.org/10.1016/j.ophoto.2025.100089) | 2026-07 |
| 8 | Tobin et al., *Domain Randomization for Transferring Deep Neural Networks from Simulation to the Real World*, IROS 2017 | 論文 | [arXiv:1703.06907](https://arxiv.org/abs/1703.06907) | 穩定知識 |
| 9 | Gao et al., *OpenFly: A Comprehensive Platform for Aerial Vision-Language Navigation*, 2025 | 論文＋平台 | [arXiv:2502.18041](https://arxiv.org/abs/2502.18041) · [專案頁](https://shailab-ipec.github.io/openfly/) · [GitHub](https://github.com/SHAILAB-IPEC/openfly) | 2026-07 |
| 10 | Lee et al., *CityNav: A Large-Scale Dataset for Real-World Aerial Navigation*, ICCV 2025 | 論文＋資料集 | [arXiv:2406.14240](https://arxiv.org/abs/2406.14240) · [GitHub](https://github.com/water-cookie/citynav) | 2026-07 |
| 11 | AerialVLN（ICCV 2023）官方 repo | 資料集 | [GitHub](https://github.com/airvln/airvln) | 2026-07 |
| 12 | Chen J. et al., *AerialVLA: A Vision-Language-Action Model for Aerial Navigation with Online Dialogue*, AAAI 2026 | 論文 | [DOI:10.1609/aaai.v40i22.38878](https://doi.org/10.1609/aaai.v40i22.38878) | 2026-07 |
| 13 | Cai et al., *FlightGPT*, EMNLP 2025 | 論文 | [DOI:10.18653/v1/2025.emnlp-main.338](https://doi.org/10.18653/v1/2025.emnlp-main.338) | 2026-07 |
| 14 | Wang et al., *Towards Realistic UAV Vision-Language Navigation: Platform, Benchmark, and Methodology*, ICLR 2025 | 論文 | [Scopus 記錄](https://www.scopus.com/inward/record.uri?partnerID=HzOxMe3b&scp=105010199605&origin=inward) ⚠️ 未逐字核對 OpenReview 頁 | 2026-07 |
| 15 | Isaac Sim 6.0.1 Release Notes / NuRec 文件 | 官方文件 | [Release Notes](https://docs.isaacsim.omniverse.nvidia.com/6.0.1/overview/release_notes.html) · [NuRec](https://docs.isaacsim.omniverse.nvidia.com/6.0.1/assets/usd_assets_nurec.html) | 2026-07 |
| 16 | 3DGRUT（NVIDIA）| 開源工具 | [GitHub](https://github.com/nv-tlabs/3dgrut) | 2026-07 |
| 17 | Pegasus Simulator v5.1.0 | 開源工具 | [GitHub](https://github.com/PegasusSimulator/PegasusSimulator) | 2026-07 |
| 18 | 各模擬平台 repo（Colosseum / Flightmare / gym-pybullet-drones / Aerial Gym / OmniDrones）| 開源工具 | 見 §3 表內連結 | 2026-07（GitHub API `pushed_at`）|
| 19 | Grounding DINO / SAM 2 / Grounded SAM 2 / Autodistill | 開源工具 | [arXiv:2303.05499](https://arxiv.org/abs/2303.05499) · [arXiv:2408.00714](https://arxiv.org/abs/2408.00714) · [GitHub](https://github.com/IDEA-Research/Grounded-SAM-2) · [Autodistill](https://github.com/autodistill/autodistill-grounded-sam-2) | 2026-07 |
| 20 | Omniverse Replicator 官方文件 | 官方文件 | [docs](https://docs.omniverse.nvidia.com/extensions/latest/ext_replicator.html) | 2026-07 |

---

➡️ 回到 [README](../README.md)｜下一份：[M5② GPS-denied 定位與導航替代方案](m5-gps-denied-localization.md)
