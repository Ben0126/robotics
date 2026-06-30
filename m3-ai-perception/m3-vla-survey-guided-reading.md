# 🧭 帶讀筆記 · VLA Survey（Kawaharazuka et al., IEEE Access 2025）

> 帶讀對象：**論文本身**——Kawaharazuka, Oh, Yamada, Posner, Zhu，《Vision-Language-Action Models for Robotics: A Review Towards Real-World Applications》，IEEE Access vol.13, pp.162467–162504, 2025。
> 連結：[arXiv:2510.07077](https://arxiv.org/abs/2510.07077)｜[專案頁/分類表](https://vla-survey.github.io/)｜[doi](https://doi.org/10.1109/ACCESS.2025.3609980)
> 模組定位：[reading-track.md](reading-track.md) **Module 3 第一篇**（W5）——這篇的任務是**建立全貌**（架構地圖、資料、benchmark、平台），不是學單一模型。
> 用法：開兩視窗，左原文、右這份；讀到「⏸ 停一下」就闔上原文自問。**這是 survey，別逐字啃**——抓骨架（§II 挑戰、§III 演進、§IV 分類三軸）最划算。

---

## 0. 先抓主線：這篇在回答什麼

```
為什麼難？     → §II 三大挑戰（資料/跨形體/算力）   「real-world 的牆」
怎麼一路演化的？→ §III 演進史（CNN→Transformer→VLM→Diffusion/Flow→階層）「主線時間軸」
有哪些做法？    → §IV 分類三軸（sensorimotor / world model / affordance）「全貌地圖」★最重要
怎麼訓練/餵資料/評估？→ §V 訓練、§VI 資料、§VII 平台與benchmark「工程落地」
往哪走？        → §VIII 實務建議、§IX 八個未來方向「找研究缺口」
```

**一句話定位**：這是一張**「VLA 全領域地圖」**，不是教你開一台車。它最大的貢獻是 §IV 那套**三軸分類法**——把上百個模型用「怎麼產生動作」歸成三大類。讀懂這三軸，之後看任何新 VLA 論文都能一秒歸位。

**和你既有 M3 筆記的關係**：這篇是**上游全貌**，你手上的 [m3-ai-models-comparison.md](m3-ai-models-comparison.md) 是**下游精選**（RT-2 / OpenVLA / Diffusion / RL 四典範）。對照著讀：survey 給座標系，comparison 給你動手的那幾顆。

**建議讀法與預算（純讀約 2–3 小時，survey 用「掃描式」）**：
§I+§II(20分) → §III 演進(30分) → **§IV 分類三軸(50分，重中之重)** → §V/§VI/§VII 各掃(30分) → §II+§IX 挑戰與方向(20分) → 本檔 §6 小考(15分)。

---

## 1. 帶讀 §II：三大挑戰（先懂「牆在哪」，後面所有設計都在繞這三道牆）

survey 開宗明義把 real-world 的難處收成三條。**先記這三條**，§IV 的每種架構其實都是在回應其中一條。

| 挑戰 | 核心矛盾 | 後面誰在解 |
|---|---|---|
| **A. 資料稀缺** | 網路資料**沒有動作標註**（看得懂世界、不會動手）；機器人資料**語言貧乏、任務窄**且遙操作貴 | world model（吃無標註影片）、affordance（從人類影片抽）、OXE（聚合多機資料） |
| **B. 跨形體轉移** | 機械臂/輪/腿、DoF 不同、動作空間不同；人類示範**沒有對應的機器動作標籤** | 統一動作空間（OXE 7-DoF、UniAct codebook）、latent action |
| **C. 算力與訓練成本** | 多模態高維輸入 + Transformer 隨序列長度爆炸；微調貴、邊緣端推論延遲/記憶體吃緊 | flow matching（π₀ 衝 50Hz）、量化、輕量化（SmolVLA） |

**讀到這裡停一下 ⏸**
- 問：**為何「網路資料多」卻仍說資料稀缺？**（答：網路圖文**沒有 motor grounding**——它知道「杯子」長怎樣，不知道「抓杯子」手要怎麼動。VLA 缺的是**對齊到動作**的那一份。）
- 問：挑戰 B 為何是 VLA 特有、LLM 沒有？（答：文字只有一種「形體」；機器人每換一台**動作空間就變**，學到的策略不能直接搬。）

**白話比喻**：三道牆＝**「沒教材、換了車不會開、油錢太貴」**。整篇 survey 就是各家怎麼翻這三道牆。

---

## 2. 帶讀 §III：演進史（一條時間軸，把名詞串成因果）

別把模型當散點記，記**這條「為了解決前一代的痛而生」的鏈**：

```
CLIPort（CNN，2D pick-place）
   └─痛：表達力弱、難擴展
Gato / VIMA（Transformer，多任務 token 化）
   └─痛：從零學、沒有世界知識
RT-1（大規模真機資料 Transformer）→ RT-2（接 VLM，動作=token，會語義泛化）→ RT-X/OpenVLA（跨機、開源）
   └─痛：離散 token 動作不夠平滑、不夠即時
Octo / RDT-1B / π₀（擴散、flow matching 連續動作）
   └─痛：長任務、單層策略不夠
RT-H / π₀.₅ / GR00T N1（階層：高層 VLM 想、低層策略動）
```

**讀到這裡停一下 ⏸**
- 問：**RT-1 → RT-2 跨了什麼質變？**（答：RT-2 把預訓練 **VLM** 接進來、把動作當 text token 一起訓 → 繼承網路語義知識 → 會「沒看過的物件也試著做」。這是 [m3-ai-models-comparison.md](m3-ai-models-comparison.md) §1b 那顆。）
- 問：**為何從離散 token 轉向 diffusion / flow？**（答：離散 256-bin 動作不連續、難多模態；擴散/flow 生成**連續且多模態**動作，flow 還快到能 50Hz 即時控制。對應 [m3](m3-ai-models-comparison.md) 的 Diffusion 那顆 + 挑戰 C。）
- 問：**為何最後走向「階層」？**（答：單一端到端難兼顧「長程語義規劃」與「高頻穩定控制」→ 拆成高層慢想、低層快動。）

**最容易誤會**
- ❌ 以為新典範取代舊的 → ✅ survey 的態度是**疊加共存**：階層模型的低層常常**就是**一個擴散/flow 策略，高層是 VLM。

---

## 3. 帶讀 §IV：分類三軸 ★（這篇的核心，務必讀懂）

survey 用**「動作是怎麼產生的」**把所有 VLA 分三大類。記這張總表：

| 軸 | 一句話 | 怎麼生動作 | 代表 |
|---|---|---|---|
| **A. Sensorimotor（感覺運動，主流）** | 影像+語言**直接**映射到動作 | 端到端：看→直接吐動作 | RT-1/2、OpenVLA、Octo、RDT-1B、π₀、GR00T N1 |
| **B. World Model（世界模型）** | 先**預測未來**（影片/潛在狀態），再反推動作 | 想像下一幀 → 逆動力學求動作 | UniPi、LAPA、GR-1/2、CoT-VLA、DreamGen |
| **C. Affordance（可供性）** | 先預測**「哪裡能操作」**（接觸點/軌跡），再執行 | 語言條件下出 affordance 圖 → 控制 | VoxPoser、CLIPort、RoboPoint、VRB、RT-Affordance |

### 3A. Sensorimotor 再細分七型（這是 survey 最有用的速查表）
按「骨幹（Transformer / VLM）× 動作頭（離散 token / 擴散 / flow / DiT）」交叉分：

| # | 骨幹 + 動作頭 | 代表 | 一句話記憶點 |
|---|---|---|---|
| 1 | Transformer + 離散 token | VIMA, Gato, RT-1 | 最早，從零學，動作切 bin |
| 2 | Transformer + 擴散頭 | **Octo**, TinyVLA | 連續動作、可多模態 |
| 3 | Diffusion Transformer | **RDT-1B**, LBM, Dita | 擴散直接長在 Transformer 裡 |
| 4 | **VLM** + 離散 token | **RT-2, OpenVLA**, ECoT, 3D-VLA | 接網路知識→語義泛化（你動手那顆） |
| 5 | VLM + 擴散頭 | DexVLA, GO-1, HybridVLA | VLM 想、擴散動 |
| 6 | **VLM + flow matching** | **π₀, π₀.₅**, GraspVLA | 衝即時（50Hz） |
| 7 | VLM + Diffusion Transformer（階層） | **GR00T N1**, CogACT, SmolVLA | 高層 VLM＋低層 DiT |

**讀到這裡停一下 ⏸**
- 把你已知的三顆歸位：**RT-2/OpenVLA → 第4型；Diffusion Policy 親戚 Octo → 第2型；π₀ → 第6型**。歸得出來＝你掌握了這張表。
- 問：**World model 為何能解「資料稀缺」？**（答：它能吃**無動作標註的人類影片**——先學「世界會怎麼變」，動作標籤後補。對應挑戰 A。）
- 問：**Affordance 和前兩者差在哪？**（答：它不直接輸出整條動作，而是輸出**「可操作的空間線索」**，把難題拆小、可解釋性高、好接傳統控制。）

**白話比喻**
- **Sensorimotor**＝反射神經：看到就動，端到端。
- **World Model**＝先在腦中放一段「接下來會發生什麼」的小電影，再決定怎麼動。
- **Affordance**＝先在畫面上標「這裡可以抓、這條路可以推」，再讓控制器照標籤執行。

**最容易誤會**
- ❌ 以為三軸互斥 → ✅ 大量模型**跨軸混血**（GR-1 既是 sensorimotor 又含 implicit world model；PPI 同時出現在 world model 與 sensorimotor）。三軸是「主視角」不是硬隔間。

### 3B. 積木（§IV-D 資料模態 + building blocks）——掃過知道「零件庫」即可
- **視覺編碼器**：ResNet / ViT；CLIP·SigLIP·DINOv2（帶語義）；SAM·OWL-ViT·GroundingDINO（物件中心）。→ 對應 [m3-perception-pipeline-diagram.md](m3-perception-pipeline-diagram.md) 的 vision encoder 段。
- **語言/LLM 骨幹**：LLaMA2·Qwen2·Gemma·Phi-2·SmolLM2。
- **動作頭**：離散 256-bin（RT-2/OpenVLA）｜FAST（DCT+BPE 壓 token）｜擴散 DDPM/DDIM｜flow matching（π₀ 50Hz）｜跨形體統一空間（OXE 7-DoF、UniAct codebook）。
- **額外模態**：觸覺（DIGIT、TVL）、聲音（mel-spectrogram、Whisper）、3D（Depth Anything、點雲 PointNet++、NeRF/GS）。

> 速記：**VLA = 視覺編碼器 + LLM 骨幹 + 動作頭**。三軸差在「動作頭/中間表徵」怎麼設計。

---

## 4. 帶讀 §V–§VII：訓練、資料、落地（掃描，記關鍵詞與名字）

**§V 訓練**：監督學習（next-token / 行為克隆，主流）｜自監督（masked image、對比）｜RL（多在 post-training 或階層低層，如 RT-H、HumanoidVLA）。流程＝**Pre-training（大規模通用）→ Post-training（任務微調）→ Inference**。
- ⏸ 問：**為何 BC（監督）是主流但有天花板？**（答：只學示範的平均，遇多模態/分布外就崩 → 這正是 Diffusion/RL 想補的，呼應 [m3-ai-models-comparison.md](m3-ai-models-comparison.md) 的「BC 學成平均」。）

**§VI 資料**：收集＝遙操作 / 人類示範影片 / 模擬生成。指標性資料集——
- **Open X-Embodiment (OXE)**：聚合多機、統一單相機 7-DoF 格式（跨形體的「普通話」）。
- **Ego4D / EPIC-KITCHENS**：人類第一人稱影片（affordance 與 world model 的養分）。
- **RT-1 dataset**：700 任務、13 萬 episode。
- 資料增強：§VI-C（視覺/語言/軌跡擴增）。

**§VII 落地**：機器平台（§VII-A）、評估 benchmark（§VII-B，多為桌面操作模擬/真機任務套件）、真實應用案例（§VII-C）。
- ⏸ 問：**survey 的 benchmark 幾乎都在桌面操作（manipulation）——這對你（UAV）意味什麼？** 見 §5。

---

## 5. 對「你的 UAV 題目」最關鍵的一條啟發（這篇的隱藏重點）

**這是一篇以「機械臂 / 靈巧手操作」為主體的 survey。** 翻遍三軸代表作，幾乎都是桌面 pick-place、開抽屜、疊積木——**空中（UAV/aerial）VLA 近乎缺席**。

**這不是缺點，是你的機會：**
- survey 建立的整套**架構地圖、動作頭設計、訓練/資料方法論**是**通用的**——可以「搬」到 UAV。
- 但**動作空間要重映射**：survey 的 7-DoF 末端增量 → 你的 `TrajectorySetpoint` / body-rate（這正是 [m3-openvla-inference-cheatsheet.md](m3-openvla-inference-cheatsheet.md) §2c 與 [m1-offboard-code-reading.md](m1-offboard-code-reading.md) 的接點，也是 Phase 4 的核心工）。
- **跨形體挑戰（§II-B）對 UAV 尤其尖銳**：地面臂的資料無法直接餵空中。→ 直通你 [Module 4](04-phase4-integration-papers.md) 的 AerialVLN / OpenFly（OpenFly-Agent **就是基於 OpenVLA** 改的 aerial 版）。

> **一句話**：這篇 survey 給你**方法論的全貌**；把它的桌面結論「降落」到空中、把 7-DoF 換成連續飛控指令，就是 [uav-embodied-ai-synthesis](research_output/knowledge_base/uav-embodied-ai-synthesis.md) 那個 starter project 的理論依據。

---

## 6. 分級小考（闔上論文再做；答不出就回對應段）

**🟢 Level 1 · 全貌**
1. survey 的 §II 三大挑戰是哪三個？各自的核心矛盾一句話。
2. §III 演進史：RT-1→RT-2 跨了什麼質變？為何後來轉向 diffusion/flow？
3. §IV 的三軸分類是哪三類？各用「動作怎麼產生」一句話區分。

**🟡 Level 2 · 分類法落地**
4. 把 RT-2、Octo、π₀ 各歸到 sensorimotor 七型的哪一型？
5. World model 類為何能緩解「資料稀缺」？
6. Affordance 類和 sensorimotor 類在「輸出」上差在哪？

**🟡 Level 3 · 工程零件**
7. VLA 的三大積木是什麼？三軸的差異主要落在哪個積木？
8. OXE 資料集解決的是三大挑戰的哪一個？怎麼解？
9. 為何離散 256-bin 動作頭會被擴散/flow 動作頭挑戰？

**🔴 Level 4 · 接你的題目**
10. 這篇 survey 的 benchmark 為何幾乎與你的 UAV 題目「形體不符」？這帶來什麼研究缺口？
11. 要把一個第4型 VLA（OpenVLA）用到無人機，動作頭要怎麼重映射？接到哪幾份既有文件（[M1](m1-offboard-code-reading.md) / [cheat-sheet](m3-openvla-inference-cheatsheet.md) / [Module 4](04-phase4-integration-papers.md)）？

> 對照答案：Q1–3 → 本檔 §1/§2/§3；Q4–6 → §3A 表/§3 停點；Q7–9 → §3B/§4；Q10–11 → §5。
> **能答 1–9 → survey 全貌到位，可接著讀 [RT-2 / OpenVLA / Diffusion Policy](papers-reading-list.md) 精讀；能答 10–11 → 你已把 survey 接回自己的 UAV 主線，可進 [Module 4](04-phase4-integration-papers.md)。**

---

## 7. 5 點筆記（reading-track 要求的標準格式，可直接貼進 [progress-tracker.md](progress-tracker.md)）

1. **問題**：VLA 已多到看不完，且真機落地卡在資料、跨形體、算力三道牆——缺一張統一地圖。
2. **方法**：用**「動作如何產生」三軸**（sensorimotor / world model / affordance）+ sensorimotor 七型細分，把上百模型系統歸類；再橫掃積木、訓練、資料、benchmark。
3. **關鍵設計**：分類軸選在「動作生成方式」而非「應用場景」，因此**對新模型有預測力**（新論文都能歸位）；附**線上可篩選的分類表**。
4. **結果/結論**：給出實務建議（§VIII）與八大未來方向（§IX：模態、推理、持續學習、RL、安全、失敗偵測、評估、應用）。
5. **對我的啟發**：全領域偏**桌面操作**、空中近乏 → UAV-VLA 是缺口；方法論可搬，但**動作空間需重映射成飛控指令**（接 [Phase 4](04-phase4-integration-papers.md) / [synthesis note](research_output/knowledge_base/uav-embodied-ai-synthesis.md)）。

---

## 8. 想更主動學？這樣用我（Claude Code）

- **陪讀某段**：「帶我逐段讀 §IV-B world model，每講完一型問我一題。」
- **歸位練習**：「我念一個 VLA 模型名，你考我它屬三軸哪一類、sensorimotor 第幾型。」
- **對照精讀**：「把這篇 survey 對 π₀ 的描述，和 [m3-ai-models-comparison.md](m3-ai-models-comparison.md) 的 Diffusion 那顆做差異對照。」
- **接題目**：「用 §IX 的八個方向，幫我篩出 1–2 個能在 1–2 個月用 PX4 SITL 做出雛形的 UAV-VLA 小題。」
- **出題**：「用本檔 §6 的 Level 4 考我，我答你批改。」

➡️ 同模組：[m3-ai-models-comparison.md](m3-ai-models-comparison.md)｜[openvla cheat-sheet](m3-openvla-inference-cheatsheet.md)｜[perception pipeline](m3-perception-pipeline-diagram.md)｜清單 [papers-reading-list.md](papers-reading-list.md)｜往下接 [Module 4 / Phase 4](04-phase4-integration-papers.md)｜回 [reading-track](reading-track.md)·[README](README.md)
