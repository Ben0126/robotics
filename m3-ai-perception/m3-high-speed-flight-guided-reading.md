# 🧭 帶讀筆記 · Learning High-Speed Flight in the Wild（Loquercio et al., **Science Robotics** 2021）

> 帶讀對象：**論文本身**——《Learning High-Speed Flight in the Wild》。
> 連結：[arXiv:2110.05113](https://arxiv.org/abs/2110.05113)｜Science Robotics 6(59), 2021。
> 模組定位：[reading-track.md](reading-track.md) Module 3（W6）。與 [Swift 帶讀](m3-swift-guided-reading.md) 對照讀——**兩種 sim-to-real 哲學**。
> 難度 🟡。對應精簡卡 [m3-ai-models-comparison.md](m3-ai-models-comparison.md) §1f。

---

## 0. 先抓主線：這篇證明的事

> **「在未知野外高速避障，不靠『建圖→規劃』，用端到端網路把『深度+狀態』直接映射成『無碰撞軌跡』；只在 sim 訓、zero-shot 上真機。」**

```
痛點：未知野外高速飛，傳統「先建圖再規劃」延遲太高、累積誤差大
解法：端到端 網路：深度圖 + 狀態 → 直接輸出無碰撞軌跡(waypoints)
怎麼學得好又能上真機：privileged learning（teacher 有上帝視角，student 模仿）
只在 sim 訓 → zero-shot 直接上真機 → 森林/建物間 ~10 m/s 穿越
```

**一句話定位**：和 Swift 並列「sim-to-real 旗艦」，但走**另一條路**——Swift 是「RL + 校正 sim」，本篇是**「端到端模仿 + privileged learning + 抽象感知（深度）」**。讀它要想通：**為何用深度當輸入、teacher-student 怎麼運作、為何能 zero-shot**。

**建議讀法（純讀約 55 分）**：摘要+方法圖(20分) → privileged learning 段(20分) → 實驗(10分) → 本檔 §6 小考(5分)。

---

## 1. 帶讀 ①：為何端到端、為何用「深度」當輸入

傳統「建圖→規劃→控制」在高速時：建圖延遲、地圖有誤差、規劃跟不上 → 容易撞。本篇**跳過顯式地圖**，網路直接吃感知、吐軌跡。

關鍵：輸入用**深度圖（depth）**而非原始 RGB。

**讀到這裡停一下 ⏸**
- 問：**為何用深度而不是 RGB？**（答：深度是**抽象、跨域不變**的表徵——森林/建物/不同光照下，「障礙物多遠」比「像素長相」穩定得多 → 大幅縮 sim-to-real gap。這是它能 zero-shot 的關鍵之一。）
- 問：**輸出是軌跡還是馬達？**（答：**無碰撞軌跡（waypoints）**，再交給下層控制器執行——和 OpenVLA 出「末端增量」一樣，落地都要接回 `TrajectorySetpoint`，見 [m1-offboard-code-reading.md](m1-offboard-code-reading.md)。）

**白話比喻**：不背整張地圖再算路（慢），而是**像人開快車**——眼睛掃一下「前面多遠有東西」（深度），反射性地選一條能過的線（軌跡）。

---

## 2. 帶讀 ②：Privileged Learning（teacher-student，這篇精華）

直接讓「只有機載感測的 student」學最優策略很難。本篇拆成兩段：

| 角色 | 看得到什麼 | 學什麼 |
|---|---|---|
| **Teacher（特權）** | **完整狀態 + 完整地圖**（sim 裡的上帝視角） | 用特權資訊算出**接近最優**的避障軌跡 |
| **Student（部署）** | **只有機載感測**（深度+狀態） | **模仿 teacher** 的輸出 |

部署時只用 student（沒上帝視角也能跑）。

**讀到這裡停一下 ⏸**
- 問：**為何不直接訓 student、要繞一個 teacher？**（答：student 的觀測**不完整**，直接學最優很難收斂；teacher 用完整資訊**先學會「正確答案」**，student 只要**模仿**這個現成答案 → 學習目標明確、好收斂。）
- 問：這和 [Swift 帶讀](m3-swift-guided-reading.md) 的 sim-to-real 有何不同？（答：Swift＝RL + 校正 sim 縮 gap；本篇＝**監督式模仿 + 抽象感知(深度)** 讓 gap 天生就小 → zero-shot。兩種互補哲學。）

**白話比喻**：teacher＝**有完整答案卷的學霸**（上帝視角），student＝**只能看考卷的考生**；先讓學霸寫出標準答案，考生照著學「同樣題型該怎麼答」，比讓考生自己摸索快得多。

---

## 3. 帶讀 ③：結果與邊界

- **結果**：在森林/建物之間以最高 **~10 m/s** 無地圖、無碰撞穿越；sim-only 訓練 **zero-shot** 上真機。
- **邊界**：避障導航（不是任務操作）；深度品質影響表現；極限速度仍有上限。

**最容易誤會**
- ❌ 以為 student 訓練時也用機載感測學 → ✅ student **模仿 teacher 的輸出**（teacher 用特權資訊），這才是 privileged learning 的核心。
- ❌ 以為輸出馬達指令 → ✅ 輸出**軌跡**，下層另有控制器。
- ❌ 以為靠大量真機資料 → ✅ **sim-only + zero-shot**，繞過「真機標註貴」。

**讀完該能答**：口述「為何用深度」＋「teacher-student 各看什麼、學什麼」。

---

## 4. 對「你的 UAV 題目」的啟發

- **抽象感知是 sim-to-real 的捷徑**：用深度/語義這類跨域不變表徵，gap 天生小——你若做 aerial VLN，可考慮餵「深度/語義」而非原始 RGB 給策略。
- **privileged learning 繞過貴標註**：sim 裡有上帝視角當 teacher，是資源受限者的好招。
- **輸出軌跡 → 接 setpoint**：和 OpenVLA 一樣，端到端輸出仍要落到 `TrajectorySetpoint`（[m1-offboard-code-reading.md](m1-offboard-code-reading.md)）——再次印證「動作頭重映射」是 UAV 落地的共通工。

---

## 5. 5 點筆記（可貼進 [progress-tracker.md](progress-tracker.md)）

1. **問題**：未知野外高速避障，傳統「建圖→規劃」太慢，能否端到端？
2. **方法**：端到端網路把**深度+狀態 → 無碰撞軌跡**；用 **privileged learning**（teacher 上帝視角，student 機載模仿）；**sim-only → zero-shot**。
3. **關鍵設計**：以**深度**做跨域不變的感知抽象；teacher-student 特權學習。
4. **結果**：森林/建物間最高 ~10 m/s 無地圖穿越，zero-shot sim2real。
5. **對我的啟發**：抽象感知 + privileged learning 是縮 gap、省標註的好招；輸出軌跡仍要接回 setpoint。

---

## 6. 分級小考（闔上論文再做）

**🟢 觀念** 1. 為何跳過顯式建圖、端到端？ 2. 為何用深度而非 RGB 當輸入？
**🟡 機制** 3. teacher 和 student 各看到什麼、各學什麼？ 4. 為何不直接訓 student？
**🟡 落地** 5. 輸出是軌跡還是馬達？要怎麼接到 PX4？
**🔴 對照** 6. 本篇和 [Swift](m3-swift-guided-reading.md) 的 sim-to-real 哲學差在哪？各適合什麼場景？

> 對照：Q1–2 → §1；Q3–4 → §2；Q5 → §1 + [m1](m1-offboard-code-reading.md)；Q6 → §2 + [Swift](m3-swift-guided-reading.md)。

---

## 7. 想更主動學？這樣用我（Claude Code）

- **陪讀**：「帶我讀本篇 method，逐步解釋 teacher policy 怎麼用特權資訊算最優。」
- **追問**：「為何深度比 RGB 更 sim-to-real friendly？舉模擬 vs 真實的例子。」
- **對照**：「把 privileged learning 和一般 imitation learning / DAgger 的差別講清楚。」
- **出題**：「用本檔 §6 Level 4 考我。」

➡️ 同模組：[Swift](m3-swift-guided-reading.md)（另一種 sim2real）｜[Diffusion Policy](m3-diffusion-policy-guided-reading.md)｜平台 [OmniDrones/Aerial Gym](m3-sim-platforms-guided-reading.md)｜落地 [M1](m1-offboard-code-reading.md)
