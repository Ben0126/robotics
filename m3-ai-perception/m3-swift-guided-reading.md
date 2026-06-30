# 🧭 帶讀筆記 · Swift（Kaufmann et al., **Nature** 2023）★旗艦

> 帶讀對象：**論文本身**——《Champion-level drone racing using deep reinforcement learning》。
> 連結：[doi:10.1038/s41586-023-06419-4](https://doi.org/10.1038/s41586-023-06419-4)（Nature 620, 982–987）
> 模組定位：[reading-track.md](reading-track.md) Module 3（W6）**必讀旗艦**；也對照 [Module 2 級聯控制](m2-cascade-control-diagram.md)（它的輸出直打最內角速度環）。
> 難度 🟡。對應精簡卡 [m3-ai-models-comparison.md](m3-ai-models-comparison.md) §1e。

---

## 0. 先抓主線：這篇證明的事

> **「只用機載感測（onboard）、在模擬器用 RL 訓練的無人機，能在 FPV 競速打贏人類世界冠軍。」**——首次達到冠軍級。

```
痛點：高速 FPV 競速 = 極限動態 + 毫秒級反應，傳統「建圖→規劃→控制」太慢
Swift 的解法：感知模組估狀態 → RL 策略直接出「推力+角速度」(CTBR)
關鍵：用「經驗噪聲/殘差模型」校正 sim，縮 sim-to-real gap
結果：擊敗多位人類世界冠軍
```

**一句話定位**：Swift 是**「sim 練、實機飛」RL 的旗艦**。它的精華不在「RL 很強」，而在**怎麼讓 sim 訓的策略真的能上實機**——答案是「對誤差來源建模」而非暴力隨機化。讀它要分清**兩個模組**（感知 vs 控制策略）和**一個招**（殘差噪聲模型）。

**建議讀法（純讀約 60 分）**：摘要+系統圖(20分) → 感知/策略兩模組(20分) → sim-to-real 那段(15分) → 本檔 §6 小考(5分)。

---

## 1. 帶讀 ①：系統＝感知模組 + RL 策略（兩塊別混）

Swift 不是純端到端黑箱，是**混搭**：
- **感知模組（傳統+學習）**：**VIO（視覺慣性里程計）+ 閘門偵測 CNN** → 融合出**狀態估測**（無人機位姿、閘門相對位置）。
- **控制策略（RL）**：吃狀態估測，輸出 **CTBR（Collective Thrust + Body Rates，集體推力 + 三軸角速度）**。

**讀到這裡停一下 ⏸**
- 問：**為何不純端到端、要保留傳統感知？**（答：把「估狀態」這個有成熟解的子問題交給 VIO/CNN，RL 只專心學「怎麼飛得快」——降低學習難度、更穩。這就是 [m3-ai-models-comparison.md](m3-ai-models-comparison.md) 說的「真系統常混搭」。）
- 問：**輸出 CTBR 接到飛控哪一層？**（答：**最內的角速度環**——對照 [m2-cascade-control-diagram.md](m2-cascade-control-diagram.md)：位置→速度→姿態→**角速度**，Swift 直接餵最內環，所以反應最快。也呼應 [m1-dataflow-diagram.md](m1-dataflow-diagram.md) 的 `body_rate` 入口。）

**白話比喻**：感知模組＝**儀表+GPS**（告訴你「我在哪、閘門在哪」）；RL 策略＝**老練的賽車手**（看儀表瞬間決定油門和轉向）。Swift 沒讓賽車手自己造儀表，只訓他開。

---

## 2. 帶讀 ②：sim-to-real gap 怎麼縮（這篇真正的貢獻）

模擬器再準也和真機有落差（空氣動力、延遲、感測噪聲）。Swift 不用暴力 domain randomization，而是：

> **用少量真機飛行資料，學一個「殘差/經驗噪聲模型」，把 sim 的預測誤差校正到接近真機，再在校正後的 sim 裡訓 RL。**

**讀到這裡停一下 ⏸**
- 問：**這和 domain randomization 差在哪？**（答：DR 是「把所有參數亂隨機，逼策略魯棒」——保守、吃樣本、可能犧牲性能；Swift 是「**針對性地對真實誤差建模**」——更精準、更省，性能天花板更高。）
- 問：**為何極限競速更需要這招？**（答：競速在性能邊緣飛，DR 的保守性會限制速度上限；精準校正才能逼出冠軍級表現。）

**白話比喻**：要讓賽車手適應真賽道，DR＝「在各種亂七八糟的爛路上練」（穩但慢）；Swift＝「**精準量出這條真賽道和模擬器的每處差異，把模擬器調到跟真賽道一樣**」再練（快又準）。

---

## 3. 帶讀 ③：結果與邊界

- **結果**：擊敗多位人類 FPV 世界冠軍——RL 無人機首次達冠軍級；全程 **onboard 感測**、策略訓在 sim。
- **邊界**：在**已知賽道**、特定條件下；感知依賴閘門偵測（結構化環境）。不是「任意環境自主」（那更接近 [High-Speed Flight 帶讀](m3-high-speed-flight-guided-reading.md)）。

**最容易誤會**
- ❌ 以為 Swift 是端到端像素→馬達 → ✅ 是**感知模組 + RL 策略**兩段式混搭。
- ❌ 以為靠暴力 domain randomization → ✅ 靠**經驗殘差噪聲模型**精準校正。
- ❌ 把 CTBR 當「軌跡」→ ✅ 是**推力+角速度**，直接打角速度環，比軌跡更底層、更快。

**讀完該能答**：說清「兩模組分工」＋「殘差噪聲模型 vs domain randomization 的差別」。

---

## 4. 對「你的 UAV 題目」的啟發

- **sim-to-real 不必靠暴力隨機**：對誤差來源建模更省樣本、性能更高——你若用 [OmniDrones / Aerial Gym](m3-sim-platforms-guided-reading.md) 訓 RL，可借這個思路（先收一點 PX4 SITL/真機資料校正 sim）。
- **輸出層次很關鍵**：Swift 出 CTBR 打**角速度環**（最快）；你的 VLA（OpenVLA）出末端增量要往上重映射——理解「動作該打哪一層級聯」是 UAV 落地的核心（[m2-cascade-control-diagram.md](m2-cascade-control-diagram.md) / [m1-dataflow-diagram.md](m1-dataflow-diagram.md)）。
- **混搭哲學**：難題拆成「成熟子問題（感知）＋學習子問題（控制）」，比硬端到端穩——對資源受限的你很實用。

---

## 5. 5 點筆記（可貼進 [progress-tracker.md](progress-tracker.md)）

1. **問題**：只靠機載感測，自主無人機能否在 FPV 競速贏人類世界冠軍？
2. **方法**：**感知模組（VIO + 閘門偵測 CNN）**估狀態 → **RL 策略**輸出 **CTBR（推力+角速度）**；策略訓在 sim。
3. **關鍵設計**：用**經驗/殘差噪聲模型**（少量真機資料校正 sim）縮 **sim-to-real gap**；全程 onboard。
4. **結果**：擊敗多位人類世界冠軍——RL 無人機首次冠軍級。
5. **對我的啟發**：sim-to-real 靠「對誤差建模」比暴力 DR 省又強；CTBR 直打角速度環（M2 內環）；混搭哲學實用。

---

## 6. 分級小考（闔上論文再做）

**🟢 觀念** 1. Swift 為何不純端到端、保留傳統感知？ 2. 它擊敗了誰、用什麼感測？
**🟡 控制** 3. CTBR 是什麼？接到級聯控制哪一環？為何那環反應最快？
**🟡 sim2real** 4. 經驗噪聲模型和 domain randomization 差在哪？為何競速更需要前者？
**🔴 接題** 5. 你要用 Aerial Gym 訓 UAV RL，怎麼借 Swift 的 sim-to-real 思路？

> 對照：Q1–2 → §1/§3；Q3 → §1 + [m2](m2-cascade-control-diagram.md)；Q4 → §2；Q5 → §4 + [模擬平台帶讀](m3-sim-platforms-guided-reading.md)。

---

## 7. 想更主動學？這樣用我（Claude Code）

- **陪讀**：「帶我讀 Swift 的 system overview 圖，逐塊解釋資料怎麼流。」
- **追問**：「殘差噪聲模型具體怎麼建？和系統辨識(system ID)什麼關係？」
- **對照**：「把 Swift（RL+傳統感知）和 [High-Speed Flight](m3-high-speed-flight-guided-reading.md)（端到端 privileged learning）做設計哲學對照。」
- **出題**：「用本檔 §6 Level 4 考我。」

➡️ 同模組：[Diffusion Policy](m3-diffusion-policy-guided-reading.md)｜下一篇 [High-Speed Flight](m3-high-speed-flight-guided-reading.md)（另一種 sim2real）｜平台 [OmniDrones/Aerial Gym](m3-sim-platforms-guided-reading.md)｜控制對照 [M2](m2-cascade-control-diagram.md)
