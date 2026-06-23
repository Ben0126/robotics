# 📚 資源清單（Resources）

> 統整官方文件、課程、工具與必讀論文。連結為現行有效版本（已移除 EOL 的 ROS2 Iron、過時模型名）。

---

## 1. 官方文件（必看）

| 主題 | 連結 | 重點章節 |
|---|---|---|
| PX4 Autopilot | <https://docs.px4.io/> | Architecture、uORB、Flight Modes、**Offboard**、**ROS2 (uXRCE-DDS) User Guide**、MC PID Tuning |
| ROS2 (Humble, LTS) | <https://docs.ros.org/en/humble/> | Beginner/Intermediate Tutorials、**QoS**、Launch、tf2 |
| ROS2 (Jazzy, LTS) | <https://docs.ros.org/en/jazzy/> | 若用 Ubuntu 24.04 改看此版 |
| Gazebo (Harmonic/Sim) | <https://gazebosim.org/docs> | 模型、相機感測器、ROS2 bridge |
| px4_ros_com | <https://github.com/PX4/px4_ros_com> | Offboard 範例、QoS 設定 |
| px4_msgs | <https://github.com/PX4/px4_msgs> | PX4↔ROS2 訊息定義（版本需對應 PX4） |
| Micro XRCE-DDS Agent | <https://github.com/eProsima/Micro-XRCE-DDS-Agent> | ROS2↔PX4 橋接 agent |
| QGroundControl | <https://qgroundcontrol.com/> | 地面站、參數調整、即時圖 |
| PyTorch | <https://pytorch.org/tutorials/> | 60-min Blitz、訓練迴圈 |

> ⚠️ 版本搭配：**Ubuntu 22.04 ↔ ROS2 Humble**（新手推薦）；Ubuntu 24.04 ↔ ROS2 Jazzy。**ROS2 Iron 已 EOL（2024-11），勿用。** PX4 用 **v1.15+**（內建 uXRCE-DDS client）。

---

## 2. 課程 / 教材

| 類型 | 資源 |
|---|---|
| C++ | *A Tour of C++*（Stroustrup）、learncpp.com、*C++ Concurrency in Action*（Williams） |
| Python | 官方 asyncio 教學、NumPy quickstart |
| 控制 | Brian Douglas《Control Systems Lectures》(YouTube)、PX4 PID Tuning Guide |
| ROS2 | 官方 Tutorials、*A Gentle Introduction to ROS*（概念補強） |
| 深度學習 | PyTorch 官方教學、CS231n（視覺）、HuggingFace `transformers` 文件 |
| 強化學習 | OpenAI *Spinning Up in Deep RL*、Stable-Baselines3 文件 |
| 模擬/RL 平台 | NVIDIA **Isaac Lab** 官方文件（需 RTX GPU） |

---

## 3. 開發工具

| 工具 | 用途 |
|---|---|
| **Cursor** / VS Code + AI 外掛 | 加速 C++/Python/ROS2 節點撰寫與複習 |
| Claude Code | CLI / IDE 內的 agentic 開發助手（C++/ROS2 重構、除錯） |
| QGroundControl | 飛行參數調整、log 即時觀察 |
| Flight Review (<https://logs.px4.io>) | 上傳 ulog 分析飛行表現 |
| Ollama / HuggingFace | 本地跑輕量 VLM/LLM |

### 多模態 / LLM API（2026 現行）
- **Anthropic Claude**：建構 AI 應用預設選最新最強模型 —— **Opus 4.8**（最強）、**Sonnet 4.6**（均衡）、**Haiku 4.5**（低延遲/低成本）；皆支援視覺輸入。
- 其他：GPT-4o 級或更新的多模態模型、Google Gemini 系列。
- 用法重點：**要求結構化 JSON 輸出**以利程式解析；高頻影像務必節流。

### 輕量開源 VLM（本地/邊緣，Week 5）
- LLaVA / LLaVA-Phi、MobileVLM、Qwen2-VL、MiniCPM-V（搭配 4-bit 量化省 VRAM）。

---

## 4. 必讀論文清單（依主題）

> 📑 **完整、附連結與「為何讀」標註的清單見 [papers-reading-list.md](papers-reading-list.md)**（含每篇難度與閱讀週次排程）。以下為主題索引。
> 研讀方法：先用三遍讀法（*How to Read a Paper*, S. Keshav）抓重點，填入 Week 8 的論文追蹤表。

### 🧠 主題 A — LLM/VLM 高階決策與自然語言控制
- **ChatGPT for Robotics**（Microsoft, arXiv:2306.17582）— 含無人機 zig-zag 巡檢 demo。
- **SayCan**（CoRL 2022, arXiv:2204.01691）、**Code as Policies**（ICRA 2023, arXiv:2209.07753）、**RT-2 / PaLM-E** — LLM 規劃 + VLA 接地。

### 🎯 主題 B — VLA / 端到端控制與 Diffusion Policy
- **VLA Survey**（IEEE Access 2025）、**OpenVLA**（CoRL 2024, arXiv:2406.09246, 開源 7B）。
- **Diffusion Policy**（Chi et al., RSS 2023 / IJRR 2024, arXiv:2303.04137）+ 你 NotebookLM 的 DPPO/D²PPO/ReinFlow。
- **Learning High-Speed Flight in the Wild**（Loquercio, Science Robotics 2021）。

### 🤖 主題 C — Sim-to-Real 強化學習與 UAV 模擬平台
- **Swift — Champion-level drone racing**（Nature 2023, doi:10.1038/s41586-023-06419-4）。
- **OmniDrones**（arXiv:2309.12825）、**Aerial Gym**（RA-L 2025）— Isaac 系 GPU 並行 UAV RL。

### 🛩️ 主題 D — UAV 語義導航 / Aerial VLN（前沿）
- **AerialVLN**（ICCV 2023）、**CityNavAgent**（ACL 2025）、**OpenFly**（arXiv:2502.18041）、**UAV-VLN Survey 2026**（arXiv:2604.07705 / 2604.13654）。

### 📌 實驗室發表（待填）
- 目標實驗室名稱：_______________
- Google Scholar / 實驗室網站連結：_______________
- 近兩年代表作 1：_______________
- 近兩年代表作 2：_______________
- 近兩年代表作 3：_______________

> 補上實驗室資訊後，可請我用 WebSearch 拉出該 lab 的最新發表與 2026 ICRA/IROS/RSS/CoRL 相關論文回填本清單。

---

## 5. 頂會與追蹤管道
- **頂會**：ICRA、IROS、RSS、CoRL（機器人）；CVPR、NeurIPS、CoRL（學習）。
- **追蹤**：arXiv cs.RO / cs.LG、Papers with Code、各實驗室 Twitter/X 與 YouTube demo。

➡️ 回到 [README](README.md)
