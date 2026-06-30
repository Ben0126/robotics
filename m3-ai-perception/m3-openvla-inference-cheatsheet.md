# 🔧 M3 OpenVLA 推論 API cheat-sheet · 「load 模型 → 跑一次 inference」

> 模組：[reading-track.md](reading-track.md) Module 3（AI 模型「程式用法」，讀 repo、不必訓練）
> 來源：`openvla/openvla` GitHub README quickstart（已核對 repo 線上版）+ OpenVLA 論文（[arXiv:2406.09246](https://arxiv.org/abs/2406.09246) · [專案頁](https://openvla.github.io/)）
> 搭配閱讀：5 點筆記與四典範對照見 [m3-ai-models-comparison.md](m3-ai-models-comparison.md)；無人機端的命令接口見 [m1-offboard-code-reading.md](m1-offboard-code-reading.md)。
> 產出物類型：API cheat-sheet（「要跑一次推論，程式上要做哪幾步、傳什麼、拿到什麼」）。

---

## 0. 大局：四步就出一個動作

OpenVLA 本質是「**會吐動作 token 的 VLM**」。要它動，只做四件事：

| 步驟 | 做什麼 | 關鍵物件 |
|---|---|---|
| ① 載 processor | 把「圖+文字」轉成模型輸入 | `AutoProcessor` |
| ② 載模型 | 7B VLA 權重上 GPU | `AutoModelForVision2Seq` |
| ③ 組 prompt + 影像 | 固定格式包好 | `processor(prompt, image)` |
| ④ 預測動作 | 解碼出 7-DoF 動作 | `vla.predict_action(unnorm_key=...)` |

> ⚠️ 兩個都要 `trust_remote_code=True`：OpenVLA 的模型/處理器類別是**自帶在 repo 上的自訂程式**，HF 要被允許執行它。

---

## 1. 最小可跑範例（verbatim，已核對 repo）

```python
from transformers import AutoModelForVision2Seq, AutoProcessor
from PIL import Image
import torch

# ① + ② 載入（首次會自動下載 ~7B 權重）
processor = AutoProcessor.from_pretrained("openvla/openvla-7b", trust_remote_code=True)
vla = AutoModelForVision2Seq.from_pretrained(
    "openvla/openvla-7b",
    attn_implementation="flash_attention_2",  # 選用，加速；沒裝 flash-attn 就拿掉
    torch_dtype=torch.bfloat16,               # ★ bf16 是預設推薦精度
    low_cpu_mem_usage=True,
    trust_remote_code=True,
).to("cuda:0")

# ③ 組 prompt（格式固定！）+ 取一張相機影像
image: Image.Image = get_from_camera(...)     # 你的相機/模擬器來源
prompt = "In: What action should the robot take to {pick up the red block}?\nOut:"

# ④ 推論 → 7-DoF 動作（numpy array）
inputs = processor(prompt, image).to("cuda:0", dtype=torch.bfloat16)
action = vla.predict_action(**inputs, unnorm_key="bridge_orig", do_sample=False)

robot.act(action, ...)                         # 丟給你的機器人/控制接口執行
```

---

## 2. 逐欄解讀（每個關鍵參數在幹嘛）

### 2a. prompt 格式 — **不能亂改**
```
In: What action should the robot take to {<指令>}?\nOut:
```
- 大括號 `{}` 內放自然語言指令（如 `pick up the red block`）。
- 這個模板是**訓練時就固定的**；換句型會掉效能。多語言/任務只改 `{}` 內文字。

### 2b. `predict_action(...)` 的回傳
- 回傳一個 **7 維 numpy 動作向量**（單臂機械臂語意）：
  ```
  [Δx, Δy, Δz, Δroll, Δpitch, Δyaw, gripper]
   └──末端位置增量──┘ └────末端姿態增量────┘ └夾爪┘
  ```
- 是**末端執行器的「增量(delta) 動作」**，不是絕對位姿、也不是馬達指令。
- `do_sample=False` → 取最可能動作（確定性）；要採樣多樣性才設 `True`。

### 2c. `unnorm_key` — **最容易踩的參數**
- 模型內部輸出的是**正規化**動作（[-1,1] 級），要**反正規化**回真實單位（公尺/弧度）才能用。
- `unnorm_key` 指定「用哪個資料集的統計量反正規化」，例：`"bridge_orig"` = BridgeData V2 那組。
- **規則**：基礎 `openvla-7b` 訓在多個資料集 → **必須**指定對應你的形態的 key；若你 LoRA 微調出的 checkpoint 只含單一資料集，可省略讓它自動推得。
- 傳錯 key → 動作數值尺度全錯（機器人亂飛），但程式不會報錯，**最難 debug**。

### 2d. 動作怎麼變出來的（接 5 點筆記 §3b）
- 每個動作維度被切成 **256 個 bin**，對應 Llama 詞表中**最少用的 256 個 token**。
- 所以 `predict_action` 內部＝「自回歸生 7 個 token → 查表還原 bin → 反正規化」。理解這點就懂為何它能完全復用 LLM 解碼。

---

## 3. 省 VRAM / 加速 的旋鈕

| 旋鈕 | 怎麼設 | 效果 | 代價 |
|---|---|---|---|
| **bf16**（預設）| `torch_dtype=torch.bfloat16` | ~7B 全精度推論基準 | 需 ~15GB 級 VRAM* |
| **8-bit 量化** | `load_in_8bit=True`（bitsandbytes）| VRAM 約砍半 | 略慢、極小精度損 |
| **4-bit 量化** | `load_in_4bit=True`（bitsandbytes）| VRAM 最省（~7–8GB 級*）| 吞吐略降 |
| **flash-attention 2** | `attn_implementation="flash_attention_2"` | 加速、省記憶體 | 要另裝 `flash-attn` |

> \* VRAM/吞吐數字為論文與社群常見量級，**會因 GPU/版本而異**；repo quickstart 本身未列硬數字，正式用前以你機器實測為準。
> 量化載入時，`.to("cuda:0")` 改交給 `device_map="auto"` 或 bitsandbytes 設定處理（依 transformers 版本）。

---

## 4. LoRA 微調（要客製到自己的形態時，先知道入口）

- 用 **PEFT/LoRA** 做**參數高效微調**（不動 7B 主體，只學低秩增量）——repo 推薦「沒有大算力就走這條」。
- repo 範例量級：`--lora_rank 32`、batch ~16，可在**單張 A100(80GB)** 上跑。
- 微調後產出自己的 checkpoint；推論時 `from_pretrained("你的checkpoint")`，`unnorm_key` 對到你的資料集。

> 本 cheat-sheet 重點是**推論**；微調細節等有 GPU 再深入（接 reading-track「何時切回動手路線」）。

---

## 5. ⚠️ 常見坑

- **忘了 `trust_remote_code=True`** → 載入直接失敗（自訂類別跑不起來）。
- **prompt 格式被改** → 效能莫名變差（模板是訓練死的）。
- **`unnorm_key` 傳錯/沒傳** → 動作尺度錯亂、機器人亂動，且**不報錯**，最難查。
- **以為輸出是絕對位姿或馬達指令** → 它是**末端增量**，要你的控制器累加/轉換。
- **直接拿來開無人機** → OpenVLA 動作頭是**機械臂 7-DoF**；UAV 要自行重映射到 `TrajectorySetpoint` / body-rate（見 [m1-offboard-code-reading.md](m1-offboard-code-reading.md) 的命令接口）。
- **VRAM 爆** → 上 4-bit 量化或降影像解析度；或先在 Colab 免費 GPU 跑 inference demo。

---

## 6. 一句話 cheat（背起來）

> **`AutoProcessor` + `AutoModelForVision2Seq`(trust_remote_code, bf16) → `processor("In: ...{指令}?\nOut:", image)` → `predict_action(unnorm_key=對的形態, do_sample=False)` → 7-DoF 末端增量。VRAM 不夠就 4-bit；要上無人機先把動作頭重映射成 setpoint。**

---

## 7. 自我驗收（對應 reading-track Module 3 程式用法）

- [ ] 能說出跑一次 OpenVLA 推論的四步（processor → model → prompt+image → predict_action）
- [ ] 記得兩個 `trust_remote_code=True` 與固定的 prompt 模板
- [ ] 能解釋 `predict_action` 回傳的 7-DoF 是**末端增量**、各維含意
- [ ] 能說清 `unnorm_key` 的作用與傳錯時的後果（尺度錯、不報錯）
- [ ] 知道 4/8-bit 量化、flash-attn、LoRA 各解決什麼問題
- [ ] 能講出「OpenVLA→無人機」缺的一步：動作頭重映射到 `TrajectorySetpoint`/rate
- [ ] ✅ M3 產出物②到齊（本 cheat-sheet）→ 搭配對照表（[m3-ai-models-comparison.md](m3-ai-models-comparison.md)）收 Module 3

➡️ 姊妹篇：[5 點筆記 + 四典範對照表](m3-ai-models-comparison.md)｜回 [reading-track](reading-track.md)｜下一站 [Module 4 / Phase 4](04-phase4-integration-papers.md)
