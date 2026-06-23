# 📑 必讀論文清單（Annotated Reading List）

> 由 Exa / 學術搜尋彙整，對應 8 週課程各階段。每篇標註：**讀的時機（週次）**、**難度**、**為何讀**。
> 難度：🟢 入門概念 ／ 🟡 方法細節 ／ 🔴 進階/重現級。
> 與既有 NotebookLM 筆記「Generative RL & Flow Policy Research」互補（後者已涵蓋 DPPO / D²PPO / ReinFlow / Flow Q-Learning）。

---

## A · LLM 任務規劃與程式生成（對應 Phase 4 · W7–8）
讓 LLM 當「大腦」把自然語言拆成子任務 / 生成控制程式 —— 你的 Embodied UAV Demo 的理論支柱。

| 論文 | 出處 | 難度 | 為何讀 |
|---|---|---|---|
| **ChatGPT for Robotics: Design Principles and Model Abilities** — Vemprala, Bonatti, Bucker, Kapoor | Microsoft MSR-TR-2023-8, 2023 · [arXiv:2306.17582](https://arxiv.org/abs/2306.17582) | 🟢 | **直接對應你的 Demo**：用高階函式庫 + prompt 讓 LLM 控制無人機（論文裡就有 zig-zag 巡檢、自拍）。先讀這篇。 |
| **SayCan: Do As I Can, Not As I Say** — Ahn et al. | CoRL 2022 · [arXiv:2204.01691](https://arxiv.org/abs/2204.01691) | 🟡 | LLM 提供「該做什麼」、value function 提供「能不能做」(affordance) 的接地經典。 |
| **Code as Policies** — Liang et al. | ICRA 2023 · [arXiv:2209.07753](https://arxiv.org/abs/2209.07753) | 🟡 | LLM 直接寫策略程式碼（waypoint / 控制原語），你的 NL→程式 路線範本。 |
| ChatGPT Empowered Long-Step Robot Control（JSON 動作序列 prompt） | Microsoft, 2023 · [arXiv:2304.03893](https://arxiv.org/abs/2304.03893) | 🟢 | 教你如何讓 LLM 穩定輸出可解析 JSON 動作序列（你 W7 Day1 的 schema 設計）。 |

---

## B · 視覺-語言-動作（VLA）端到端模型（對應 Phase 3 W5–6 + Phase 4）
把影像+語言直接映射到動作，是「端到端控制」的主線。

| 論文 | 出處 | 難度 | 為何讀 |
|---|---|---|---|
| **VLA Survey: A Review Towards Real-World Applications** — Kawaharazuka et al. | IEEE Access 2025 · [doi:10.1109/ACCESS.2025.3609980](https://doi.org/10.1109/ACCESS.2025.3609980) · [網站](https://vla-survey.github.io/) | 🟢 | **先讀這篇 survey** 建立全貌（架構、資料、benchmark、平台）。 |
| **RT-2: VLA Models Transfer Web Knowledge to Robotic Control** — Brohan et al. (Google DeepMind) | CoRL 2023 · [專案頁](https://robotics-transformer2.github.io/) | 🟡 | 把動作當成 text token 與網路知識共同訓練的奠基作。 |
| **OpenVLA: An Open-Source VLA Model** — Kim et al. | CoRL 2024 · [arXiv:2406.09246](https://arxiv.org/abs/2406.09246) · [專案頁](https://openvla.github.io/) | 🟡 | **7B 開源、可在消費級 GPU 用 LoRA 微調** —— 最適合你動手的 VLA。 |
| π0 (pi-zero, flow-matching VLA) — Physical Intelligence | 2024 | 🔴 | flow-matching 接 VLM 的最新動作生成路線（接你 NotebookLM 的 flow policy 主題）。 |
| Octo（memory-augmented transformer, Open X-Embodiment） | 2024 | 🟡 | 大規模多機 trajectory 訓練的泛化策略代表。 |

---

## C · Diffusion Policy / 生成式策略（對應 Phase 3 · W6）
與你既有 NotebookLM 筆記直接接軌。

| 論文 | 出處 | 難度 | 為何讀 |
|---|---|---|---|
| **Diffusion Policy: Visuomotor Policy Learning via Action Diffusion** — Chi et al. | RSS 2023 / IJRR 2024 · [arXiv:2303.04137](https://arxiv.org/abs/2303.04137) · [專案頁](https://diffusion-policy.cs.columbia.edu/) | 🟡 | **生成式策略的奠基作**：以條件去噪生成動作序列，擅長多模態。先讀本篇再看下方 RL 微調。 |
| DPPO / D²PPO / ReinFlow / Flow Q-Learning | （已在你的 NotebookLM 筆記中） | 🔴 | 用 RL 微調 diffusion/flow 策略、解表徵崩塌與採樣效率 —— 用 NotebookLM 直接問答即可。 |

---

## D · UAV 端到端控制與 Sim-to-Real RL（對應 Phase 3 W6；與 Phase 1 控制對照）
旗艦級「在 sim 練、上實機飛」成果，理解 sim-to-real gap 怎麼縮。

| 論文 | 出處 | 難度 | 為何讀 |
|---|---|---|---|
| **Champion-level drone racing using deep RL (Swift)** — Kaufmann, Bauersfeld, Loquercio, Müller, Koltun, Scaramuzza | **Nature** 620, 982–987 (2023) · [doi:10.1038/s41586-023-06419-4](https://doi.org/10.1038/s41586-023-06419-4) | 🟡 | **必讀旗艦**：純 onboard 感測 + 在 sim 訓 RL 打敗人類冠軍；經驗噪聲模型縮 sim-to-real gap。 |
| **Learning High-Speed Flight in the Wild** — Loquercio, Kaufmann, Ranftl, Müller, Koltun, Scaramuzza | **Science Robotics** 2021 · [arXiv:2110.05113](https://arxiv.org/abs/2110.05113) | 🟡 | 端到端「感測→無碰撞軌跡」、privileged learning、zero-shot sim→real 穿越叢林。 |

---

## E · UAV GPU 模擬 / RL 平台（對應 Phase 3 W6 的動手環境）
你 W6 若要實跑 RL，這兩個是 Isaac 系的入手平台。

| 平台/論文 | 出處 | 難度 | 為何用 |
|---|---|---|---|
| **OmniDrones** — Xu et al. | [arXiv:2309.12825](https://arxiv.org/abs/2309.12825) · [docs](https://omnidrones.readthedocs.io/) · [GitHub](https://github.com/btx0424/OmniDrones) | 🟡 | Isaac Sim 上多旋翼 RL，10⁵ FPS、TorchRL，懸停→過驅追蹤等 benchmark。 |
| **Aerial Gym Simulator** — Kulkarni, Rehberg, Alexis | RA-L 2025 · [doi:10.1109/LRA.2025.3548507](https://doi.org/10.1109/LRA.2025.3548507) · [網站](https://ntnu-arl.github.io/aerial_gym_simulator/) | 🟡 | Isaac Gym 千台並行、GPU 幾何控制器；motor 政策 <1 分鐘、視覺導航 <1 小時可訓出。 |

---

## F · UAV 語義導航 / Aerial VLN（對應 Phase 4 銜接，最前沿）
無人機「聽懂指令 + 看懂環境」自主導航 —— 你選題方向的活躍戰場。

| 論文 | 出處 | 難度 | 為何讀 |
|---|---|---|---|
| **AerialVLN: Vision-and-Language Navigation for UAVs** — Liu et al. | ICCV 2023 · [arXiv:2308.06735](https://arxiv.org/abs/2308.06735) | 🟡 | 首個 city-scale UAV-VLN benchmark（25 城景、連續 3D 動作），定義問題。 |
| **CityNavAgent** — Zhang et al. | ACL 2025 · [aclanthology 2025.acl-long.1511](https://aclanthology.org/2025.acl-long.1511/) | 🟡 | LLM 階層語義規劃 + 全域記憶拓樸圖，城市 aerial VLN SOTA。 |
| **OpenFly**（toolchain + 100k benchmark；OpenFly-Agent 基於 OpenVLA） | [arXiv:2502.18041](https://arxiv.org/abs/2502.18041) | 🟡 | 3D GS + UE/GTA/Google Earth 自動產資料；接 VLA 的最新 aerial VLN 平台。 |
| **UAV-VLN Survey（2026）**：Towards the Era of LLMs ([arXiv:2604.07705](https://arxiv.org/abs/2604.07705)) ／ Progress, Challenges & Roadmap ([arXiv:2604.13654](https://arxiv.org/abs/2604.13654)) ／ AeroVerse-Review | 2025–2026 | 🟢 | **最新 survey + 七大未解問題**，直接拿來找你的研究缺口。 |

---

## 🗓️ 融入 8 週的論文閱讀排程

原則：相關階段先**略讀（🟢 第一遍）**建立直覺，**Week 8 深讀（🟡🔴 第二/三遍）**並填追蹤表。

| 週次 | 搭配閱讀（略讀，30–45 分/篇） | 對應動手 |
|---|---|---|
| W2（PID/控制） | Swift（Nature）— 只看 perception+control 雙模組概念 | 對照你手調 PID 的「傳統控制」 |
| W4（Offboard） | ChatGPT for Robotics（看 drone zig-zag 段） | 為 W7 NL→指令鋪路 |
| W5（VLM 感知） | VLA Survey（架構章）、OpenVLA | 影像→VLM→語義 pipeline |
| W6（端到端/RL） | Diffusion Policy、Learning High-Speed Flight、(OmniDrones/Aerial Gym 文件) | 4 種控制典範對比筆記 |
| W7（整合 Demo） | SayCan、Code as Policies | NL→LLM→ROS2 介面設計 |
| **W8（深讀+收斂）** | **每主題挑 2 篇深讀**：A. ChatGPT for Robotics + Code as Policies｜B. RT-2 + OpenVLA｜D. Swift + High-Speed Flight｜F. AerialVLN + UAV-VLN Survey + 你實驗室發表 | 論文追蹤表（≥6 篇）+ 研究方向草稿 |

> Week 8 深讀法（三遍讀法）見 [04-phase4-integration-papers.md](04-phase4-integration-papers.md) Day1。

---

## 🔬 研究缺口提示（給 Week 8 選題）
從上面 survey 的「未解問題」挑可在 1–2 個月做出原型的小題，例如：
- **Onboard 部署效率**：把雲端 VLM 語義導航壓到邊緣裝置（接 Phase 3 的輕量 VLM）。
- **6-DoF 連續動作執行**：把 AerialVLN 的離散動作換成你 Phase 2 的 `TrajectorySetpoint` 連續控制。
- **Sim-to-Real for VLN**：用 OmniDrones / Aerial Gym 訓練 + PX4 SITL 驗證，縮 aerial VLN 的模擬-現實差距。

➡️ 回到 [README](README.md)｜[資源清單](resources.md)｜[Phase 4 論文研讀](04-phase4-integration-papers.md)
