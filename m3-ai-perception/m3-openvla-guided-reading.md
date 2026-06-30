# 🧭 帶讀筆記 · OpenVLA（Kim et al., CoRL 2024）★動手主力

> 帶讀對象：**論文本身**——《OpenVLA: An Open-Source Vision-Language-Action Model》。
> 連結：[arXiv:2406.09246](https://arxiv.org/abs/2406.09246)｜[專案頁](https://openvla.github.io/)｜[GitHub](https://github.com/openvla/openvla)
> 模組定位：[reading-track.md](reading-track.md) Module 3 **動手主力**。先讀 [RT-2 帶讀](m3-rt2-guided-reading.md)（概念）再讀本篇（落地）。
> 難度 🟡。對應精簡卡 [m3-ai-models-comparison.md](m3-ai-models-comparison.md) §1c；**程式怎麼跑** 見姊妹篇 [m3-openvla-inference-cheatsheet.md](m3-openvla-inference-cheatsheet.md)。

---

## 0. 先抓主線：這篇在補 RT-2 的「能不能動手」

> RT-2 證明 VLA 可行但**閉源、55B、跑不動**。OpenVLA 的賭注：**做一個 7B、開源、消費級 GPU 就能微調/推論的 VLA，且效果還要贏更大的閉源模型。**

```
RT-2：概念贏，但你碰不到
OpenVLA：7B 開源 + LoRA 微調 + 量化推論 → 你真的能動手的那一顆
證據：7B 在通用操作上勝 RT-2-X(55B)，參數少 7×
```

**一句話定位**：OpenVLA＝**「能動手的 RT-2」**。它把 VLA 從「論文展示」變成「你筆電/單卡能玩」的工具。讀它的重點不是新觀念，而是**它怎麼把規模壓下來還更強**，以及**輸出長什麼樣（你接 UAV 要重映射的那個東西）**。

**建議讀法（純讀約 60 分）**：摘要+架構圖(20分) → 訓練資料與動作離散化(20分) → 實驗+效率(LoRA/量化)(15分) → 本檔 §6 小考(5分)。

---

## 1. 帶讀 ①：底座架構（Prismatic VLM）

OpenVLA ≈ 7B，底座是 **Prismatic VLM**：
- **語言**：Llama 2 7B。
- **視覺**：**DINOv2 + SigLIP 雙編碼器融合**——DINOv2 給**空間/幾何**特徵、SigLIP 給**語義**特徵，拼起來兼顧「在哪」和「是什麼」。
- **Projector**：MLP 把視覺特徵投影到 LLM token 空間。

**讀到這裡停一下 ⏸**
- 問：**為何用兩個視覺編碼器而不是一個 CLIP？**（答：操作既要「認得物件語義」也要「精準定位」；SigLIP 強語義、DINOv2 強空間，互補 → 抓取更準。）
- 對照 [m3-ai-models-comparison.md](m3-ai-models-comparison.md) §3a 的 VLM 三段式：vision encoder → projector → LLM。OpenVLA 就是這張圖，只是 vision encoder 是「兩顆併聯」。

**白話比喻**：請兩個眼科專家——一個專看「這是什麼東西」（SigLIP），一個專看「它在畫面哪個位置、什麼形狀」（DINOv2）——兩份報告合起來再交給大腦（Llama2）決策。

---

## 2. 帶讀 ②：動作離散化 + 訓練資料（沿用 RT-2 的招）

- **動作表示**：和 RT-2 同路——每個動作維度**離散成 256 bin**，**覆寫 Llama 詞表中最少用的 256 個 token**。於是動作預測＝語言預測，整套 LLM 機制復用。
- **訓練資料**：**Open X-Embodiment 約 97 萬條** episode（多機聚合、統一 7-DoF 格式）。

**讀到這裡停一下 ⏸**
- 問：**「覆寫最少用 token」是什麼意思？為何不新增 token？**（答：直接借詞表裡幾乎用不到的 256 個位置當「動作詞」，不動模型結構、最省事，預訓練權重照用。）
- 問：OXE 解決三大挑戰的哪一個？（答：**跨形體轉移**——統一動作空間讓多種機器人的資料能一起訓，見 [VLA Survey 帶讀](m3-vla-survey-guided-reading.md) §1 挑戰 B。）

**最容易誤會**
- ❌ 以為 OpenVLA 輸出絕對位姿或馬達指令 → ✅ 輸出 **7-DoF 末端增量** [Δx,Δy,Δz,Δroll,Δpitch,Δyaw,gripper]，且是**正規化值**，要用 `unnorm_key` 反正規化（見 [cheat-sheet](m3-openvla-inference-cheatsheet.md) §2c）。

---

## 3. 帶讀 ③：效率與結果（OpenVLA 真正的賣點）

- **參數高效微調**：**LoRA** 在單張消費級/A100 級 GPU 即可微調到新任務。
- **量化推論**：支援 **4/8-bit**，降記憶體、可上較小硬體。
- **效果**：在通用操作上以 **7× 更少參數**勝過 **RT-2-X(55B)**。

**讀到這裡停一下 ⏸**
- 問：**為何「能 LoRA 微調 + 量化」對你（設備受限）特別重要？**（答：這就是 [reading-track.md](reading-track.md) 純讀路線裡「☁️ 免費 Colab GPU 跑 inference」可行的原因——它小到玩得動。）

**讀完該能答**：口述 OpenVLA 相對 RT-2 的四個賣點——**開源 / 7B / LoRA 可微調 / 量化推論**，外加「輸出是 7-DoF 末端增量」。

---

## 4. 對「你的 UAV 題目」的啟發（最關鍵的接口）

- OpenVLA 是**機械臂 7-DoF** 模型。要驅動無人機，必須把**動作頭重映射**到 `TrajectorySetpoint`（位置/速度）或 body-rate——這正是 [m3-openvla-inference-cheatsheet.md](m3-openvla-inference-cheatsheet.md) §2c 與 [m1-offboard-code-reading.md](m1-offboard-code-reading.md) 的銜接點，也是 **Phase 4 的核心工**。
- 前沿參考：**OpenFly-Agent 就是基於 OpenVLA** 改的 aerial 版（見 [papers-reading-list.md](papers-reading-list.md) §F、[Module 4](04-phase4-integration-papers.md)）——別人已經這樣搬過，你有範本。

---

## 5. 5 點筆記（可貼進 [progress-tracker.md](progress-tracker.md)）

1. **問題**：當紅 VLA 多閉源難客製，缺一個開源、消費級可微調的 VLA。
2. **方法**：7B，底座 Prismatic VLM（**Llama2 + DINOv2 + SigLIP**），用 **OXE ~97 萬** episode 訓練。
3. **關鍵設計**：動作 **256-bin 離散**覆寫最少用 token；**LoRA** 單卡微調；**4/8-bit 量化**推論。
4. **結果**：以 **7× 更少參數**勝 RT-2-X(55B)；參數高效微調表現強。
5. **對我的啟發**：動手主力；輸出 7-DoF 末端增量，**接 UAV 要重映射到 setpoint/rate**（接 [M1](m1-offboard-code-reading.md)）。

---

## 6. 分級小考（闔上論文再做）

**🟢 觀念** 1. OpenVLA 相對 RT-2 的四個賣點？ 2. 為何用 DINOv2+SigLIP 雙視覺編碼器？
**🟡 機制** 3. 動作怎麼變成 token？「覆寫最少用 token」什麼意思？ 4. OXE 解決三大挑戰哪一個？
**🟡 輸出** 5. `predict_action` 回傳的 7 維是什麼？是絕對位姿嗎？需要什麼後處理？
**🔴 接題** 6. 要把 OpenVLA 用到無人機，動作頭怎麼接？接到哪些既有文件？

> 對照：Q1–2 → §1/§3；Q3–4 → §2；Q5 → §2 + [cheat-sheet](m3-openvla-inference-cheatsheet.md)；Q6 → §4。能答 1–5 → 進 [Diffusion Policy 帶讀](m3-diffusion-policy-guided-reading.md)；能答 6 → 看見 Phase 4 接口。

---

## 7. 想更主動學？這樣用我（Claude Code）

- **陪讀 repo**：「帶我逐段看 OpenVLA 官方 minimal inference 範例，每段解釋在幹嘛。」（接 [cheat-sheet](m3-openvla-inference-cheatsheet.md)）
- **追問**：「DINOv2 和 SigLIP 的特徵到底差在哪？用一張無人機視角圖舉例。」
- **接題**：「幫我設計把 OpenVLA 7-DoF 動作頭重映射成 `TrajectorySetpoint` 的最小方案。」
- **出題**：「用本檔 §6 Level 4 考我，我答你批改。」

➡️ 同模組：[RT-2](m3-rt2-guided-reading.md)（概念前傳）｜[VLA Survey](m3-vla-survey-guided-reading.md)（全貌）｜程式 [cheat-sheet](m3-openvla-inference-cheatsheet.md)｜下一篇 [Diffusion Policy](m3-diffusion-policy-guided-reading.md)
