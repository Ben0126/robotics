# 🧪 M5③ 技術報告 · GPS 失效的模擬與驗證方法

> 本報告對應團隊問題二的後半：「模擬環境很難模擬出失去 GPS 後無人機的誤差或偏移」。核心結論：**「把 GPS 關掉」不等於「模擬 GPS 失效」——模擬器裡有完美真值，你要重現的不是訊號消失，而是估計器的劣化行為（漂移、協方差增長）。本報告給出三種可操作的重現方法與一套工業級驗證矩陣。**
> 本報告屬 M5 系列：上一份：[M5② GPS-denied 定位與導航替代方案](m5-gps-denied-localization.md)｜下一份：[M5④ 論文清單](m5-papers-reading-list.md)
> 相關舊筆記：[M4② 避碰診斷](../m4-swarm-collision-avoidance/m4-collision-avoidance-diagnosis.md)（其中「先在模擬注入雜訊再驗證」的主張與本報告方法論一致）、[M1 走讀](../m1-offboard-control/m1-offboard-walkthrough.md)

---

## Executive Summary (English)

**Problem.** The team finds it hard to reproduce post-GPS-loss drift and error in simulation. The root cause: simulators provide perfect ground truth, so simply disabling the GPS plugin makes the estimator either fail cleanly or keep flying on ideal states — neither reproduces the *degraded estimation* that a real GPS-denied vehicle experiences.

**Key findings.** (1) What must be simulated is the **estimator's behavior** (EKF covariance growth, dead-reckoning drift, VIO error accumulation), not merely the absence of a sensor. (2) PX4 ships a purpose-built **failure injection framework** (`SYS_FAILURE_EN` + `failure gps off|stuck|garbage|wrong|slow|delayed|intermittent`, also scriptable via MAVSDK / `MAV_CMD_INJECT_FAILURE`), covering GPS, VIO, optical-flow and rangefinder channels — this is the correct tool for failsafe testing, verified against current PX4 docs (v1.16). (3) Realistic *VIO drift* can be reproduced three ways, in increasing fidelity/cost: (a) analytic drift models (random-walk + scale/yaw error) injected into the external-vision topic, parameterized from published benchmark statistics; (b) **real VIO running in the loop** on photorealistic rendering — this is where report M5①'s 3DGS pipeline pays off twice; (c) log replay of real flights. (4) Standard metrics exist: ATE/RTE via the `evo` toolkit, drift rate (% of distance), time-to-failure, and RTL landing error; these feed a test matrix of failure type × flight phase × environment × fallback level, runnable headless in CI via PX4 SIH/SITL lockstep.

**Recommendation.** Adopt a three-tier validation pipeline: Tier 1 — SIH/SITL + failure injection for failsafe logic regression (CI, minutes); Tier 2 — Gazebo/Isaac Sim + analytic VIO-drift injection for estimator-fusion tuning; Tier 3 — 3DGS photoreal scenes + real VIO in the loop for end-to-end confidence before flight tests. Pass/fail criteria and the full test matrix are given in §5.

---

## 0. 問題定義：為什麼「把 GPS 關掉」≠「模擬 GPS 失效」

團隊觀察到「模擬環境很難模擬失去 GPS 後的誤差/偏移」。先把問題拆對：

1. **模擬器裡的無人機本體不會因為沒 GPS 而漂移**——物理引擎照樣用真值積分動力學。漂移發生在**估計器**：真機上 EKF 失去位置觀測後，狀態估計隨 IMU 積分誤差發散，控制器跟著把機體帶偏。
2. 所以模擬 GPS 失效的正確目標是：**讓模擬中的估計鏈路（EKF2、VIO）跟真機一樣拿到劣化的觀測，再讓控制迴路吃到劣化的估計**。
3. 直接刪掉 GPS plugin 的兩種典型假象：(a) EKF2 乾淨地拒絕起飛/切模式（測不到「飛行中失效」的情境）；(b) 模擬 VIO 直接用真值餵 external vision（完美無漂移，白測）。

> 一句話：**要模擬的是「估計器眼中的世界」，不是「世界本身」。**

本報告依保真度分層給出做法：§2 訊號級注入（測 failsafe 邏輯）→ §3 估計級劣化（測融合與降級鏈）→ §5 整合成測試矩陣。

---

## 1. GPS 失效的真實表現與分類

### 1.1 真機上失去 GPS 時發生什麼（EKF2 視角）

- **失效偵測**：EKF2 對 GPS 觀測做創新值檢定（innovation gate）與品質檢查（EPH/EPV、衛星數、jamming 指標），不合格的觀測被拒絕融合。
- **航位推算窗口**：位置觀測中斷後，EKF2 以 IMU（＋其他可用觀測：氣壓、磁力計、光流/VIO）繼續**dead reckoning**，位置協方差持續增長；純慣性推算的可用時間由參數限制（如 `EKF2_NOAID_TOUT`，預設數秒級——超時後位置估計標記無效；確切名稱與預設值依 [PX4 參數參考](https://docs.px4.io/main/en/advanced_config/parameter_reference.html)對照現行版本，本專案基準 v1.16.2）。
- **對控制的影響**：位置估計失效 → Position mode 不可用 → 觸發 position failsafe（行為見 §6）。
- **對任務的影響**：即使 VIO 補上（見 [M5②](m5-gps-denied-localization.md)），絕對座標仍會隨 VIO 漂移緩慢流失——這是「誤差/偏移」的主要來源。

### 1.2 失效型態分類（測試矩陣的第一軸）

| 型態 | 真實成因 | 估計器看到什麼 | PX4 注入對應（§2）|
|---|---|---|---|
| 完全喪失 | 隧道、室內、強遮蔽 | 觀測流停止 | `failure gps off` |
| 間歇遮蔽 | 城市峽谷、樹冠 | 觀測斷續出現 | `failure gps intermittent` |
| 卡值 | 接收器故障 | 恆定舊值 | `failure gps stuck` |
| 劣化/多路徑 | 反射、低仰角衛星 | 噪聲變大、緩慢偏移但「看起來合理」 | `failure gps wrong`（**最陰險**：可能通過品質檢查）|
| 降頻/延遲 | 匯流排/驅動問題 | 低頻或滯後觀測 | `failure gps slow` / `delayed` |
| 欺騙 (spoofing) | 惡意訊號 | 一致但錯誤的位置 | `wrong` 近似；完整欺騙測試屬資安範疇，另計 |

---

## 2. PX4 SITL 故障注入工具箱（實作向）

以下全部查證於 [PX4 官方 System Failure Injection 文件](https://docs.px4.io/main/en/debug/failure_injection.html)（docs.px4.io/main，2026-07）。

### 2.1 開關與指令語法

```sh
# 1) 啟用故障注入（預設關閉）
param set SYS_FAILURE_EN 1

# 2) 於 PX4 console（SITL pxh shell 或 QGC MAVLink Console）注入
failure <component> <failure_type> [-i <instance>]

# 本專案最相關的組合：
failure gps off            # GPS 完全喪失
failure gps intermittent   # 間歇遮蔽
failure gps wrong          # 合理但錯誤的值（多路徑/欺騙近似）
failure vio off            # VIO 通道失效（測 M5② fallback 鏈第一級）
failure optical_flow off   # 光流失效（測 fallback 鏈第二級）
failure distance_sensor off# 測距儀失效
failure gps ok             # 恢復正常
```

- 可注入的 component 涵蓋：`gyro`/`accel`/`mag`/`baro`/`gps`/`optical_flow`/`vio`/`distance_sensor`/`airspeed`＋系統類（`battery`/`motor`/`rc_signal`/`mavlink_signal` 等）。
- failure_type 全集：`ok`/`off`/`stuck`/`garbage`/`wrong`/`slow`/`delayed`/`intermittent`。
- **程式化注入**：MAVSDK failure plugin（API 與上述指令一一對應），底層即 MAVLink [`MAV_CMD_INJECT_FAILURE`](https://mavlink.io/en/messages/common.html#MAV_CMD_INJECT_FAILURE)；PX4 官方整合測試（`test/mavsdk_tests/autopilot_tester.cpp`）就是這樣寫的——**這是我們 CI 迴歸測試（§5.3）的現成範本**。
- ⚠️ 官方警語：故障注入支援度依失效型態與模擬器而異（文件註記以 Gazebo Classic 支援最完整），不支援的組合會回 "unsupported"——建立測試矩陣時第一步先掃一遍支援度。

### 2.2 SIH：最快的 failsafe 迴歸迴圈

[SIH（Simulation-In-Hardware）](https://docs.px4.io/main/en/sim_sih/index.html)是 PX4 內建的無外部依賴輕量模擬器（物理模型直接跑在 PX4 模組內、uORB 通訊、**lockstep 確定性重現**、無渲染開銷）：

- `make px4_sitl_sih sihsim_quadx`（四旋翼為唯一 stable 機型）；也可 `SYS_HITL=2` 整包跑在真飛控硬體上。
- 定位：**Tier 1 測試載體**——毫秒級迭代、CI 友善、確定性；適合驗證「failsafe 狀態機邏輯」（注入→觸發→行為正確），不適合驗證感知（沒有影像）。

### 2.3 感測器噪聲模型（Gazebo / Isaac Sim）

- **Gazebo（新版 gz）**：NavSat（GPS）感測器支援 SDF `<noise>` 設定（[gz-sensors](https://github.com/gazebosim/gz-sensors)）。⚠️ 實務坑（截至 2026-07 未解）：位置水平噪聲的單位實作為**經緯度「度」**而非公尺（速度噪聲才是 m/s），官方 [sdformat issue #1572](https://github.com/gazebosim/sdformat/issues/1572) 仍在討論修正方向——設定 1e-5 度級的值才約等於公尺級噪聲，直接填公尺會得到公里級跳動。PX4 v1.16 起官方模擬器為 Gazebo Harmonic（[v1.16 release notes](https://github.com/PX4/PX4-Autopilot/releases/tag/v1.16.0)）。
- **Isaac Sim**：感測器（相機/IMU）可掛自訂噪聲；GPS 非內建重點，建議 GPS 劣化一律走 PX4 注入層（§2.1）而非渲染層。
- 原則：**訊號級失效用 PX4 注入（貼近韌體行為），連續性噪聲/漂移用感測器模型**，兩者疊加使用。

---

## 3. 在模擬中重現 VIO 漂移的三種方法

GPS 失效後真正的長期誤差來源是 VIO 漂移（見 [M5② §2](m5-gps-denied-localization.md)）。模擬它有三條路，保真度與成本遞增：

### 3.1 方法 A：解析漂移模型注入（快、可控、可掃參）

在「真值 → external vision topic」的路徑上插一個誤差模型節點，對送進 EKF2 的 `ODOMETRY` 加上：

```
p̂(t) = p_true(t) + b(t) + n(t)
  b(t)：隨機游走 bias（漂移主體）  b(t+dt) = b(t) + σ_rw·√dt·N(0,1)
  n(t)：白噪聲（觀測抖動）
再加：尺度誤差 s·p（單目特性）、yaw 漂移 R(δψ(t))（VIO 對 yaw 不可觀）
```

- 參數來源：公開 benchmark 的已發表統計——EuRoC MAV（[Burri et al., IJRR 2016](https://doi.org/10.1177/0278364915620033)）與 TUM-VI（[Schubert et al., IROS 2018](https://arxiv.org/abs/1804.06120)）上各 VIO 系統的 ATE/漂移率（典型 **0.5–2% of distance**；ORB-SLAM3 雙目慣性可到公分級，[arXiv:2007.11898](https://arxiv.org/abs/2007.11898)）。P2 之後改用**自家飛行 log 擬合的參數**（M5② §7 的建議）。
- 優點：毫秒級成本、參數可掃描（σ_rw × 任務長度 × 注入時點全組合）、確定性可重現。
- 限制：模擬不出「VIO 突然崩潰」的模式切換（低紋理丟追蹤是非線性事件）——用 §2.1 的 `failure vio off/intermittent` 疊加彌補。

### 3.2 方法 B：真 VIO 進迴圈（最真實，M5① 管線的第二次回收）

在 photorealistic 模擬（Isaac Sim NuRec 3DGS 場景，或 FiGS 式渲染）中掛虛擬相機＋模擬 IMU，**跑真正的 OpenVINS**，其輸出餵 EKF2——與真機軟體棧完全一致：

- 能重現：低紋理丟追蹤、光照劇變、快速旋轉下的真實失效行為（[M5② §5.1](m5-gps-denied-localization.md) 的整張失效表都能在這層測）。
- 前置需求：渲染品質要夠（這正是 [M5①](m5-vla-training-env-dataset.md) 3DGS 路線的動機之一——**同一批場景資產同時服務 VLA 訓練與 VIO 驗證**）；模擬 IMU 噪聲參數要對齊真 IMU 規格（Allan variance 參數）。
- 成本：GPU 渲染＋VIO 即時算力，單次模擬接近實時；適合 Tier 3 里程碑驗證，不適合 CI 全矩陣。

### 3.3 方法 C：Log replay 混合（用真資料驗估計鏈）

用真機飛行 log（ulog 的相機/IMU 原始流）離線重放進 VIO/EKF2 做回歸：PX4 有 replay 機制、ROS bag 亦可。優點是誤差 100% 真實；限制是**開迴路**（估計劣化不會反饋到軌跡），適合驗估計器調參，不適合驗 failsafe 行為。

### 3.4 三方法對照

| | A 解析注入 | B 真 VIO in-loop | C log replay |
|---|---|---|---|
| 真實度 | 中（統計等價）| 高（機制等價）| 誤差最真、但開迴路 |
| 成本/速度 | 極低、可大規模掃參 | 高、近實時 | 低（需先有真機 log）|
| 可重現性 | 完全確定 | 中（渲染/排程非確定性）| 完全確定 |
| 適用 | Tier 2 融合調參、參數掃描 | Tier 3 上機前驗證 | 估計器迴歸、參數擬合 |

---

## 4. 評估方法學與指標

### 4.1 指標定義

| 指標 | 定義 | 用途 |
|---|---|---|
| **ATE**（Absolute Trajectory Error）| 估計軌跡對真值軌跡對齊後的位置 RMSE | 整體定位品質 |
| **RTE/RPE**（Relative Trajectory/Pose Error）| 固定距離/時間窗內的相對誤差 | 漂移率的標準化度量，對長軌跡比 ATE 公平 |
| 漂移率 | 終點誤差 ÷ 航程（% of distance）；或 m/min | 跨任務長度可比；業界溝通最直觀 |
| Time-to-failure | 注入失效 → 估計失效旗標/failsafe 觸發的時間 | 偵測靈敏度 |
| RTL 落點誤差 | 失效後執行返航，實際落點對 home 的距離 | 對「任務終局」最有意義的端到端指標 |
| Failsafe 正確率 | 矩陣中每格觸發了「規格書指定的行為」的比例 | 驗收核心 |

- 工具：**[evo](https://github.com/MichaelGrupp/evo)**（odometry/SLAM 評估的社群標準 Python 套件，支援 TUM/EuRoC/ROS bag 格式，直接輸出 ATE/RPE 統計與圖）。模擬真值從 Gazebo/Isaac 真值 topic 或 SIH 內部狀態取。

### 4.2 實驗協定（避免自欺的三條紀律）

1. **固定軌跡集**：定義 5–10 條代表性任務軌跡（起飛-巡航-搜索模式-返航），所有比較在同軌跡集上做。
2. **多 seed**：每組合 ≥10 個隨機 seed（噪聲/風擾/注入相位），報告中位數與最差值——failsafe 驗證看**最差值**。
3. **注入時點掃描**：同一失效在起飛/巡航/搜索/返航四階段分別注入（EKF 在不同動態下的脆弱度不同）。

---

## 5. 工業級驗證測試矩陣

### 5.1 矩陣維度

```
失效型態（§1.2 六類 ＋ vio off/intermittent ＋ optical_flow off ＋ 複合失效）
  × 飛行階段（起飛 / 巡航 / 搜索機動 / 返航降落）
  × 環境（紋理豐富/貧乏 × 光照正常/劇變 × 風擾 0/中/強）
  × 降級層級（M5② §5.2 fallback 鏈的每一級單獨與級聯驗證）
```

全組合爆炸 → 分層抽樣：Tier 1 全跑「失效型態 × 飛行階段」（SIH 便宜）；Tier 2/3 只跑 Tier 1 篩出的高風險格＋環境軸。

### 5.2 Pass/Fail 準則（建議初版，隨產品規格迭代）

| 情境 | 通過準則（示例）|
|---|---|
| 巡航中 GPS off（VIO 健康）| 位置估計連續、無 failsafe 誤觸發；任務繼續；漂移率 <1.5% dist |
| 巡航中 GPS off ＋ VIO off | ≤N 秒內觸發降級 1（光流）；高度誤差 <1 m；任務暫停 |
| 搜索機動中 VIO intermittent | 無震盪/發散；恢復後 ≤M 秒重新收斂 |
| GPS wrong（緩慢偏移）| EKF2 創新檢定在 ≤T 秒內拒絕；不得跟著假位置飛 |
| 全鏈失效 | 受控降落，落點在安全區；絕不 flyaway |

### 5.3 進 CI：headless 迴歸

- 載體：SIH 或 headless Gazebo SITL（lockstep 確定性）＋ MAVSDK failure plugin 腳本注入＋自動判定（參考 PX4 官方 `mavsdk_tests` 架構，見 §2.1）。
- 頻率：每次修改估計/導航/failsafe 相關程式即觸發；全矩陣每晚跑。
- 產出：每格 pass/fail ＋ evo 指標時序存檔，回歸曲線可追蹤。

---

## 6. 安全 Fallback 行為設計與驗證（PX4 端）

查證於 [PX4 Safety (Failsafe) Configuration 文件](https://docs.px4.io/main/en/config/safety.html)（2026-07）：

- **Failsafe 行為全集**（嚴重度遞增）：None → Warning → **Hold** → **Return** → **Land** → Disarm → Flight termination（PWM 進 failsafe 值，可觸發降落傘）。
- 多數 failsafe 觸發後先進 Hold `COM_FAIL_ACT_T` 秒（給操作員接手窗口）再執行動作。
- 與本專案直接相關的設定議題：
  1. **位置失效 failsafe**：位置估計無效時的行為（相關參數群 `COM_POS_FS_*`，對照現行版參數參考確認）——無 GPS 專案應設計為「先降級（光流），最後 Land」，而不是預設 Return（**沒有絕對定位時 Return 本身不可靠**）。
  2. **無 GPS 時的 geofence 注意事項**：geofence 依賴全域位置——純 VIO 模式下圍欄參考係會跟著漂移，不能當安全邊界用；改用相對距離限制或實體淨空區。
  3. **Return 的前提重新審視**：GPS-denied 下「home」的意義由 L2 絕對定位品質決定（[M5② §2](m5-gps-denied-localization.md)）；若只有 VIO，RTL 落點誤差就是漂移率 × 航程——這正是 §4.1 把「RTL 落點誤差」列為端到端指標的原因。
- **每一條 failsafe 路徑都必須出現在 §5 矩陣中**——failsafe 沒測過等於沒有。

---

## 7. 建議驗證管線與導入路線圖

### 7.1 三層驗證管線（總覽）

```
Tier 1（分鐘級，CI 每日）     SIH / headless SITL ＋ PX4 failure injection
   驗：failsafe 狀態機、降級鏈邏輯、EKF2 拒絕/超時行為
        │ 通過
        ▼
Tier 2（小時級，每里程碑）    Gazebo/Isaac ＋ 解析 VIO 漂移注入（方法 A）＋ 噪聲掃參
   驗：融合權重、健康監控閾值、漂移率 vs 任務長度包絡
        │ 通過
        ▼
Tier 3（天級，上機前）        3DGS photoreal 場景 ＋ 真 OpenVINS in-loop（方法 B）
   驗：真實失效模式（低紋理/光變/機動）、端到端任務成功率
        │ 通過
        ▼
實機飛測（受控場地，遞增劇本：先降級演練、後真失效）
```

### 7.2 路線圖

| 階段 | 內容 | 產出 |
|---|---|---|
| V1（2–3 週）| SITL＋failure injection 跑通六類 GPS 失效；接 evo 指標管線 | Tier 1 迴歸雛形＋首版矩陣報告 |
| V2（3–5 週）| 解析漂移注入節點（方法 A）；掃參建立漂移包絡；failsafe 參數定版 | Tier 2 管線＋pass/fail 準則 v1 |
| V3（與 M5① P2 同步）| NuRec/3DGS 場景＋OpenVINS in-loop（方法 B）；真機 log 回放（方法 C）擬合自家漂移參數 | Tier 3 上機前驗證報告 |

---

## 8. 參考文獻

| # | 來源 | 型態 | 連結 | 查證日期 |
|---|---|---|---|---|
| 1 | PX4 官方文件：System Failure Injection（`SYS_FAILURE_EN`、`failure` 指令、MAVSDK plugin）| 官方文件 | [failure_injection](https://docs.px4.io/main/en/debug/failure_injection.html) | 2026-07 |
| 2 | PX4 官方文件：SIH Simulation | 官方文件 | [sim_sih](https://docs.px4.io/main/en/sim_sih/index.html) | 2026-07 |
| 3 | PX4 官方文件：Safety (Failsafe) Configuration | 官方文件 | [safety](https://docs.px4.io/main/en/config/safety.html) | 2026-07 |
| 4 | PX4 官方文件：參數參考（`EKF2_*`、`COM_POS_FS_*`、`COM_FAIL_ACT_T`；基準版本 v1.16.2）| 官方文件 | [parameter_reference](https://docs.px4.io/main/en/advanced_config/parameter_reference.html) | 2026-07 |
| 5 | MAVLink 規格：`MAV_CMD_INJECT_FAILURE` | 官方文件 | [mavlink.io](https://mavlink.io/en/messages/common.html#MAV_CMD_INJECT_FAILURE) | 2026-07 |
| 6 | PX4 v1.16.0/v1.16.2 Release（Gazebo Harmonic、EKF2 光流修正）| 官方發佈 | [v1.16.0](https://github.com/PX4/PX4-Autopilot/releases/tag/v1.16.0) · [v1.16.2](https://github.com/PX4/PX4-Autopilot/releases/tag/v1.16.2) | 2026-07 |
| 7 | gz-sensors（NavSat 噪聲模型）＋ sdformat issue #1572（噪聲單位為度的已知問題）| 開源工具 | [gz-sensors](https://github.com/gazebosim/gz-sensors) · [issue #1572](https://github.com/gazebosim/sdformat/issues/1572) | 2026-07 |
| 8 | Grupp, *evo: Python package for the evaluation of odometry and SLAM* | 開源工具 | [GitHub](https://github.com/MichaelGrupp/evo) | 2026-07 |
| 9 | Burri et al., *The EuRoC micro aerial vehicle datasets*, IJRR 2016 | 資料集 | [DOI:10.1177/0278364915620033](https://doi.org/10.1177/0278364915620033) | 穩定知識 |
| 10 | Schubert et al., *The TUM VI Benchmark for Evaluating Visual-Inertial Odometry*, IROS 2018 | 資料集 | [arXiv:1804.06120](https://arxiv.org/abs/1804.06120) | 穩定知識 |
| 11 | Campos et al., *ORB-SLAM3*, T-RO 2021（EuRoC 精度統計來源）| 論文 | [arXiv:2007.11898](https://arxiv.org/abs/2007.11898) | 穩定知識 |
| 12 | Isaac Sim NuRec / 3DGS 場景（方法 B 的渲染基礎）| 官方文件 | 見 [M5① §2.3](m5-vla-training-env-dataset.md) 之引用 | 2026-07 |

---

➡️ 回到 [README](../README.md)｜上一份：[M5② GPS-denied 定位與導航替代方案](m5-gps-denied-localization.md)｜下一份：[M5④ 論文清單](m5-papers-reading-list.md)
