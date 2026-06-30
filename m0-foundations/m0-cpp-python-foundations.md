# 🧱 Module 0（前置）· C++/Python 手感「閱讀版」

> 這是 [01-phase1-control-sim.md](01-phase1-control-sim.md) **Week 1 Day 1–5** 的低設備閱讀版——動手路線那 5 天要編譯、跑 `valgrind`、開 thread；這裡把每天的〔動手〕換成**純讀就能完成的理解產出物**（讀 code 標問題、畫心智圖、做對照表）。
> 定位：[reading-track.md](reading-track.md) 的**前置模組**，補回閱讀路線跳過的程式暖身。讀完接 [Module 1](m1-guided-reading.md)（飛控架構與用法）。
> 用法：每天讀「要看懂 → 比喻 → 讀這段 code → 產出物」，讀到「⏸ 停一下」就闔上自問。全程不需編譯器；標 ☁️ 的是**有環境再做**的可選驗證。
> 預算：每天純讀約 60–90 分；5 天約一週（可壓到 3–4 天）。

---

## 0. 先抓主線：這 5 天在補什麼手感

```
Day1 記憶體/指標 ─┐
Day2 OOP/現代特性 ─┼─► 看懂 C++ 怎麼「安全地管資源 + 跑多條線」 ──► M1 讀 offboard_control.cpp 不卡語法
Day3 多執行緒 ────┘                                           （飛控 = 多模組多執行緒 + uORB 解耦）
Day4 NumPy ───┐
Day5 asyncio ─┴─► 看懂 Python 怎麼「向量化算數值 + 非同步收 stream」 ──► M2 PID 數值模擬、Phase2 ROS2 非同步
```

**一句話**：前三天是 **C++ 資源與並行**（為了讀懂 PX4 韌體），後兩天是 **Python 數值與非同步**（為了 PID 模擬與 ROS2 通訊）。閱讀版的目標不是「會寫」，而是**讀別人的 code 能指出哪裡對／哪裡會炸、為什麼**。

---

## Day 1 · C++ 記憶體與指標 ★（讀版）

**讀什麼**：cppreference smart pointers；learncpp.com 第 15–22 章（線上讀）。

**要看懂**
- stack vs heap：誰自動回收（stack 出作用域就死）、誰要手動/智慧指標管（heap）。
- raw pointer vs reference：reference 不可為 null、不可改綁定；pointer 可 null、可重指、要自己管生命週期。
- `new/delete` 三宗罪：**dangling**（指向已釋放）、**leak**（忘了 delete）、**double-free**（delete 兩次）。
- 智慧指標選哪個：`unique_ptr`＝獨佔所有權、`shared_ptr`＝引用計數共享、`weak_ptr`＝不持有、破循環。

**白話比喻**
- `unique_ptr` ＝**一把鑰匙**，只能在一個人手上（move 才換手，不能複製）。
- `shared_ptr` ＝**共用櫃子的計數牌**，最後一個離開的人關燈（計數歸零才釋放）。
- `weak_ptr` ＝**知道櫃子在哪但沒鑰匙**的旁觀者（用前要 `.lock()` 確認還在）。

**🔍 讀這段 code，找出三宗罪**（閱讀版核心：別執行，用眼睛 debug）
```cpp
Sensor* make() { Sensor s; return &s; }      // (A)
void use() {
    Sensor* p = new Sensor();
    if (failed) return;                       // (B)
    delete p;
    log(p->id);                               // (C)
    delete p;                                 // (D)
}
```
- (A) **dangling**：回傳區域變數位址，函式結束 `s` 已死 → 拿到野指標。
- (B) **leak**：提早 return 沒 `delete p` → heap 漏。
- (C) **use-after-free**：`delete p` 後又解參考。
- (D) **double-free**：再 delete 一次。
- 改法：`auto p = std::make_unique<Sensor>();` → (B)(C)(D) 全消（出作用域自動釋放、移動後原指標變 null）。

**📦 產出物（取代「跑 valgrind」）**
1. 一張 **smart pointer 決策表**：欄位＝〔所有權語義 / 可複製? / 典型場景 / 主要陷阱〕，三列填 unique/shared/weak。
2. 上面那段 code 的**逐行標註**（哪行哪宗罪、RAII 怎麼修）。

**⏸ 停一下**：① `unique_ptr` 能 `=` 賦值給另一個嗎？（不能，只能 `std::move`）② 兩個 `shared_ptr` 互相持有對方會怎樣？（循環引用→計數永不歸零→leak→其中一邊改 `weak_ptr`）。

**⚠️ 最容易誤會**
- ❌ `shared_ptr` 到處傳最安全 → ✅ 會循環引用漏記憶體；預設先用 `unique_ptr`，真要共享才 shared。
- ❌ 智慧指標＝不會漏 → ✅ 循環引用、或自己又 `new` 一份仍會漏。

**☁️ 有環境再做**：把上段 code 編出來，用 AddressSanitizer（`-fsanitize=address`）看它報哪幾行——對照你紙上標的對不對。

---

## Day 2 · C++ OOP 與現代特性 ★（讀版）

**讀什麼**：*A Tour of C++*（Stroustrup）ch.1–6。

**要看懂**
- class/繼承/多型/**虛函式**：base pointer 呼到 derived 實作靠 `virtual`（vtable）。
- **RAII**：資源（記憶體/檔案/鎖）綁物件生命週期，建構取得、解構釋放——這是 C++ 不用 GC 卻不漏的根本。
- `const` 正確性：`const` 成員函式不改狀態；`const&` 參數＝只讀不複製。
- **move semantics**：`std::move` 把「可被搬走」的資源轉手，避免深拷貝；右值引用 `T&&` 是它的型別基礎。
- 容器與語法糖：`std::vector`/`array`/`map`、範圍 for、lambda、`auto`。

**白話比喻**
- RAII ＝**買票進場/離場自動退押金**：物件活著就握資源，死了自動還。
- move ＝**搬家不是影印**：把家具搬過去（O(1) 轉指標），不是逐件複製（深拷貝）。
- 虛函式 ＝**同一句指令「飛」，麻雀和直升機各飛各的**（執行期決定呼誰）。

**🔍 讀這段骨架**（這就是 Phase1 要你寫的 `Controller`/`PIDController`，先用讀的看懂結構）
```cpp
class Controller {                                   // 基底
public:
    virtual double update(double err, double dt) = 0; // 純虛 → 子類必實作
    virtual ~Controller() = default;                  // ★ 多型基底要 virtual 解構
};
class PIDController : public Controller {
    double kp_, ki_, kd_, integ_{0}, prev_{0};
public:
    PIDController(double p,double i,double d):kp_(p),ki_(i),kd_(d){}
    double update(double err,double dt) override {    // override 讓編譯器幫你檢查
        integ_ += err*dt;
        double deriv = (err-prev_)/dt; prev_=err;
        return kp_*err + ki_*integ_ + kd_*deriv;
    }
};
```
- 為何 `~Controller()` 要 `virtual`？→ 用 `Controller*` 指向 `PIDController` 並 delete 時，沒 virtual 解構只呼基底版 → 子類資源漏。
- `override` 幹嘛？→ 簽名打錯（漏 `dt`）會編譯報錯，而不是默默變成「新函式」。
- `update` 為何純虛（`=0`）？→ 基底只定義「介面」，演算法留給子類；對應 [m1](m1-offboard-code-reading.md) 之後不同控制律可換子類。

**📦 產出物（取代「寫 PIDController」）**
1. 一張 **「現代 C++ 特性 ↔ 解決什麼痛」對照表**：RAII↔不漏資源、move↔不亂深拷貝、`const`↔防誤改、`override`↔防簽名打錯、智慧指標↔不手動 delete。
2. 把上面骨架**逐行註解**：標出哪行是多型、哪行是 RAII、哪行 const 可加。

**⏸ 停一下**：① 拿掉 `virtual ~Controller()` 會發生什麼？② `update` 的 `err` 改成傳 `const double&` 有差嗎？（基本型別沒差甚至更慢；大物件才用 `const&`）。

**⚠️ 最容易誤會**
- ❌ 多型基底解構不用 virtual → ✅ 透過基底指標 delete 子類會漏/未定義行為。
- ❌ `std::move` 會「搬移」 → ✅ 它只是**轉型成右值**，真正搬移發生在接手的 move 建構/賦值；move 後原物件處於「有效但未定義」狀態。

---

## Day 3 · C++ 多執行緒 ★（讀版）

**讀什麼**：*C++ Concurrency in Action*（Williams）ch.2–4 重點。

**要看懂**
- `std::thread` 起一條線、`join`/`detach`；`mutex`+`lock_guard`（RAII 上鎖）；`condition_variable`（等條件、被通知再醒）；`atomic`（無鎖的單一變數同步）。
- **race condition**＝兩線同時讀寫共享狀態、結果看時序；**deadlock**＝互等對方的鎖。
- **為何飛控是多執行緒/多模組**：感測讀取、狀態估測(EKF2)、控制、通訊**各跑各的頻率**，用訊息解耦——這正是 [m1-dataflow-diagram.md](m1-dataflow-diagram.md) 的 uORB pub/sub。

**白話比喻**
- `mutex` ＝**單間廁所的鑰匙**：一次一人，`lock_guard` 是「離開自動還鑰匙」。
- `condition_variable` ＝**抽號等叫**：消費者沒貨就睡，生產者放貨喊一聲再醒（不空轉燒 CPU）。
- 飛控多線 ＝**廚房分工**：備料/快炒/出餐各站各速度，靠出餐口（uORB topic）傳遞，不互相卡。

**🔍 讀這段 producer-consumer，找出 race**（假 IMU → 濾波）
```cpp
std::queue<Imu> q;                      // 共享
std::mutex m;
std::condition_variable cv;

void producer(){ while(run){ Imu d=read();
    { std::lock_guard<std::mutex> lk(m); q.push(d); }   // (A) 上鎖再 push
    cv.notify_one(); } }

void consumer(){ while(run){
    std::unique_lock<std::mutex> lk(m);
    cv.wait(lk,[]{ return !q.empty()||!run; });          // (B) 等到有貨才醒
    if(!q.empty()){ Imu d=q.front(); q.pop(); lk.unlock(); filter(d); } } }
```
- (A) 若把 `q.push(d)` 移到 lock_guard **外面** → 兩線同時動 queue → **race**（可能崩或掉資料）。
- (B) `cv.wait` 的 lambda 是**防偽喚醒**；少了它，spurious wakeup 時 `q` 還空就 `front()` → UB。
- `filter(d)` 放 `lk.unlock()` 之後 → 濾波不佔鎖，縮短臨界區（其他線能進）。

**📦 產出物（取代「寫並跑 producer-consumer」）**
1. 一張 **飛控多執行緒架構小圖**：4 個框（感測/估測/控制/通訊）標各自頻率 + 它們之間靠「訊息佇列」傳遞（手繪即可）——這是 M1 uORB 的前傳。
2. 上面 code 的**臨界區標註**：圈出共享資源、哪幾行必須在鎖內、為何 `filter` 可移到鎖外。

**⏸ 停一下**：① 把 `lock_guard` 換成「手動 lock/unlock」但中間 `return` 了會怎樣？（忘了 unlock → deadlock；RAII 正是為此）② 為何最內層控制環在真機上會想**避免鎖**？（延遲/抖動 → 用 `atomic` 或無鎖佇列；呼應 M1「gyro 直連角速度環」的低延遲考量）。

**⚠️ 最容易誤會**
- ❌ 加了 mutex 就一定安全 → ✅ 鎖**範圍不對**（push 在鎖外）照樣 race；鎖**順序不一致**會 deadlock。
- ❌ 用 `while(q.empty())` 空轉等資料 → ✅ 燒 CPU；該用 `condition_variable` 睡等。

---

## Day 4 · Python 資料處理（NumPy）★（讀版）

**讀什麼**：NumPy 官方 quickstart；SciPy 訊號處理簡介。

**要看懂**
- `ndarray`：同型別、連續記憶體 → 為何比 list 快。
- **broadcasting**：不同形狀陣列自動對齊運算（如 `(N,3) + (3,)`）。
- **向量化**：用整段陣列運算取代 Python `for`（差幾十～百倍）。
- 切片、`matplotlib` 畫圖。

**白話比喻**
- 向量化 ＝**整批進烤箱**，for loop ＝**一塊一塊烤**。
- broadcasting ＝**自動把短的那個複製對齊**（不真的複製記憶體，是視圖技巧）。

**🔍 讀這段「一階系統階躍響應」**（為 M2 PID 鋪路：先懂離散更新）
```python
# 一階系統 τ·y' + y = u，離散化：y[k+1] = y[k] + dt/τ·(u - y[k])
import numpy as np
dt, tau, T = 0.01, 0.5, 3.0
t = np.arange(0, T, dt)         # 時間軸（向量化建立）
y = np.zeros_like(t)
u = 1.0                          # 階躍輸入
for k in range(len(t)-1):        # 這個 for 是「時間遞迴」，無法向量化（後依賴前）
    y[k+1] = y[k] + dt/tau*(u - y[k])
```
- 哪個 for **不能**向量化？→ 時間遞迴（`y[k+1]` 依賴 `y[k]`）只能逐步；但**建 `t`、算誤差、畫圖**全該向量化。
- 對照陷阱：若你寫 `t=[]; for ...: t.append(...)` 再逐點算 → 慢百倍。`np.arange` 一次生成。
- 這條 `y[k+1]=y[k]+dt/τ·(u−y[k])` 就是 M2 裡 P 控制器的離散直覺：誤差 `(u−y)` 越大、修正越猛。

**📦 產出物（取代「跑模擬畫圖」）**
1. 一張 **「向量化 vs for loop」對照 cheat-sheet**：建陣列、逐元素運算、條件篩選、求和/平均 各給「❌for 寫法 / ✅向量化寫法」兩欄。
2. **紙上推導**：用 `dt=0.1, τ=0.5, u=1` 手算前 3 步 `y[1],y[2],y[3]`，看它怎麼指數逼近 1（理解「時間常數」）。

**⏸ 停一下**：① `(N,3)` 的 xyz 軌跡要每點減掉同一個原點 `(3,)`，怎麼一行寫完？（`traj - origin`，broadcasting）② 上面 `y` 最後會收斂到多少？（→ u=1）幾個 τ 後算穩定？（約 3–4τ）。

**⚠️ 最容易誤會**
- ❌ 所有 for 都能向量化 → ✅ **有前後依賴的遞迴**（像這個時間步進）不行；能向量化的是「對每個元素獨立」的運算。
- ❌ broadcasting 會複製大記憶體 → ✅ 多數是視圖，省記憶體；但形狀不相容會直接報錯。

---

## Day 5 · Python 非同步與工程實務 ★（讀版）

**讀什麼**：Python 官方 asyncio 教學。

**要看懂**
- `asyncio`：**單執行緒**的 event loop，靠 `await` 在 I/O 等待時**讓出**控制權給別的協程（協作式並行，非平行）。
- `async/await`、`asyncio.gather`（並發跑多個協程）。
- **為何 ROS2/通訊愛用非同步**：大量「等網路/等訊息」的 I/O，與其開一堆 thread，不如單線輪流顧——省資源、無鎖。
- 工程實務：`venv`（隔離依賴）、type hints、`dataclass`（少寫樣板）、`logging`（取代 print）。

**白話比喻**
- async ＝**一個廚師顧多個鍋**：這鍋在煮（等 I/O）就去顧那鍋，不是請多個廚師（多執行緒）。
- `await` ＝**「這裡會等一下，先去忙別的」的讓出點**；沒有 `await` 的協程不會讓出，會卡住整個 loop。

**🔍 讀這段「同時訂兩個感測 stream」**
```python
import asyncio
async def sensor(name, period):
    while True:
        await asyncio.sleep(period)        # ← 讓出點：等的時候 loop 去跑別的
        print(f"{name} @ {asyncio.get_event_loop().time():.2f}")

async def main():
    await asyncio.gather(                   # 並發跑兩條，不是依序
        sensor("imu", 0.1),
        sensor("gps", 0.5),
    )
asyncio.run(main())
```
- 為何 imu/gps 能「同時」印？→ 各自 `await sleep` 時讓出，loop 輪流喚醒；單線卻像並行。
- 把 `await asyncio.sleep` 改成 `time.sleep`（阻塞）會怎樣？→ **卡死整個 loop**，另一條 stream 停擺（經典 async 陷阱）。
- 接 Phase 2：ROS2 的回呼/服務呼叫本質就是這種「等訊息→讓出」模型。

**📦 產出物（取代「跑 async 腳本」）**
1. 一張 **event loop 心智模型圖**：單線時間軸上，imu/gps 的 await 讓出點如何交錯（畫個甘特圖式的小圖）。
2. 一張 **「async vs 多執行緒」對照**：適用場景（I/O 密集 vs CPU 密集）、是否平行、要不要鎖、ROS2 用哪種。

**⏸ 停一下**：① 協程裡放一段純算大矩陣（CPU 重）會發生什麼？（卡 loop，async 救不了 CPU 密集，那要 thread/process）② `gather` 和「依序 `await a; await b`」差在哪？（gather 並發；依序是 a 完才 b）。

**⚠️ 最容易誤會**
- ❌ async＝多執行緒/變快 → ✅ **單執行緒協作式**，只在 I/O 等待時受益；CPU 密集不會變快。
- ❌ 協程裡能隨便 `time.sleep`/同步阻塞呼叫 → ✅ 會卡整個 loop，要用 `await` 版或丟到 executor。

---

## 6. 串成一條線 + 往上接 M1/M2

```
Day1 指標/RAII ┐
Day2 OOP/move  ├─► 讀懂「C++ 怎麼安全管資源」 ──► M1: 讀 offboard_control.cpp 不卡語法
Day3 多執行緒  ┘                                （飛控＝多模組多執行緒，uORB 解耦）
Day4 NumPy ─► 離散更新 y[k+1]=y[k]+… ──► M2: PID 數值直覺、症狀↔參數
Day5 asyncio ─► 等訊息就讓出 ──► Phase2: ROS2 pub/sub 與 Offboard 通訊
```

- **往下接 [M1](m1-guided-reading.md)**：Day1–3 的「資源管理＋多執行緒」就是讀 PX4/`px4_ros_com` 原始碼的底氣；Day3 的多線解耦正是 [m1-dataflow](m1-dataflow-diagram.md) uORB 的前傳。
- **往下接 [M2](m2-guided-reading.md)**：Day4 的一階系統離散更新，是 [M2 級聯控制](m2-cascade-control-diagram.md)「P 控制器怎麼逼近目標」的數值直覺。
- **往上接 Phase 2**：Day5 的 event loop ＝ ROS2 通訊的心智模型。

> 記法：**Day1–3 練「手指」（C++ 管資源/並行）、Day4–5 練「算盤＋耳朵」（數值＋收訊息）。** 有這些，讀 M1 的 code 才不會字字查語法。

---

## 7. 分級小考（闔上文件再做；答不出回對應 Day）

**🟢 Level 1 · 觀念**
1. `unique_ptr`/`shared_ptr`/`weak_ptr` 各自所有權語義？何時用 weak？
2. RAII 是什麼？為何多型基底的解構子要 `virtual`？
3. `mutex` 與 `condition_variable` 各解決什麼？race condition 怎麼發生？

**🟡 Level 2 · 讀 code 抓錯**
4. 給一段 `new` 沒配 `delete`／提早 return 的 code，指出 leak/dangling/double-free 各在哪行、怎麼用智慧指標修。
5. producer-consumer 裡，哪幾行**必須**在鎖內？`filter()` 為何能移到鎖外？
6. 哪種 for **不能**向量化？為什麼？

**🟡 Level 3 · Python**
7. 向量化為何比 Python for 快？broadcasting 在做什麼？
8. async 是平行嗎？協程裡誤用 `time.sleep` 會怎樣？
9. async vs 多執行緒，I/O 密集 / CPU 密集各該選哪個？

**🔴 Level 4 · 串接**
10. Day3 的「多執行緒解耦」如何對應 [M1 dataflow](m1-dataflow-diagram.md) 的 uORB？為何最內層控制環想避免鎖／走低延遲路徑？
11. Day4 的 `y[k+1]=y[k]+dt/τ·(u−y[k])` 和 [M2](m2-cascade-control-diagram.md) 的 P 控制器有何關係？

> 對照：Q1–3→Day1/2/3；Q4–6→各 Day 的「🔍讀這段」；Q7–9→Day4/5；Q10–11→§6。
> **能答 1–9 → 程式手感閱讀版到位；能答 10–11 → 已接上 M1/M2 介面，可進 [Module 1](m1-guided-reading.md)。**

---

## 8. 自我驗收 checkpoint（回 [progress-tracker.md](progress-tracker.md) 勾）
- [ ] 能說清 `unique_ptr`/`shared_ptr`/`weak_ptr` 差別與循環引用怎麼解
- [ ] 能在一段 code 上指出 leak/dangling/double-free 並用 RAII/智慧指標修
- [ ] 能解釋飛控為何多執行緒，並圈出 producer-consumer 的臨界區
- [ ] 能說出哪種 for 不能向量化，並寫出向量化 vs for 對照
- [ ] 能解釋 async 是單線協作式、誤用阻塞呼叫的後果

## 9. 想動手？這樣用我（Claude Code）
- **陪讀**：「帶我逐行看 Day2 的 `PIDController` 骨架，每行問我一題。」
- **抓錯**：「再給我一段有 race condition 的 C++，我標、你批改。」
- **☁️ 輕量驗證**：「給我可在 Colab/本機跑的最小 NumPy 階躍響應，跑完對照我紙上推的 y[1..3]。」
- **延伸**：「把 Day5 的雙 stream 擴成 ROS2 `rclpy` talker/listener 玩具，最小改哪幾行？」

➡️ 讀完往下：[Module 1 帶讀](m1-guided-reading.md)（飛控架構與用法）｜對照動手版 [01-phase1 Week 1](01-phase1-control-sim.md)
