# 🧭 M3 帶讀筆記 · 三份文件怎麼讀、讀懂沒

> 這份不是新內容，是前面三份 M3 文件的**陪讀地圖**：照它走，每停一站就知道「該想通什麼、容易誤會哪裡、讀完能不能答」。
> 帶讀對象：
> - 📄 [m3-ai-models-comparison.md](m3-ai-models-comparison.md)（5 點筆記 + 四典範對照表）
> - 🔧 [m3-openvla-inference-cheatsheet.md](m3-openvla-inference-cheatsheet.md)（OpenVLA 推論 API）
> - 🗺️ [m3-perception-pipeline-diagram.md](m3-perception-pipeline-diagram.md)（影像→VLM→語義架構圖）
> 用法：開兩個視窗，左邊原文、右邊這份；讀到「⏸ 停一下」就闔上原文自問。

---

## 0. 先抓主線：三份文件在回答三個層次的問題

```
為什麼有這些模型？  → comparison（思想/取捨）   「該用哪種典範」
這個模型怎麼跑起來？→ cheat-sheet（程式/介面） 「四步出一個動作」
怎麼接進系統裡？    → pipeline（資料流/工程）   「影像怎麼變語義 topic」
        觀念 ───────────► 單模型用法 ───────────► 系統整合
```

**一句話**：comparison 給你**地圖**（選路），cheat-sheet 給你**車鑰匙**（開一台），pipeline 給你**道路**（把車接進城市）。先看地圖再開車，別反過來。

**建議順序與預算（純讀約 2–3 小時）**：comparison(60–80 分) → cheat-sheet(30–40 分) → pipeline(40–50 分) → 回來做本檔 §5 小考(20 分)。

---

## 1. 帶讀 ①：[comparison](m3-ai-models-comparison.md)（觀念骨架，最重要）

**怎麼讀**：別逐字啃 7 篇。先讀 §0 那條光譜圖 + §2 對照表，**心裡有了座標**，再回頭看 §1 每篇 5 點。

**讀到這裡停一下 ⏸**
- 看完 §0 光譜圖 → 闔上，自己畫一次「人手寫 ↔ 資料學」這條線，把四典範擺上去。擺得出來，後面都好懂。
- 看完 RT-2(1b) → 問自己：**「動作即 token」到底神在哪？** （答：讓控制復用整套 LLM 機制 + 網路知識，於是會「語義泛化」。）
- 看完 OpenVLA(1c) → 問：**它跟 RT-2 差在哪？** （答：開源、7B 跑得動、LoRA 可微調、會量化——「能動手的那個」。）
- 看完 Diffusion(1d) → 問：**為何 BC 會「學成平均」而 Diffusion 不會？** （多模態：繞左/繞右平均成直直撞上。）

**白話比喻（卡住時想這個）**
- **傳統管線**＝食譜照步驟做；**RL**＝試吃幾萬次自己摸出配方；**VLA**＝看過全網食譜的廚師聽你一句話就做；**Diffusion**＝同一道菜有好幾種擺盤，它不會硬平均成一坨。

**最容易誤會**
- ❌ 以為四者互斥要二選一 → ✅ 真系統常**混搭**（Swift＝傳統感知 + RL 控制）。
- ❌ 把「即時性」和「泛化」混為一談 → ✅ 對照表特意分兩欄：RL 快但不泛化、VLA 泛化但慢。

**讀完該能答**：不看表，口述對照表的「輸入/輸出/資料/即時性/適用」五欄各典範一句話。

---

## 2. 帶讀 ②：[cheat-sheet](m3-openvla-inference-cheatsheet.md)（把 §1c 落地成程式）

**怎麼讀**：這份是 comparison §1c 的「實作版」。先記 §0 四步表，再逐行看 §1 範例，最後重點啃 §2c 的 `unnorm_key`。

**讀到這裡停一下 ⏸**
- 看完 §1 範例 → 闔上,默寫四步：`AutoProcessor → AutoModelForVision2Seq → processor(prompt,image) → predict_action`。
- 看完 §2b → 問：**回傳的 7 個數字是什麼？** （末端**增量** [Δx,Δy,Δz,Δrpy,gripper]，不是絕對位姿、不是馬達。）
- 看完 §2c → 這是**最該停**的一站：`unnorm_key` 傳錯**不會報錯**、但動作尺度全亂。理解「為何需要反正規化」＝理解模型內部輸出的是 [-1,1]。

**白話比喻**
- `unnorm_key` ＝**單位換算表**。模型只會說「往前 0.7（無單位）」，要查對的表才知道是「0.7 *公尺* 還是 0.7 *公分*」。查錯表 → 數字看起來正常，機器人卻暴衝。

**最容易誤會**
- ❌ 以為能直接拿去開無人機 → ✅ 它是**機械臂 7-DoF**；UAV 要把動作頭**重映射**到 `TrajectorySetpoint`/body-rate（這就是接回 [M1](m1-offboard-code-reading.md) 的那一步，也是 Phase 4 的工。）
- ❌ 忽略 `trust_remote_code=True` → ✅ 沒它直接載入失敗。

**讀完該能答**：口述四步 + `unnorm_key` 的作用與「傳錯不報錯」的後果。

---

## 3. 帶讀 ③：[pipeline](m3-perception-pipeline-diagram.md)（把模型接進 ROS2 系統）

**怎麼讀**：先看 §0 那行六段流程 + §1 Mermaid 的**橘色兩塊**（QoS、節流），這兩塊是工程上真正會卡你的地方。其餘是把六段填細節。

**讀到這裡停一下 ⏸**
- 看完 §0/§1 → 問：**這張圖和 [M1 資料流](m1-dataflow-diagram.md) 是什麼關係？** （鏡像：M1 指令往下灌、M3 感知往上抽；接起來＝看→想→動閉環。）
- 看到橘色「①訂閱 QoS」→ 想：**為何相機要 best-effort？** （影像高頻、丟幀無妨；預設 reliable 訂閱會和 best-effort 發布**不匹配 → 一張都收不到**。這正是 M1 說過、有訂閱才踩得到的坑。）
- 看到橘色「③節流」→ 想：**不節流會怎樣？** （30fps 全打 VLM＝又慢又貴；API 還會爆。）
- 看完 §5 JSON schema → 想：**為何要強制 JSON？** （VLM 自由文字下游沒法解析；`safe_to_proceed` 布林讓決策一行搞定。）

**白話比喻**
- 整條 pipeline ＝**翻譯流水線**：相機拍照 → cv_bridge 把 ROS 格式翻成 OpenCV 看得懂 → 節流＝「不是每張都送翻譯社」→ VLM＝翻譯員（看圖說 JSON）→ 下游照 JSON 決定停或走。
- VLM 那段（④）＝**可抽換的翻譯員**：本地模型 or 雲端 Claude，介面（圖進、JSON 出）不變，換人不換流程。

**最容易誤會**
- ❌ 在 subscriber callback 裡同步等 VLM 回來 → ✅ 會卡住 spin、漏後續影像；要用旗標/async（§6）。
- ❌ 把 `/scene_description` 一開始就做成複雜 custom msg → ✅ 先用 `std_msgs/String` 裝 JSON 最快跑通,穩了再升級。

**讀完該能答**：口述六段流程；說出 QoS、cv_bridge 編碼、節流三個坑各會怎樣。

---

## 4. 把三份串成一條線（讀完務必合上眼想一遍）

```
        ┌─────────────── M3 感知前端 ───────────────┐
影像 ──► pipeline(③) ──► VLM ──► 語義 JSON ──► 決策
   「怎麼接」     ▲「用哪個模型」cheat-sheet②/comparison①   │
                 │「為什麼這樣選」                          │ 觸發動作
                 └──────────────────────────────────┘      ▼
                                          M1 動作後端：TrajectorySetpoint → PX4 → 馬達
                                          M2：最內角速度環怎麼穩
```

- **comparison** 告訴你「這場景該用 VLA 還是傳統」；
- **cheat-sheet** 是「選了 VLA(OpenVLA)，程式上怎麼吐動作」；
- **pipeline** 是「把模型塞進 ROS2，讓影像源源進、語義源源出」；
- 再往下接 **M1/M2**（動作真的送進 PX4、飛得穩），整個 Phase 1→3 就通了，Phase 4 只是把這條線收尾成 Demo。

> 記法：**M2 飛得穩 → M1 聽得懂指令 → M3 看得懂世界**。三層疊起來才是「具身」。

---

## 5. 分級小考（闔上所有文件再做；答不出就回對應段）

**🟢 Level 1 · 觀念（comparison）**
1. 用一句話把傳統管線/VLA/Diffusion/RL 放上「人手寫↔資料學」光譜。
2. 「動作即 token」為什麼能讓控制復用 LLM？
3. Diffusion Policy 為何比 BC 擅長多模態動作？

**🟡 Level 2 · 用法（cheat-sheet）**
4. 默寫 OpenVLA 推論四步。
5. `predict_action` 回傳的 7 維是什麼？是絕對位姿嗎？
6. `unnorm_key` 傳錯會發生什麼？為什麼難 debug？

**🟡 Level 3 · 整合（pipeline）**
7. 相機訂閱為何要 best-effort？傳統 reliable 訂閱會怎樣？
8. 為何一定要節流？舉一種寫法。
9. 為何強制 VLM 輸出 JSON schema？

**🔴 Level 4 · 串接（跨三份 + M1/M2）**
10. OpenVLA 輸出的是機械臂末端增量，要驅動無人機還缺哪一步？接到哪個既有文件？
11. M3 感知前端如何接回 M1 動作後端形成閉環？哪個欄位觸發決策最方便？

> 對照答案：Q1–3 → comparison §0/§1/§2；Q4–6 → cheat-sheet §1/§2；Q7–9 → pipeline §1/§5/§6；Q10–11 → 本檔 §4 + [M1 資料流](m1-dataflow-diagram.md)。
> **能答 1–9 → Module 3 觀念+用法到位；能答 10–11 → 你已看見 Phase 4 的全貌，可以進 [Module 4 / Phase 4](04-phase4-integration-papers.md)。**

---

## 6. 想更主動學？這樣用我（Claude Code）

- **陪讀**：「帶我逐段讀 comparison 的 RT-2 那篇，每段問我一個問題。」
- **追問**：「pipeline 的 QoS 那段我沒懂，用 talker/listener 玩具示範一次 best-effort 不匹配。」
- **出題**：「用本檔 §5 的 Level 4 考我，我答你批改。」
- **延伸**：「把 cheat-sheet 的 OpenVLA 動作頭，幫我設計『重映射成 TrajectorySetpoint』的最小方案。」（＝接 Phase 4）

➡️ 帶讀對象：[comparison](m3-ai-models-comparison.md)｜[cheat-sheet](m3-openvla-inference-cheatsheet.md)｜[pipeline](m3-perception-pipeline-diagram.md)｜往下 [M1 資料流](m1-dataflow-diagram.md)·[M2 級聯](m2-cascade-control-diagram.md)｜下一階段 [Phase 4](04-phase4-integration-papers.md)
