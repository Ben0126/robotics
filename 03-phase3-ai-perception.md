# 📙 Phase 3（Week 5–6）· AI 感知與具身智能

> **階段目標**：銜接 VLM/LLM 與無人機系統，能把模擬器影像餵給視覺大模型取得語義；理解 Diffusion Policy / 模仿學習 / RL 的端到端控制思路。
> 圖例：★ 必做 ／ ◇ 進階。每日預設 3–5 小時。
> 環境提醒：Week 5（VLM 推論 / API）WSL2 即可；Week 6 若要實跑 Isaac Lab/PPO，參考 [00-environment-setup.md](00-environment-setup.md) 第 3 節（原生 Linux + GPU 或雲端 GPU）。

---

## 🗓️ Week 5 · PyTorch + VLM/LLM 基礎 + 影像語義

**本週目標**：複習 PyTorch，理解 VLM 運作，並完成「ROS2 影像 → VLM → 語義描述」的 pipeline。

### 每日學習清單

#### Day 1 — PyTorch 複習 ★
- 〔觀念〕tensor、autograd、`nn.Module`、optimizer、訓練迴圈、GPU `.to(device)`。
- 〔動手〕用 PyTorch 訓一個小 CNN 分類 CIFAR-10 或 MNIST，找回手感。
- 〔資源〕PyTorch 官方 60-min Blitz。

#### Day 2 — 視覺與多模態基礎 ★
- 〔觀念〕CNN vs **ViT**（Vision Transformer）、影像 embedding；**CLIP**（影像-文字對齊）是現代 VLM 的基石。
- 〔觀念〕VLM 架構直覺：vision encoder → projector → LLM（如 LLaVA 系列）。
- 〔動手〕跑 CLIP zero-shot：給一張圖 + 幾個文字標籤，看相似度排序。
- 〔資源〕CLIP 論文摘要、HuggingFace `transformers` CLIP 範例。

#### Day 3 — 輕量開源 VLM 本地推論 ★
- 〔觀念〕邊緣可跑的輕量 VLM：**LLaVA / LLaVA-Phi、MobileVLM、Qwen2-VL、MiniCPM-V** 等；量化（4-bit）以省 VRAM。
- 〔動手〕用 HuggingFace 或 Ollama 在本地跑一個小 VLM，對一張無人機視角圖問「畫面中有什麼障礙物？」。
- 〔資源〕HuggingFace model card、Ollama vision models。

#### Day 4 — 雲端多模態 API ★
- 〔觀念〕用 API 取得高品質語義（無 GPU 也行）：**Claude（Opus 4.8 / Sonnet 4.6）**、GPT-4o 級或更新的多模態模型。
- 〔觀念〕prompt 設計：要求結構化輸出（JSON：`{obstacles:[], landmarks:[], safe_to_proceed:bool}`）方便程式解析。
- 〔動手〕寫 Python 腳本：讀一張圖 → 呼叫多模態 API → 取回結構化語義。
- 〔資源〕[resources.md](resources.md) 的 API 文件連結；Anthropic / OpenAI vision API 文件。

> 註：建構 AI 應用時，預設選用**最新、最強的 Claude 模型**（如 Opus 4.8）；需低延遲/低成本時用 Sonnet 4.6 或 Haiku 4.5。

#### Day 5 — ROS2 影像橋接 ★
- 〔觀念〕Gazebo 相機 → `sensor_msgs/Image` topic；`cv_bridge` 把 ROS Image ↔ OpenCV/NumPy。
- 〔動手〕在 SITL 掛上相機（x500 with depth/camera airframe），`ros2 topic echo` 確認影像 topic，RViz2 看畫面。
- 〔資源〕PX4 + Gazebo camera 設定、`image_transport` / `cv_bridge` 文件。

#### Day 6 — 整合：影像 → VLM → 語義 ★（本週交付物）
- 〔動手〕寫 ROS2 節點：訂閱相機 Image topic → 抽幀 → 餵給 VLM（本地或 API）→ 把語義描述 publish 到一個 `/scene_description` topic 並印出。
- 〔動手〕◇ 加上節流（每 N 幀或每 1 秒呼叫一次，避免 API 過載）。
- 〔資源〕結合 Day 4 + Day 5 成果。

> **Day 7**：休息 / 整理「感知 pipeline」架構圖。

### ✅ Week 5 檢查點（自我驗收）
- [ ] 能用 PyTorch 訓練並評估一個小模型
- [ ] 能解釋 CLIP / VLM 的 vision-encoder → projector → LLM 架構
- [ ] 能在本地或用 API 對一張圖取得結構化語義（JSON）
- [ ] 能用 `cv_bridge` 把 ROS2 Image 轉成 NumPy 並處理
- [ ] **完成「ROS2 相機影像 → VLM → 語義描述 topic」的 pipeline**

### ⚠️ 常見坑
- 本地 VLM 爆 VRAM → 用量化版或降解析度，或改走 API。
- `cv_bridge` 編碼不符（`bgr8` vs `rgb8`）→ 顏色錯亂。
- 每幀都呼叫 API → 又慢又貴，務必節流。
- VLM 自由文字輸出難解析 → 用 prompt 強制 JSON schema。

### 📦 Week 5 交付物
- **影像→VLM→語義 ROS2 節點** + 一張感知 pipeline 架構圖。

---

## 🗓️ Week 6 · Diffusion Policy / 模仿學習 / 強化學習概念

**本週目標**：理解端到端「感知→動作」的學習式控制（取代手寫規劃+PID 的趨勢），並動手跑一個小型 IL 或 RL 範例。

### 每日學習清單

#### Day 1 — 端到端控制的動機 ★
- 〔觀念〕傳統管線 感知(SLAM)→規劃→控制(PID/MPC) vs **端到端**：影像/IMU 直接 → 神經網路 → 動作（角速度/油門）。
- 〔觀念〕為何在 FPV 極限避障、高動態穿梭中端到端有優勢（延遲低、反應式）。
- 〔資源〕[resources.md](resources.md) 的「端到端/Diffusion」論文段。

#### Day 2 — 模仿學習（Imitation Learning）★
- 〔觀念〕Behavior Cloning（監督式學 expert）、distribution shift 問題、DAgger。
- 〔動手〕用一個玩具環境（如收集 SITL 的「狀態→動作」資料）做最簡 BC：MLP 學會懸停修正。
- 〔資源〕IL 入門教學、`imitation` 套件。

#### Day 3 — Diffusion Policy ★
- 〔觀念〕把「動作生成」當成條件式去噪：以觀測為條件，從噪聲逐步生成動作序列；對多模態動作分佈表現好。
- 〔觀念〕和一般 BC（回歸單一動作）相比的優勢；action chunking 概念。
- 〔動手〕讀 Diffusion Policy（Chi et al.）官方 repo README，跑其提供的 demo（若資源允許）。
- 〔資源〕Diffusion Policy 論文 + 專案頁。

#### Day 4 — 強化學習基礎 ★
- 〔觀念〕MDP、reward、policy、value；on-policy **PPO**（無人機 RL 最常用）的直覺。
- 〔動手〕用 Gymnasium + Stable-Baselines3 跑 PPO 解 `CartPole` / `Pendulum`，看訓練曲線。
- 〔資源〕Spinning Up in Deep RL（OpenAI）、SB3 文件。

#### Day 5 — Sim-to-Real 與 GPU 模擬 ★
- 〔觀念〕**Isaac Lab**：GPU 並行數千環境，幾小時等效數萬小時訓練；**domain randomization** 縮小 sim-to-real gap。
- 〔觀念〕為何 RL 政策能直接部署到實體 Pixhawk（學在 sim、隨機化感測/動力參數）。
- 〔動手〕◇ 有 GPU：照 Isaac Lab 文件跑一個內建範例（如四足/無人機）；無 GPU：精讀其 pipeline 與隨機化設定。
- 〔資源〕Isaac Lab 官方文件、相關 sim-to-real 無人機論文。

#### Day 6 — 收斂與選題 ★（本週交付物）
- 〔動手〕寫一份 1–2 頁筆記：比較「傳統管線 vs IL vs Diffusion Policy vs RL」的輸入/輸出/資料需求/優缺點/適用場景。
- 〔動手〕記下你最想深入的方向（為 Phase 4 論文研讀與選題鋪路）。

> **Day 7**：休息 / 補跑未完成的訓練。

### ✅ Week 6 檢查點（自我驗收）
- [ ] 能對比傳統管線與端到端控制的優缺點
- [ ] 能解釋 BC 與 Diffusion Policy 的差異（為何後者擅長多模態動作）
- [ ] 能用 SB3 跑通一個 PPO 範例並看懂訓練曲線
- [ ] 能說清楚 Isaac Lab 的價值與 sim-to-real 的 domain randomization
- [ ] **完成一份 4 種方法對比筆記 + 個人選題方向**

### ⚠️ 常見坑
- RL reward 設計不當 → 學到鑽漏洞行為（reward hacking）。
- 直接想在實機跑 RL → 危險且樣本效率低，務必先 sim。
- Diffusion Policy 推論延遲較高 → 注意即時性 vs 表現的取捨。
- Isaac Lab 對 GPU/驅動版本敏感 → 照官方相容性表，別硬上舊驅動。

### 📦 Week 6 交付物
- **4 種控制典範對比筆記** + 一個跑通的 PPO（或 BC/Diffusion demo）訓練紀錄。

---

## 🚀 Phase 3 延伸（時間有餘 ◇）
- 把 Week5 的 VLM 語義接成「避障決策」：VLM 說「前方有障礙」→ 觸發停止/繞行。
- 嘗試 VLA（Vision-Language-Action）概念：語言指令 + 影像 → 直接輸出動作。

➡️ 下一階段：[Phase 4 · 系統整合與論文研讀](04-phase4-integration-papers.md)
