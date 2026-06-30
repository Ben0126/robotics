# 🧭 帶讀筆記 · Diffusion Policy（Chi et al., RSS 2023 / IJRR 2024）

> 帶讀對象：**論文本身**——《Diffusion Policy: Visuomotor Policy Learning via Action Diffusion》。
> 連結：[arXiv:2303.04137](https://arxiv.org/abs/2303.04137)｜[專案頁](https://diffusion-policy.cs.columbia.edu/)
> 模組定位：[reading-track.md](reading-track.md) Module 3（W6）。**生成式策略的奠基作**；和你 NotebookLM「Generative RL & Flow Policy」主題直接接軌。
> 難度 🟡。對應精簡卡 [m3-ai-models-comparison.md](m3-ai-models-comparison.md) §1d。

---

## 0. 先抓主線：這篇在解一個 BC 的老毛病

> **「同一個畫面有好幾種合理動作（多模態），一般行為克隆（BC）會把它們平均成一個爛動作。Diffusion Policy 用『生成』取代『回歸』，所以不會平均。」**

```
BC：觀測 → 直接回歸「一個」動作 → 多模態時學成平均（繞左+繞右 = 直直撞上）
Diffusion Policy：觀測為條件 → 從噪聲「多步去噪」生出「一段」動作序列 → 保留多模態
代價：去噪要跑多步 → 推論延遲
```

**一句話定位**：把「產生動作」當成**條件式影像生成**那一套（擴散模型）搬到控制。贏在**多模態 + 訓練穩 + 高維動作序列**；輸在**推論慢**。讀它要想通三個設計：**條件去噪、action chunking、receding horizon**。

**建議讀法（純讀約 70 分）**：摘要+方法圖(25分) → 三個關鍵設計(25分) → 實驗(15分) → 本檔 §6 小考(5分)。擴散數學細節（DDPM/DDIM）掃過即可，抓「加噪→學去噪→反向採樣」的直覺。

---

## 1. 帶讀 ①：為什麼 BC 會崩、擴散為何不會（最該想通）

**讀到這裡停一下 ⏸**
- 問：**多模態為什麼讓 BC 崩？**（答：BC 用 MSE 回歸，數學上會逼近**所有合理動作的平均**；兩個對的解平均出來常是**錯的**——繞左/繞右平均成正中撞上。）
- 問：**擴散為何能保留多模態？**（答：它**取樣**自一個分布，而不是回歸到分布的均值；分布有兩個峰，採樣就會落在某一個峰，不是峰間。）

**白話比喻**：問「從台北到台中走哪條路」，BC 給你「兩條路的平均座標」＝**掉進田裡**；Diffusion 是**隨機抽一條完整可行的路**給你。

---

## 2. 帶讀 ②：三個關鍵設計

| 設計 | 在幹嘛 | 為何重要 |
|---|---|---|
| **Visual conditioning** | 把觀測（影像+本體狀態）**注入去噪網路**當條件 | 讓生成的動作「看圖說話」，不是亂生 |
| **Action chunking** | 一次生**一段動作序列**（horizon），不是單步 | 時間上連貫、減少抖動與累積誤差 |
| **Receding horizon** | 生一段、**只執行前幾步**，再用新觀測重生 | 兼顧「序列連貫」與「對環境變化反應」 |

骨架有 **CNN 版**與 **Transformer 版**兩種；訓練用 DDPM 式加噪/去噪，推論可用 DDIM 加速。

**讀到這裡停一下 ⏸**
- 問：**只生一段、卻只執行前幾步，不是浪費？**（答：這是 receding horizon 的精髓——保留「重新規劃」的彈性，環境變了就用新觀測重生，避免硬執行過時的長序列。和 MPC 的滾動視野同理，呼應 [m2-cascade-control-diagram.md](m2-cascade-control-diagram.md) 的控制思路。）

**白話比喻**：導航 app 一次算好接下來 2 公里路線（chunk），但你只開前 500 公尺就重新定位重算（receding horizon）——路況變了也跟得上。

---

## 3. 帶讀 ③：結果與代價

- **結果**：在大量接觸密集/多模態操作任務上**顯著超越 BC 基線**，且訓練穩定、好擴展到高維動作。
- **代價**：去噪**多步** → **推論延遲高**；要**專家示範資料**（監督式，BC 的升級版，非無資料）。

**最容易誤會**
- ❌ 以為 Diffusion Policy 是 RL → ✅ 它是**監督式**（從專家示範學），不靠 reward 試錯。
- ❌ 以為它即時 → ✅ **多步去噪偏慢**；用在高動態 UAV 要算「即時性 vs 多模態表現」帳。
- ❌ 把 action chunk 當成「執行整段」→ ✅ **只執行前幾步**（receding horizon）。

**讀完該能答**：口述「為何 BC 多模態會崩、擴散為何不會」＋三個關鍵設計各一句。

---

## 4. 對「你的 UAV 題目」的啟發

- 多模態動作的解法很漂亮，但**推論延遲**對高動態飛行是硬傷——適合**接觸密集的慢操作**（如空中機械臂作業），不適合 FPV 競速那種毫秒級反應（那是 [Swift 帶讀](m3-swift-guided-reading.md) 的地盤）。
- Diffusion/flow 動作頭是當代 VLA 的主流之一（π₀ 用 flow matching 把它加速到 50Hz）——理解本篇＝理解 [VLA Survey 帶讀](m3-vla-survey-guided-reading.md) §3 為何從離散 token 轉向擴散/flow。
- 接你 NotebookLM 的 DPPO/D²PPO/ReinFlow 主題：那些是**用 RL 微調擴散/flow 策略**，本篇是它們的「被微調對象」。

---

## 5. 5 點筆記（可貼進 [progress-tracker.md](progress-tracker.md)）

1. **問題**：BC 回歸單一動作，遇多模態（多個合理動作）會學成平均而崩。
2. **方法**：把產生動作當成**條件式去噪擴散**——以觀測為條件，從噪聲生成一段動作序列。
3. **關鍵設計**：**visual conditioning** + **action chunking** + **receding horizon**；CNN/Transformer 雙骨架；天然處理多模態、訓練穩。
4. **結果**：大量操作任務顯著超越 BC；代價是去噪多步、**推論延遲高**。
5. **對我的啟發**：多模態漂亮但慢；適合慢操作，不適合高動態 UAV；是 π₀ 等 flow VLA 的前身。

---

## 6. 分級小考（闔上論文再做）

**🟢 觀念** 1. BC 為何在多模態下會崩？ 2. 擴散為何能保留多模態？
**🟡 設計** 3. 三個關鍵設計各在解什麼？ 4. receding horizon 為何只執行前幾步？
**🟡 定位** 5. Diffusion Policy 是監督還是 RL？資料需求是什麼？
**🔴 接題** 6. 為何它不適合 FPV 競速？該由哪個典範接手？π₀ 怎麼補它的短板？

> 對照：Q1–2 → §1；Q3–4 → §2；Q5 → §3；Q6 → §4 + [Swift](m3-swift-guided-reading.md)/[VLA Survey](m3-vla-survey-guided-reading.md)。

---

## 7. 想更主動學？這樣用我（Claude Code）

- **陪讀**：「用一個 2D 玩具（繞障礙左/右）示範 BC 平均崩掉、擴散採樣不崩。」
- **追問**：「DDPM 訓練和 DDIM 推論差在哪？為何 DDIM 能加速？」
- **對照**：「把 Diffusion Policy 和 π₀ 的 flow matching 動作頭做即時性對照。」
- **出題**：「用本檔 §6 Level 4 考我。」

➡️ 同模組：[VLA Survey](m3-vla-survey-guided-reading.md)｜[RT-2](m3-rt2-guided-reading.md)｜[OpenVLA](m3-openvla-guided-reading.md)｜下一篇（換 RL 軸）[Swift](m3-swift-guided-reading.md)｜精簡卡 [m3-ai-models-comparison.md](m3-ai-models-comparison.md)
