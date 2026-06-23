# 📕 Phase 4（Week 7–8）· 系統整合與前沿論文研讀

> **階段目標**：把前三階段串成一個完整 pipeline —— 自然語言 → LLM 解析 → ROS2 → PX4 飛行；並追上 2026 最新研究、收斂出個人研究方向。
> 圖例：★ 必做 ／ ◇ 進階。每日預設 3–5 小時。

---

## 🗓️ Week 7 · 端到端整合：Embodied UAV Demo

**本週目標**：跑通最小可行的具身智能無人機 Demo：使用者輸入自然語言 → LLM 解析成路徑點/程式 → ROS2 引導 PX4 飛過去。

### 系統藍圖
```
使用者自然語言 ("飛到紅色沙發上方並拍照")
        │
        ▼
 [LLM 規劃器]  ← (可選) VLM 提供場景語義
   解析成結構化計畫：waypoints / 動作序列 (JSON)
        │
        ▼
 [ROS2 任務節點]  驗證 + 轉成 TrajectorySetpoint 序列
        │  (uXRCE-DDS)
        ▼
 [PX4 SITL]  Offboard 執行 → Gazebo 飛行
```

### 每日學習清單

#### Day 1 — 系統設計與介面定義 ★
- 〔觀念〕模組邊界：感知（Week5）／規劃（LLM）／執行（Week4 Offboard）。
- 〔動手〕定義 LLM 輸出的 **JSON schema**（如 `{"actions":[{"type":"goto","x":..,"y":..,"z":..},{"type":"photo"}]}`），讓下游好解析。
- 〔資源〕回顧 [02](02-phase2-ros2-comm.md) Offboard、[03](03-phase3-ai-perception.md) VLM 成果。

#### Day 2 — LLM 任務規劃器（Task Planning / Code Generation）★
- 〔觀念〕**LLM 當大腦**：把模糊指令拆解成子任務（如「搜查建築」→ 環繞→找入口→低空偵測），輸出 waypoints 或可執行程式。
- 〔動手〕寫 Python：把自然語言 + 環境資訊（座標範圍、地標）丟給 Claude/GPT 級 API，要求回傳上面定義的 JSON 計畫。用 system prompt 約束安全邊界（高度上限、地理圍欄）。
- 〔資源〕Microsoft *ChatGPT for Robotics* 框架概念（見 [resources.md](resources.md)）。

#### Day 3 — ROS2 任務執行節點 ★
- 〔動手〕寫節點：接收 LLM 的 JSON → 逐一驗證（在範圍內？高度安全？）→ 轉成 `TrajectorySetpoint` 序列 → 沿用 Week4 的 Offboard 邏輯送出。
- 〔動手〕加 guardrail：不合法指令拒絕執行並回報原因。
- 〔資源〕Week4 交付物的軌跡節點。

#### Day 4 — 串接語義導航（VLM 進場）◇ ★
- 〔觀念〕**Semantic Navigation**：不只靠點雲避障，而是「看懂」環境（「那是窗戶可穿過」「那是危險區繞道」）。
- 〔動手〕把 Week5 的 `/scene_description` 接進規劃迴圈：LLM 依 VLM 回報的地標決定下一步（如找到「紅色沙發」才下 photo 指令）。
- 〔資源〕VLA / semantic navigation 論文段。

#### Day 5 — 端到端聯調 ★
- 〔動手〕完整跑一次：打一句中文指令 → 看無人機在 Gazebo 飛到目標 → 觸發「拍照」（存一張相機影像）。
- 〔動手〕用 `ros2 bag` 錄整段，準備 Demo 影片。
- 〔動手〕處理失敗模式：LLM 回傳格式錯 → 重試/修正；Offboard 中斷 → 安全降落。

#### Day 6 — 打磨與紀錄 ★（本週交付物）
- 〔動手〕錄一段 Demo 影片 + 寫一頁系統架構與限制說明（哪裡 hack、哪裡可改進）。
- 〔動手〕◇ 換 2–3 種不同指令測試泛化性，記錄成功率。

> **Day 7**：休息 / 整理 Demo 與心得。

### ✅ Week 7 檢查點（自我驗收）
- [ ] 定義並驗證了 LLM→ROS2 的 JSON 介面
- [ ] LLM 能把自然語言指令轉成合法 waypoint 計畫
- [ ] ROS2 節點能驗證並執行該計畫（含安全 guardrail）
- [ ] **完整 Demo：自然語言 → LLM → ROS2 → PX4 在 Gazebo 飛到目標並拍照**
- [ ] 錄下 Demo 影片 + 架構/限制說明

### ⚠️ 常見坑
- LLM 輸出不穩定（多餘文字、欄位缺漏）→ 強制 JSON schema + 解析失敗就重試。
- 沒有安全 guardrail → LLM 幻覺出危險指令直接執行。務必夾驗證層。
- 整合時各節點時序問題（agent 沒開、setpoint 沒先送）→ 用 launch 統一啟動順序。

### 📦 Week 7 交付物
- **最小 Embodied UAV Demo**（影片 + bag）+ 一頁系統架構與限制說明。

---

## 🗓️ Week 8 · 前沿論文研讀與收斂

**本週目標**：系統性追上 2026 最新研究，產出論文研讀筆記與個人研究方向草稿。

### 每日學習清單

#### Day 1 — 論文研讀方法論 ★
- 〔觀念〕三遍讀法（Keshav）：①標題/摘要/結論抓重點 ②圖表/方法 ③細節重現。
- 〔動手〕建一個論文追蹤表（標題／問題／方法／結果／對我的啟發／可重現性）。
- 〔資源〕*How to Read a Paper*（S. Keshav）。

> 📑 完整論文連結與排程見 [papers-reading-list.md](papers-reading-list.md)。

#### Day 2 — 主題一：LLM/VLM 高階決策 ★
- 〔閱讀〕*ChatGPT for Robotics*（arXiv:2306.17582）+ *Code as Policies*（arXiv:2209.07753）；延伸 *SayCan*、RT-2。
- 〔重點〕任務規劃、code generation、affordance 接地如何落地。

#### Day 3 — 主題二：VLA / 端到端 / Diffusion Policy ★
- 〔閱讀〕*RT-2* + *OpenVLA*（arXiv:2406.09246）；*Diffusion Policy*（arXiv:2303.04137）+ *Learning High-Speed Flight in the Wild*（Science Robotics 2021）。
- 〔重點〕輸入模態、動作表示、資料收集方式、即時性。

#### Day 4 — 主題三：Sim-to-Real RL ★
- 〔閱讀〕*Swift — Champion-level drone racing*（Nature 2023）+ *OmniDrones* / *Aerial Gym* 平台；NotebookLM 問 DPPO/ReinFlow。
- 〔重點〕reward 設計、domain randomization、部署到實機的關鍵。
- 〔延伸〕UAV 語義導航：*AerialVLN*（ICCV 2023）、*CityNavAgent*（ACL 2025）、UAV-VLN Survey 2026。

#### Day 5 — 實驗室發表精讀 ★
- 〔動手〕精讀你目標實驗室近兩年 2–3 篇代表作，對照上面三大主題定位其貢獻。
- 〔動手〕整理出「實驗室在做什麼、用什麼工具、留下什麼未解問題」。
- 〔資源〕實驗室網站 / Google Scholar（在 [resources.md](resources.md) 補上 lab 連結）。

#### Day 6 — 收斂：研究方向草稿 ★（本階段總交付物）
- 〔動手〕寫一份 1–2 頁：①我已具備的技能盤點（對照前 7 週交付物）②我感興趣且實驗室在做的交集 ③一個可在 1–2 個月內試做的小題目（含初步方法與所需資源）。
- 〔動手〕◇ 把 Week7 的 Demo 延伸成這個小題目的雛形。

> **Day 7**：休息 / 回顧整個 8 週、更新 [progress-tracker.md](progress-tracker.md)。

### ✅ Week 8 檢查點（自我驗收）
- [ ] 用三遍讀法讀完每個主題至少 2 篇代表作，填好追蹤表
- [ ] 能口頭講清楚三大趨勢（LLM 決策 / 端到端 / Sim-to-Real RL）的代表方法與差異
- [ ] 精讀目標實驗室 2–3 篇發表並定位其貢獻與未解問題
- [ ] **產出 1–2 頁個人研究方向草稿（含可試做的小題目）**

### ⚠️ 常見坑
- 只讀摘要不讀方法 → 抓不到真正貢獻與限制。
- 想一次讀完所有論文 → 聚焦三大主題各精讀少數代表作即可。
- 選題好高騖遠 → 先選 1–2 個月能出原型的小題。

### 📦 Week 8 交付物（也是整個課程的收尾）
- **論文追蹤表（≥6 篇）** + **個人研究方向草稿（1–2 頁）**。

---

## 🎓 結業：8 週成果盤點
完成後你應該擁有：
1. 可運作的 PX4 SITL + ROS2 開發環境
2. PID 調參實作經驗與筆記
3. ROS2 Offboard 軌跡控制節點
4. 影像 → VLM → 語義 的感知 pipeline
5. 4 種控制典範對比筆記 + 一個 RL/IL demo
6. 最小 Embodied UAV Demo（自然語言→飛行）
7. 論文研讀筆記 + 個人研究方向草稿

➡️ 回到 [README](README.md)｜查 [資源清單](resources.md)｜更新 [進度追蹤](progress-tracker.md)
