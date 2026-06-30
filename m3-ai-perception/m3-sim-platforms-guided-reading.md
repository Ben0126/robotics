# 🧭 帶讀筆記 · OmniDrones / Aerial Gym（W6 模擬平台，讀文件不訓練）

> 帶讀對象：**兩個 GPU 並行無人機 RL 模擬器的文件/論文**（不是讀演算法，是讀「怎麼用、客製改哪裡」）。
> - **OmniDrones**（Xu et al.）：[arXiv:2309.12825](https://arxiv.org/abs/2309.12825)｜[docs](https://omnidrones.readthedocs.io/)｜[GitHub](https://github.com/btx0424/OmniDrones)
> - **Aerial Gym**（Kulkarni, Rehberg, Alexis, RA-L 2025）：[doi:10.1109/LRA.2025.3548507](https://doi.org/10.1109/LRA.2025.3548507)｜[網站](https://ntnu-arl.github.io/aerial_gym_simulator/)
> 模組定位：[reading-track.md](reading-track.md) Module 3（W6）動手入口；無 GPU 時**精讀 reward/config 怎麼寫**即可。難度 🟡。對應精簡卡 [m3-ai-models-comparison.md](m3-ai-models-comparison.md) §1g。

---

## 0. 先抓主線：讀這兩個文件要拿到什麼

> **不是讀理論，是讀「一個 RL 任務在程式上由哪幾塊組成、要客製化改哪裡」。**

```
兩個平台共通骨架：task（任務） + config（設定） + reward（獎勵）
GPU 並行：數百~數千環境同時跑 → 10⁵ 級 FPS → RL 樣本效率暴增
你的產出物：看懂「要新增一個 UAV 任務，改哪三塊」
```

**一句話定位**：這兩個是把 [Swift 帶讀](m3-swift-guided-reading.md)/[High-Speed Flight 帶讀](m3-high-speed-flight-guided-reading.md) 的 RL 概念**真的跑起來**的入口。Isaac 系（OmniDrones on Isaac Sim、Aerial Gym on Isaac Gym），靠 GPU 大規模並行把「sim 互動很慢」這個 RL 痛點打掉。

**建議讀法（純讀約 50 分）**：各看 README/docs 的 quickstart + 一個範例 task(各 20分) → 對照 task/config/reward 三塊(10分)。

---

## 1. 帶讀 ①：為何要「GPU 並行模擬器」

RL 最吃**環境互動次數**。傳統 CPU 模擬器一次跑一個環境 → 慢。Isaac 系在 **GPU 上同時跑數百~數千個環境**，FPS 衝到 **10⁵ 級**。

**讀到這裡停一下 ⏸**
- 問：**並行為何能加速 RL？**（答：RL 要海量試錯；一次收集數千環境的經驗，等於把「練幾萬次」的牆時間壓掉幾個數量級——這正是 [VLA Survey 帶讀](m3-vla-survey-guided-reading.md) §1 挑戰 C「算力/樣本」的工程解法之一。）
- 兩者差異：**OmniDrones**（Isaac Sim，TorchRL，benchmark 多：懸停→過驅追蹤）；**Aerial Gym**（Isaac Gym，數千並行 + GPU 幾何控制器，motor 政策 <1 分鐘、視覺導航 <1 小時可訓出）。

**白話比喻**：CPU 模擬＝一條跑道一次練一台；GPU 並行＝**一千條跑道同時練一千台**，學得快一千倍。

---

## 2. 帶讀 ②：一個 RL 任務的三塊（客製化的核心）

無論哪個平台，**要客製一個任務，就改這三處**：

| 區塊 | 管什麼 | 客製時你會改 |
|---|---|---|
| **task** | 任務邏輯：觀測空間、動作空間、重置條件、成功判定 | 機器人觀測哪些量、輸出什麼動作、何時 reset |
| **config** | 設定：機體參數、感測器、**domain randomization**、並行數 | 質量/風/延遲隨機化、相機/深度設定、env 數 |
| **reward** | 獎勵函式：怎麼算「飛得好」 | 距離目標、平滑度、碰撞懲罰、能耗等加權 |

**讀到這裡停一下 ⏸**
- 問：**reward 為何最難寫？**（答：reward shaping 是 RL 成敗關鍵——設不好策略會「鑽漏洞」（reward hacking）。這正是 [m3-ai-models-comparison.md](m3-ai-models-comparison.md) 對照表說 RL 缺點「reward 難設」的具體所在。）
- 問：**config 裡的 domain randomization 接到哪個概念？**（答：[Swift 帶讀](m3-swift-guided-reading.md) §2 的 sim-to-real——這裡就是你「動手設定隨機化」的地方；Swift 提醒你「精準校正 > 暴力隨機」。）

**白話比喻**：task＝**考題**（要解什麼）、config＝**考場條件**（風大不大、儀器準不準）、reward＝**評分標準**（怎麼算高分）。改任務就是改這三張紙。

---

## 3. 對「你的 UAV 題目」的啟發

- 這是把 **RL/sim-to-real 概念落地**的入口：無 GPU 時先**精讀一個範例 task 的 reward 怎麼寫**，理解「要客製改哪三塊」就達成 Module 3 的理解產出物。
- 接 Phase 4 starter project：把 [synthesis note](research_output/knowledge_base/uav-embodied-ai-synthesis.md) 的「離散 aerial VLN 動作 → 連續 `TrajectorySetpoint`」設計成一個 **task + reward**，等有雲端 GPU（RunPod/vast.ai/Lambda）再實跑。
- sim-to-real 銜接：用這裡訓 + **PX4 SITL** 驗證，是縮 aerial 模擬-現實差距的可行路線（[papers-reading-list.md](papers-reading-list.md) §研究缺口）。

---

## 4. 5 點筆記（平台版；可貼進 [progress-tracker.md](progress-tracker.md)）

1. **是什麼**：Isaac 系 **GPU 並行**多旋翼 RL 模擬器（OmniDrones / Aerial Gym），數百~數千環境並行、10⁵ 級 FPS。
2. **為何用**：用大規模並行打掉 RL「sim 互動慢」的痛點，大幅提升樣本/牆時間效率。
3. **程式骨架**：一個任務 = **task + config + reward** 三塊；客製化＝改這三處。
4. **差異**：OmniDrones（Isaac Sim, TorchRL, benchmark 豐富）vs Aerial Gym（Isaac Gym, 數千並行 + GPU 幾何控制器, 訓練極快）。
5. **對我的啟發**：把概念跑起來的入口；無 GPU 先讀 reward/config；接 Phase 4 把「連續 setpoint 動作」寫成 task + reward。

---

## 5. 分級小考（闔上文件再做）

**🟢 觀念** 1. GPU 並行為何能加速 RL？ 2. OmniDrones 和 Aerial Gym 各建在哪個 Isaac 上？
**🟡 客製** 3. 一個 RL 任務由哪三塊組成？要新增任務各改什麼？ 4. reward 為何最難寫？舉一個 reward hacking 例子。
**🟡 sim2real** 5. config 的 domain randomization 接到哪篇論文的概念？Swift 對它的提醒是什麼？
**🔴 接題** 6. 把「離散 aerial VLN 動作 → 連續 `TrajectorySetpoint`」設計成 task + reward，你會怎麼定觀測/動作/獎勵？

> 對照：Q1–2 → §1；Q3–4 → §2；Q5 → §2 + [Swift](m3-swift-guided-reading.md)；Q6 → §3 + [synthesis note](research_output/knowledge_base/uav-embodied-ai-synthesis.md)。

---

## 6. 想更主動學？這樣用我（Claude Code）

- **陪讀 repo**：「帶我看 OmniDrones 一個範例 task 的原始碼，逐塊指出哪是 task/config/reward。」
- **設計**：「幫我把『定點懸停 + 避障』寫成一份 reward 函式草稿，並解釋每一項。」
- **對照**：「OmniDrones vs Aerial Gym，我要訓視覺導航該選哪個？列取捨。」
- **出題**：「用本檔 §5 Level 4 考我設計 task + reward。」

➡️ 同模組：[Swift](m3-swift-guided-reading.md)·[High-Speed Flight](m3-high-speed-flight-guided-reading.md)（RL 概念）｜[VLA Survey](m3-vla-survey-guided-reading.md)｜接 [Phase 4](04-phase4-integration-papers.md) / [synthesis note](research_output/knowledge_base/uav-embodied-ai-synthesis.md)｜精簡卡 [m3-ai-models-comparison.md](m3-ai-models-comparison.md)
