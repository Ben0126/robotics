# 🧭 M1 帶讀筆記 · 兩份文件怎麼讀、讀懂沒

> 這份不是新內容，是 M1 兩份產出物的**陪讀地圖**：照它走，每停一站就知道「該想通什麼、容易誤會哪裡、讀完能不能答」。
> 帶讀對象：
> - 📝 [m1-offboard-code-reading.md](m1-offboard-code-reading.md)（`offboard_control.cpp` 逐段筆記 + 送定點 cheat-sheet）
> - 🗺️ [m1-dataflow-diagram.md](m1-dataflow-diagram.md)（ROS2 → DDS → PX4 → 馬達 資料流圖）
> 模組：[reading-track.md](reading-track.md) Module 1。用法：左邊原文、右邊這份；讀到「⏸ 停一下」就闔上原文自問。

---

## 0. 先抓主線：同一個範例的兩個視角

```
程式怎麼寫？ → code-reading（微觀：三個 message + 啟動順序）  「程式碼長怎樣」
命令走哪條路？→ dataflow（宏觀：ROS2→DDS→uORB→級聯→馬達）   「在系統裡跑到哪」
        微觀(碼) ───────────────► 宏觀(系統路徑)
```

**一句話**：兩份講的是**同一支 `offboard_control` 範例**——code-reading 是趴在程式碼上看「怎麼寫」，dataflow 是退三步看「命令在系統裡走哪」。先讀碼（具體），再拉遠看路（系統），最不會暈。

**建議順序與預算（純讀約 60–90 分）**：code-reading(40–50 分) → dataflow(20–30 分) → 回來做本檔 §3 小考(15 分)。

---

## 1. 帶讀 ①：[code-reading](m1-offboard-code-reading.md)（程式怎麼寫）

**怎麼讀**：別卡在 C++ 語法。只抓兩件事——**三個 message 的分工**（§0 表）與**啟動順序**（§3 時間軸 + 🔑 那塊）。其餘 §4–8 是把這兩件事填細節。

**讀到這裡停一下 ⏸**
- 看完 §0 三 message 表 → 闔上，說出 `OffboardControlMode` / `TrajectorySetpoint` / `VehicleCommand` 各管什麼、各多久送一次。
- 看完 §3 + 🔑 → 問自己：**為何「先送 setpoint 才能切 Offboard」？**（答：setpoint 流＝生命徵象；沒 streaming PX4 不交權，斷了超過 ~0.5s 觸 failsafe。）
- 看完 §5 → 問：**五個 bool 在幹嘛？**（級聯控制的「層級選擇器」。）
- 看完 §6 → 問：**為何 `z=-5` 是往上飛 5m？**（NED：z 向下為正。）

**白話比喻（卡住時想這個）**
- 三個 message ＝對 PX4 喊三種話：**心跳**「我還活著，要用位置控」(`OffboardControlMode`) + **數值**「飛到 (0,0,-5)」(`TrajectorySetpoint`) + **一次性命令**「切 Offboard / arm」(`VehicleCommand`)。
- **setpoint 流＝病床上的生命徵象**：有徵象才交權給你，徵象一斷就收回（failsafe）。範例先空送 10 筆，就是「切模式那刻徵象已經穩定」。

**最容易誤會**
- ❌ 先切 Offboard、再開始送 setpoint → ✅ 反了：**先 streaming ≥2Hz，再切模式**。
- ❌ `timestamp` 用秒/奈秒 → ✅ PX4/uORB 用**微秒(µs)**。
- ❌ z 正值往上 → ✅ NED **z 向下為正**，飛高用負值。
- ❌ 漏掉 `from_external=true` → ✅ 不填，PX4 **不接受**機外命令。

**讀完該能答**：默背啟動順序鐵律——**①②streaming → ③切模式 → ④arm → ①②永不停**。

---

## 2. 帶讀 ②：[dataflow](m1-dataflow-diagram.md)（命令走哪條路）

**怎麼讀**：先看 §0 那條七段管線 + §1 Mermaid，抓「**三個 `/fmu/in/*` 各接哪個入口**」。重點啃 §3（topic↔入口）與 §4（bool↔級聯層級），它們把 code-reading 的程式接到系統圖上。

**讀到這裡停一下 ⏸**
- 看完 §0/§1 → 問：**三個 topic 各流到哪？**（兩個 setpoint → 級聯**頂端**；command → **commander 旁路**，不進控制環。）
- 看完 §2 ASCII 的回饋段 → 問：**EKF2 回灌哪兩環？gyro 為何直連角速度環、不繞 EKF2？**（最內環要**最低延遲** → 這就是 M2「內環快、外環慢」的伏筆。）
- 看完 §4 → 問：`position=true` 和 `body_rate=true`，命令分別**從哪一層**進級聯？

**白話比喻**
- 整張圖＝**一條單向管線塞命令**，旁邊每一環有 EKF2/gyro **回灌狀態**形成閉環。
- `OffboardControlMode` 的 bool ＝**選命令「插進管線哪一層樓」**；那層以下永遠照走到馬達。

**最容易誤會**
- ❌ 以為 `vehicle_command` 也走控制器 → ✅ 它走 **commander 旁路**（切 nav_state / arm），不進級聯。
- ❌ 以為角速度回饋也經 EKF2 → ✅ **gyro 濾波後直連**（延遲考量）。
- ❌ `/fmu/in` 和 `/fmu/out` 混用 → ✅ **in＝給 PX4、out＝PX4 吐出**。

**讀完該能答**：不看圖口述 `ROS2 → DDS 橋 → uORB → commander/控制器 → mixer → 馬達` 七段，並指出三個 `/fmu/in/*` 各接哪裡。

---

## 3. 把兩份串成一條線 + 往上接 M2/M3（讀完務必合眼想一遍）

```
code-reading（程式：三 message + 啟動順序）
        │  同一個 offboard 範例
        ▼
dataflow（系統：命令走哪條路）
        │  結尾的「級聯控制器」就是 ▼ M2 放大的對象
        ▼
M2：位置→速度→姿態→角速度 怎麼穩（級聯方塊圖 + 調參）
        ▲
        │  M3 感知 pipeline 是本圖的「鏡像」：
M3：影像 → VLM → 語義（感知往上抽 vs M1 命令往下灌）
```

- **內部**：code-reading＝微觀、dataflow＝宏觀，**同一範例兩視角**。
- **往下接 M2**：dataflow 結尾那串級聯控制器（位置→速度→姿態→角速度），正是 [M2](m2-cascade-control-diagram.md) 整份放大的東西；gyro 直連角速度環也呼應 M2「內環快」。
- **往上接 M3**：[M3 pipeline](m3-perception-pipeline-diagram.md) 是 M1 的鏡像——M1 把命令**往下灌**進 PX4，M3 把感知**往上抽**成語義；兩條接起來＝看→想→動閉環（Phase 4）。

> 記法：**M1 是「手」（送命令）、M2 是「平衡感」（飛得穩）、M3 是「眼睛」（看得懂）。** 先有手，才談穩與看。

---

## 4. 分級小考（闔上所有文件再做；答不出就回對應段）

**🟢 Level 1 · code-reading 觀念**
1. 三個 message 各管什麼、各多久送一次？
2. 啟動順序鐵律是什麼？
3. 為何「先送 setpoint 才能切 Offboard」？

**🟡 Level 2 · 座標/版本陷阱**
4. `position={0,0,-5}` 是往哪飛？為什麼？
5. `timestamp` 用什麼單位？
6. `from_external=true` 不填會怎樣？

**🟡 Level 3 · dataflow 系統**
7. 三個 `/fmu/in/*` 各接到 PX4 內哪個消費者？
8. `vehicle_command` 為何走 commander 旁路、不進控制器？
9. EKF2 回灌哪兩環？gyro 為何**直連**角速度環？

**🔴 Level 4 · 串接**
10. `OffboardControlMode` 的 bool 如何決定命令從級聯哪一層進入？這層往下接 [M2](m2-cascade-control-diagram.md) 的哪個環？
11. M1 的命令資料流如何和 [M3 感知 pipeline](m3-perception-pipeline-diagram.md) 接成閉環？

> 對照答案：Q1–3 → code-reading §0/§3/🔑；Q4–6 → code-reading §6/§5/§7 + ⚠️；Q7–9 → dataflow §3/§1/§2；Q10–11 → dataflow §4 + 本檔 §3。
> **能答 1–9 → Module 1 觀念+用法到位；能答 10–11 → 已看見往 M2/M3 的接口，可進 [Module 2 / Phase 1 控制](m2-cascade-control-diagram.md)。**

---

## 5. 想更主動學？這樣用我（Claude Code）

- **陪讀 repo**：「帶我逐段看 `offboard_control.cpp` 的 timer callback，每段問我一題。」
- **追問**：「QoS 不匹配那段我沒懂，用 `rclpy` talker/listener 玩具示範一次收不到。」
- **出題**：「用本檔 §4 的 Level 4 考我，我答你批改。」
- **延伸**：「把送定點 cheat-sheet 擴成 Phase 2 的 Z 字軌跡，最小改哪幾行？」

➡️ 帶讀對象：[code-reading](m1-offboard-code-reading.md)｜[dataflow](m1-dataflow-diagram.md)｜往下 [M2 級聯](m2-cascade-control-diagram.md)·[M3 感知](m3-perception-pipeline-diagram.md)｜其他陪讀 [M2](m2-guided-reading.md)·[M3](m3-guided-reading.md)
