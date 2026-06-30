# 🧠 M3 AI 模型筆記 · 5 點論文摘要 + 「傳統管線 vs VLA vs Diffusion Policy vs RL」四典範對照表

> 模組：[reading-track.md](reading-track.md) Module 3（AI 模型「架構與程式用法」，取代 Phase 3）
> 對應動手路線：[03-phase3-ai-perception.md](03-phase3-ai-perception.md) Week 5–6
> 讀什麼：VLA Survey → RT-2 → OpenVLA → Diffusion Policy → Swift → Learning High-Speed Flight →（OmniDrones / Aerial Gym 文件）。連結見 [papers-reading-list.md](papers-reading-list.md)。
> 產出物類型：每篇 **5 點筆記**（問題／方法／關鍵設計／結果／對我的啟發）+ 一張 **四典範對照表**（輸入/輸出/資料需求/即時性/優缺點/適用）。
> 銜接：「怎麼把模型實際 load 起來跑一次推論」見姊妹篇 [m3-openvla-inference-cheatsheet.md](m3-openvla-inference-cheatsheet.md)。

---

## 0. 一句話總覽

Phase 3 在問同一件事的四種答法：**「感測 → 動作」這條路，要用人手寫規則，還是讓模型學？**

```
傳統管線：  影像/IMU → SLAM → 規劃 → PID/MPC → 動作      （人寫每一段，可解釋、零學習）
VLA：       影像+語言 ──────► 大模型 ──────► 動作 token   （借網路知識，懂語義、會泛化）
Diffusion： 觀測 ──────► 條件去噪 ──────► 動作序列         （生成式，擅長多模態動作）
RL：        觀測 ──────► 策略網路 ──────► 動作（在 sim 練） （獎勵驅動，極限動態最強）
                                       由「人寫」 ───────► 「資料/獎勵學」
```

**關鍵直覺**：四者不是互斥，而是**「人類先驗 ↔ 資料學習」光譜上的不同點**。越往右越會泛化/越省人工，但越吃資料、越難除錯、即時性與安全越需要額外處理。

---

## 1. 五點論文筆記

> 格式：**問題 / 方法 / 關鍵設計 / 結果 / 對我的啟發**。難度沿用 [papers-reading-list.md](papers-reading-list.md)：🟢 入門 🟡 方法 🔴 進階。

### 1a. VLA Survey — *A Review Towards Real-World Applications*（Kawaharazuka et al., IEEE Access 2025）🟢 · 📖 [逐篇帶讀](m3-vla-survey-guided-reading.md)
- **問題**：VLA（Vision-Language-Action）模型百家爭鳴，缺一張「架構/資料/benchmark/平台」的全景地圖。
- **方法**：系統性回顧——把 VLA 依「動作如何產生」「用什麼資料」「在哪些平台/任務評測」分類。
- **關鍵設計**：點出 VLA 的共同骨架＝**預訓練 VLM 當底座 + 動作頭**；資料瓶頸（真機 trajectory 貴）是主軸矛盾。
- **結果**：給出整個領域的座標系與未解問題（資料規模、即時性、跨形態泛化、安全）。
- **對我的啟發**：**先讀這篇建立全貌**，再用 RT-2/OpenVLA 補方法細節。它的「未解問題」清單可直接餵 Phase 4 選題。

### 1b. RT-2 — *VLA Models Transfer Web Knowledge to Robotic Control*（Brohan et al., Google DeepMind, CoRL 2023）🟡 · 📖 [逐篇帶讀](m3-rt2-guided-reading.md)
- **問題**：機器人資料太少難泛化；網路上的視覺-語言知識能不能「轉」進控制？
- **方法**：把大型 VLM（PaLI-X / PaLM-E 級）拿來**共同微調（co-fine-tune）**——同時餵網路 VQA 資料 + 機器人 trajectory。
- **關鍵設計**：**動作當成 text token**（離散化成「動作詞彙」），讓控制和語言走同一個輸出頭；co-training 保住網路知識 → 出現**語義泛化/推理**（能對沒見過的物件、符號做合理動作）。
- **結果**：對未見物件/指令的泛化大幅提升，出現 chain-of-thought 等湧現能力；但**閉源、模型巨大**。
- **對我的啟發**：「動作即 token」是復用 LLM/VLM 的橋；但跑不動 → 真要動手改用 OpenVLA。

### 1c. OpenVLA — *An Open-Source VLA Model*（Kim et al., CoRL 2024）🟡 ★動手主力 · 📖 [逐篇帶讀](m3-openvla-guided-reading.md)
- **問題**：當紅 VLA 多閉源、難客製；需要一個**開源、可在消費級 GPU 微調**的 VLA。
- **方法**：7B 模型，底座＝Prismatic VLM（**Llama 2 7B + DINOv2 + SigLIP** 雙視覺編碼器融合）；用 **Open X-Embodiment 約 97 萬條** episode 訓練。
- **關鍵設計**：動作以 **256 bin 離散化**，覆寫 Llama 詞表中最少用的 256 個 token；**LoRA 微調**單張(消費級~A100)即可；推論支援 **4/8-bit 量化**。
- **結果**：以 **7× 更少參數**在通用操作上勝過 RT-2-X(55B)；參數高效微調表現強。
- **對我的啟發**：**這就是 cheat-sheet 那篇**（[m3-openvla-inference-cheatsheet.md](m3-openvla-inference-cheatsheet.md)）。它輸出 7-DoF **機械臂末端增量**；要用到無人機，得把動作頭重映射到 `TrajectorySetpoint` / body-rate（接 [m1-offboard-code-reading.md](m1-offboard-code-reading.md)）。

### 1d. Diffusion Policy — *Visuomotor Policy Learning via Action Diffusion*（Chi et al., RSS 2023 / IJRR 2024）🟡 · 📖 [逐篇帶讀](m3-diffusion-policy-guided-reading.md)
- **問題**：一般 BC 直接回歸「單一動作」，碰到**多模態**（同一畫面有多個合理動作，如繞左/繞右）會學成平均值而崩。
- **方法**：把「產生動作」當成**條件式去噪擴散**——以觀測為條件，從噪聲逐步生成一段**動作序列**。
- **關鍵設計**：**visual conditioning**（觀測注入去噪網路）、**action chunking + receding horizon**（一次生一段、只執行前幾步再重生）、天然處理多模態、訓練穩定；有 CNN 與 Transformer 兩種骨架。
- **結果**：在大量操作任務上顯著超越 BC 基線。
- **對我的啟發**：多模態動作的解法很漂亮，代價是**去噪要多步 → 推論延遲高**；用在高動態 UAV 要算清「即時性 vs 表現」帳。

### 1e. Swift — *Champion-level drone racing using deep RL*（Kaufmann et al., **Nature** 2023）🟡 ★旗艦 · 📖 [逐篇帶讀](m3-swift-guided-reading.md)
- **問題**：只靠**機載感測**，自主無人機能否在 FPV 競速打贏人類世界冠軍？
- **方法**：**在 sim 用 RL 訓策略**；感知模組（VIO + 閘門偵測 CNN）給狀態估測 → RL 策略輸出**集體推力 + body rate（CTBR）**。
- **關鍵設計**：用**經驗噪聲/殘差模型**（拿少量真機資料校正 sim）縮 **sim-to-real gap**；全程 onboard、訓在 sim。
- **結果**：擊敗多位人類世界冠軍——RL 無人機首次達冠軍級。
- **對我的啟發**：sim-to-real 不一定靠暴力 domain randomization，**對誤差來源建模**更省。輸出是「推力+角速度」＝直接打 M2 的**最內角速度環**（[m2-cascade-control-diagram.md](m2-cascade-control-diagram.md)）。

### 1f. Learning High-Speed Flight in the Wild（Loquercio et al., **Science Robotics** 2021）🟡 · 📖 [逐篇帶讀](m3-high-speed-flight-guided-reading.md)
- **問題**：在**未知野外**高速避障，傳統「建圖→規劃」太慢，能否端到端？
- **方法**：端到端網路把**深度圖 + 狀態**直接映射到**無碰撞軌跡**；用 **privileged learning**（teacher 有完整狀態/地圖，student 只用機載感測模仿）；**只在 sim 訓、zero-shot 上真機**。
- **關鍵設計**：teacher-student 特權學習、以深度做感知抽象、sim-only → zero-shot sim2real。
- **結果**：在森林/建物間以最高 ~10 m/s 無地圖穿越。
- **對我的啟發**：端到端輸出的是**軌跡（waypoints）而非原始馬達**——和 OpenVLA 的「末端增量」一樣，落地都要接回 `TrajectorySetpoint`。privileged learning 是繞過「真機標註貴」的好招。

### 1g. OmniDrones / Aerial Gym（W6 動手平台，讀文件不必訓練）🟡 · 📖 [逐篇帶讀](m3-sim-platforms-guided-reading.md)
- **是什麼**：Isaac 系 **GPU 並行**多旋翼 RL 模擬器（OmniDrones on Isaac Sim、Aerial Gym on Isaac Gym），數百~數千環境並行、10⁵ 級 FPS。
- **要看懂的「程式用法」**：一個 RL 任務由 **task / config / reward** 三塊構成——**要客製任務就改這三處**（觀測空間、動作空間、reward 函式、隨機化設定）。
- **對我的啟發**：這是把上面 RL 概念**真的跑起來**的入口；無 GPU 時精讀其 reward/隨機化怎麼寫即可（接 Phase 4 starter project）。

---

## 2. 四典範對照表（Module 3 指定產出物）

> 用法：拿到一個「感測→動作」需求，先用這張表判斷該往哪個典範靠。

| 維度 | 🛠️ 傳統管線<br>(SLAM+規劃+PID/MPC) | 🤖 VLA<br>(RT-2 / OpenVLA) | 🌫️ Diffusion Policy | 🎮 RL<br>(Swift / High-Speed Flight) |
|---|---|---|---|---|
| **輸入** | 影像/深度/IMU/GPS（人挑特徵）| **影像 + 自然語言指令** | 觀測（影像+本體狀態）| 觀測（狀態估測/深度）|
| **輸出** | 控制量（軌跡/推力/PWM）| 動作 token（解碼成 7-DoF 末端增量等）| **動作序列**（action chunk）| 動作（CTBR：推力+角速度 / 軌跡）|
| **怎麼得到** | **人寫**演算法+調參 | 預訓 VLM + 機器人資料**共訓/微調** | 專家示範**監督學**（BC 升級版）| 環境互動 + **reward** 試錯 |
| **資料需求** | 幾乎不用（靠先驗）| 大（網路 VLM 預訓 + 機器人 trajectory）| 中（要專家示範）| 不用標註，但要**大量 sim 互動** |
| **即時性/延遲** | 低、可預測（ms 級）| 中~高（7B 推論，量化後 ~數 Hz）| **高**（去噪多步）| **低**（小網路、本就為高動態設計）|
| **語義/泛化** | 無語義；只在設計域內 | **最強**：懂語言、未見物件可泛化 | 中：擅長**多模態**動作分佈 | 域內極強，跨任務需重訓 |
| **可解釋/除錯** | **最好**（每段可單測）| 差（黑箱大模型）| 差（生成式黑箱）| 中~差（看 reward 曲線/rollout）|
| **安全/驗證** | 成熟（飛控/航太慣例）| 未成熟，需護欄 | 未成熟 | sim 安全；上真機靠 sim-to-real |
| **主要優點** | 可靠、可認證、零學習成本 | 一個模型吃多任務+語言 | 多模態、長序列、訓練穩 | 極限動態/反應式表現天花板高 |
| **主要缺點** | 不會泛化、每個新場景重寫 | 大、慢、吃資料、難保證 | 推論慢、要示範資料 | reward 難設、sim-to-real gap |
| **適用場景** | 明確規格的穩定飛行/定點 | 語言指令導航、長任務操作 | 接觸密集/多模態操作 | FPV 競速、極限避障穿越 |
| **UAV 落地接口** | 直接出 `TrajectorySetpoint`/rate | 動作頭重映射到 setpoint/rate | 輸出序列→逐點 setpoint | CTBR→**角速度環**（M2 內環）|

> 一句話收斂：**規格清楚穩定飛 → 傳統管線；要聽懂人話、跨場景 → VLA；接觸密集/多解動作 → Diffusion；極限動態反應式 → RL。** 真實系統常是**混搭**（如 Swift：傳統感知 + RL 控制）。

---

## 3. 架構速記（Module 3「要看懂」四件事）

### 3a. VLM 三段式（VLA 的底座）
```
影像 → [Vision Encoder] → 視覺 token → [Projector] → [LLM] → 文字/動作 token
        DINOv2/SigLIP/CLIP            (MLP 對齊)     Llama 等
```
- **Vision Encoder**：抽影像特徵（CLIP 用對比學習對齊圖↔文；OpenVLA 融合 DINOv2+SigLIP 兼顧語義與空間）。
- **Projector**：把視覺特徵投影到 LLM 的 token 空間（通常就一個 MLP）。
- **LLM**：把視覺 token 當「外語單字」一起做自回歸生成。

### 3b. VLA：動作即 token
- RT-2／OpenVLA 把連續動作**離散化成 bin**（OpenVLA：每維 256 bin），佔用詞表裡**最少用的 token**；於是「預測動作」＝「預測下一個字」，**整套 LLM 機制原封不動復用**。
- co-training（混網路資料）是泛化的來源：模型沒「忘記」網路知識。

### 3c. Diffusion Policy：條件去噪生成動作
- 訓練：對專家動作序列加噪，學「去噪網路」還原；**以觀測為條件**。
- 推論：從純噪聲開始，**多步去噪**生出一段動作 → **receding horizon**（只執行前幾步，再重生）。
- 贏在**多模態**：不會把「繞左/繞右」平均成「直直撞上」。

### 3d. Sim-to-Real RL：gap 怎麼縮
- **Domain Randomization**：把質量/風/感測延遲/紋理隨機化，逼策略學到魯棒不變量（OmniDrones/Aerial Gym 的做法）。
- **經驗噪聲模型（Swift）**：不亂隨機，而是**對真機誤差來源建模**再注回 sim——更精準省樣本。
- **Privileged Learning（High-Speed Flight）**：teacher 用「上帝視角」全狀態學最優，student 只用機載感測**模仿** teacher → 既好學又能上真機。

---

## 4. 自我驗收（對應 reading-track Module 3 + progress-tracker W5–6）

- [ ] 能用「人類先驗 ↔ 資料學習」光譜，一句話定位傳統管線/VLA/Diffusion/RL 四者
- [ ] 能說出 VLM 三段式（vision encoder → projector → LLM）各段在幹嘛
- [ ] 能解釋 RT-2「動作即 token」為何能復用 LLM、為何帶來語義泛化
- [ ] 能說清 OpenVLA 相對 RT-2 的賣點（開源、7B、LoRA 微調、量化）與動作輸出長相
- [ ] 能說明 Diffusion Policy 為何擅長**多模態**、代價是**推論延遲**
- [ ] 能分辨三種 sim-to-real 手法：domain randomization / 經驗噪聲模型(Swift) / privileged learning
- [ ] 能默畫/口述四典範對照表的「輸入/輸出/資料/即時性/適用」五欄
- [ ] ✅ M3 產出物①到齊（本筆記）→ 搭配 cheat-sheet（[m3-openvla-inference-cheatsheet.md](m3-openvla-inference-cheatsheet.md)）即可收 Module 3、進 Module 4（前沿 Aerial VLN）

➡️ 姊妹篇：[OpenVLA 推論 API cheat-sheet](m3-openvla-inference-cheatsheet.md)｜下一階段：[Module 4 / Phase 4 論文研讀](04-phase4-integration-papers.md)
