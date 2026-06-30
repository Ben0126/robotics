# 📖 M0 完整版筆記 · C++/Python 手感「從頭講清楚」

> 模組：[reading-track.md](reading-track.md) Module 0（前置，取代 Phase 1 Week 1 Day 1–5）
> 搭配速覽：[m0-cpp-python-foundations.md](m0-cpp-python-foundations.md)（閱讀版任務清單 + 分級小考）
> 這份的定位：**不是任務清單，是把每個觀念「講到你懂」的筆記**。每節都按「它是什麼 → 為什麼這樣設計 → code 怎麼讀 → 容易錯在哪」鋪。讀完你該能**讀別人的 code 指出哪裡會炸、為什麼，並說出怎麼修**。
> 往下接：[M1 飛控架構](m1-guided-reading.md)（C++ 三天的用武之地）、[M2 級聯控制](m2-cascade-control-diagram.md)（Python 數值的用武之地）。

---

# 🧱 Day 1 · C++ 記憶體與指標

C++ 跟 Python/Java 最大的不同：**沒有垃圾回收（GC）**。記憶體要你自己管。聽起來可怕，但 PX4 韌體之所以用 C++，正是為了這種「精準掌握每一塊記憶體何時生、何時死」的能力——飛控不能容忍 GC 突然暫停 20ms 去清記憶體。所以這天的目標：**搞懂記憶體在哪、誰負責回收、怎麼用智慧指標讓「自己管」變得不容易出錯。**

## 1.1 Stack vs Heap：兩種記憶體，兩種命運

程式跑起來時，變數住在兩個地方：

| | **Stack（堆疊）** | **Heap（堆積）** |
|---|---|---|
| 誰管理 | 編譯器自動 | 你自己（`new`/`delete` 或智慧指標）|
| 生命週期 | **離開作用域 `{}` 就自動銷毀** | **直到你明確釋放，否則一直佔著** |
| 速度 | 快（只是移動堆疊指標）| 慢（要跟作業系統要記憶體）|
| 大小 | 小（通常幾 MB，會 stack overflow）| 大（受限於實體記憶體）|
| 典型用途 | 區域變數、函式參數 | 大物件、生命週期要跨函式的物件 |

```cpp
void f() {
    int a = 10;              // a 在 stack：f() 結束就自動消失
    Sensor s;                // s 也在 stack：同上，還會自動呼叫解構子
    Sensor* p = new Sensor();// new 出來的物件在 heap，p 這個「指標變數」本身在 stack
}                            // ← 這裡：a、s、p 都消失了，但 p 指向的那塊 heap 沒被釋放 → 漏！
```

**關鍵心智模型**：`new Sensor()` 在 heap 生出一個物件，回給你一個「地址」（指標 `p`）。函式結束時，**指標 `p` 自己（stack 上的）死了，但它指向的 heap 物件沒人去 `delete`，就漏了**。Stack 上的 `s` 不一樣——它出作用域時編譯器自動幫你銷毀。

> 一句話：**Stack 的東西「出場自動清」，Heap 的東西「要你親自清」。** Day 1 之後所有的麻煩都源於這句話。

## 1.2 指標（pointer）vs 參考（reference）

兩個都是「指向別的東西」，但規則差很多：

| | **指標 `T*`** | **參考 `T&`** |
|---|---|---|
| 可以是 null 嗎 | 可以（`nullptr`）| **不行**，一定綁著某個有效物件 |
| 可以改綁別的嗎 | 可以（重新指向）| **不行**，一旦綁定終身不換 |
| 要管生命週期嗎 | 常常要（尤其指向 heap）| 不用（只是別人的別名）|
| 語法 | `*p` 解參考、`p->x` 取成員 | 直接當原物件用 |

```cpp
int x = 5, y = 9;
int* p = &x;   // p 指向 x
*p = 7;        // 改的是 x，x 變 7
p = &y;        // p 改指向 y（指標可重綁）

int& r = x;    // r 是 x 的別名
r = 100;       // 直接改 x，x 變 100
// int& r2;    // ❌ 編譯錯：reference 必須初始化、不能為 null
```

**為什麼飛控 code 常用 `const T&` 傳參數？** 傳大物件（例如一個含上百個欄位的 `VehicleStatus`）進函式，如果用值傳（`T msg`）會**複製整個物件**，慢。用 `const T&` 傳：不複製（只傳地址）、又因為 `const` 保證函式不會改你的原物件。**「只讀、不複製」就用 `const T&`。**

## 1.3 `new`/`delete` 的三宗罪

手動管 heap 最常見的三種災難。先看這段「故意寫壞」的 code，用眼睛 debug（不要執行）：

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

| 標記 | 罪名 | 發生什麼 |
|---|---|---|
| **(A)** | **dangling pointer（懸空指標）** | `s` 是 stack 區域變數，`make()` 一結束 `s` 就死了。回傳 `&s` 等於給你一個「已經沒人住的房間地址」。之後用它＝**存取已死的記憶體**（未定義行為，可能讀到垃圾、可能崩）。|
| **(B)** | **memory leak（記憶體洩漏）** | `p` 是 `new` 出來的，提早 `return` 沒 `delete p`，那塊 heap 永遠沒人釋放。函式跑一萬次就漏一萬個。|
| **(C)** | **use-after-free（釋放後使用）** | 已經 `delete p` 了，`p` 變成懸空指標，再 `p->id` 等於存取已釋放的記憶體。|
| **(D)** | **double-free（重複釋放）** | 同一塊記憶體 `delete` 兩次。第二次 delete 會破壞 heap 的內部記帳，常常當場或稍後崩潰。|

**這三宗罪是 C++ 新手 90% 的 bug 來源**，也是 `valgrind` / AddressSanitizer 這類工具存在的理由。

## 1.4 解法：RAII + 智慧指標（這天的重點）

C++ 的官方答案不是「更小心一點」，而是**讓編譯器幫你自動 delete**。原理叫 **RAII**（Resource Acquisition Is Initialization，資源取得即初始化）：

> **把「釋放」綁進物件的解構子。物件出作用域時，編譯器保證呼叫解構子 → 資源自動還。**

智慧指標就是這個原理的包裝。把上面的 `new` 換成智慧指標，三宗罪一次消滅：

```cpp
auto p = std::make_unique<Sensor>();   // 取代 new Sensor()
// ...用 p->id ...
// 不需要 delete！出作用域時 unique_ptr 的解構子自動 delete 裡面的 Sensor
```

- (B) leak 消失：提早 return 也會觸發 `p` 的解構 → 自動釋放。
- (C) use-after-free 消失：move 後原指標自動變 null，誤用會立刻 crash 而非默默讀垃圾。
- (D) double-free 消失：所有權唯一，不會有第二個人去 delete。

### 三種智慧指標：選哪個？

| | `unique_ptr` | `shared_ptr` | `weak_ptr` |
|---|---|---|---|
| 所有權 | **獨佔**（只有一個擁有者）| **共享**（引用計數）| **不持有**（旁觀者）|
| 可以複製嗎 | ❌ 不能（只能 `std::move` 轉手）| ✅ 可以（複製時計數 +1）| ✅ 可以 |
| 何時釋放 | 擁有者出作用域 | **最後一個** shared 出作用域（計數歸零）| 不負責釋放 |
| 開銷 | 幾乎為零 | 有計數器（原子操作，稍貴）| 同 shared |
| 典型場景 | 預設首選 | 真的多方共享同一物件 | 打破循環引用、快取 |

**白話比喻**：
- `unique_ptr` ＝**一把鑰匙**。一次只能在一個人手上；要給別人只能「交出去」（`std::move`），不能影印。
- `shared_ptr` ＝**共用櫃子的計數牌**。每多一個人拿牌計數 +1，每個人離開 −1，**最後一個離開的人關燈**（計數歸零才真的釋放）。
- `weak_ptr` ＝**知道櫃子在哪、但沒鑰匙的旁觀者**。它不影響計數；要用前得先 `.lock()` 把它升級成 shared，確認櫃子還在。

```cpp
auto a = std::make_unique<Sensor>();
// auto b = a;            // ❌ 編譯錯：unique 不能複製
auto b = std::move(a);    // ✅ 所有權從 a 轉給 b，此後 a == nullptr

auto s1 = std::make_shared<Sensor>();  // 計數 = 1
auto s2 = s1;                          // 計數 = 2（兩個都指同一物件）
// s1、s2 各自出作用域時計數遞減，歸零才 delete
```

### ⚠️ 智慧指標最大的陷阱：循環引用

`shared_ptr` 不是萬靈丹。如果**兩個物件用 shared_ptr 互相持有對方**，計數永遠不會歸零 → 還是漏：

```cpp
struct Node {
    std::shared_ptr<Node> next;   // A 持有 B
    std::shared_ptr<Node> prev;   // B 持有 A  ← 循環！
};
// A 的計數因為 B 指著它而 ≥1，B 的計數因為 A 指著它而 ≥1
// 即使外部都不用了，兩邊互相「卡住」對方，誰都歸不了零 → leak
```

**解法**：其中一個方向改用 `weak_ptr`（通常是「往回指」的 `prev`）。weak 不增加計數，循環就斷了。

> 記法：**預設先用 `unique_ptr`（最便宜、語義最清楚）；真的需要多方共享才升級 `shared_ptr`；一旦 shared 之間可能成環，就用 `weak_ptr` 破環。**

## 1.5 Day 1 自我驗收
- [ ] 能講清 stack（自動清）vs heap（手動清），並指出上面 `f()` 哪個變數會漏
- [ ] 能在那段 code 上指出 (A)dangling / (B)leak / (C)use-after-free / (D)double-free，並說明 `make_unique` 怎麼一次修掉 (B)(C)(D)
- [ ] 能說 `unique_ptr`/`shared_ptr`/`weak_ptr` 的所有權語義 + 為何 unique 只能 move 不能複製
- [ ] 能解釋循環引用怎麼漏、為何 `weak_ptr` 能解

---

# 🧩 Day 2 · C++ OOP 與現代特性

Day 1 學會「安全管一塊記憶體」，Day 2 學會「**用物件把資源和行為包起來**」。這天有兩條主線：**多型（polymorphism）**讓你「同一個介面、不同實作」，**RAII / move** 讓你「資源管理自動又零成本」。讀 PX4 的控制器類別、或自己寫 `PIDController`，靠的就是這兩條。

## 2.1 class、繼承、多型、虛函式

- **class**：把資料（成員變數）和行為（成員函式）綁在一起。
- **繼承**：`class B : public A` 表示 B「是一種」A，繼承 A 的介面與實作。
- **多型 + 虛函式（`virtual`）**：這是 OOP 的核心魔法——**用基底指標呼叫，實際跑的是子類的版本**。

```cpp
struct Animal {
    virtual void speak() { std::cout << "..."; }  // virtual = 可被子類覆寫
};
struct Dog : Animal {
    void speak() override { std::cout << "Woof"; } // override 覆寫
};

Animal* a = new Dog();
a->speak();   // 印 "Woof"，不是 "..."！
```

**為什麼 `a->speak()` 會跑 Dog 的版本？** 因為 `speak` 是 `virtual`。編譯器在每個有虛函式的物件裡藏一張 **vtable（虛擬函式表）**——一張「這個函式實際該呼叫哪個版本」的查找表。`a` 雖然型別是 `Animal*`，但它指向的物件是 Dog，vtable 裡 `speak` 指向 `Dog::speak`。**這個「執行期才決定呼叫誰」叫動態分派（dynamic dispatch）。**

> 白話：虛函式 ＝ **同一句指令「飛」，麻雀和直升機各飛各的**。喊「飛」的人（基底指標）不需要知道對方是誰，對方自己知道怎麼飛。

如果沒有 `virtual`，`a->speak()` 會「靜態地」按指標型別 `Animal*` 呼叫 `Animal::speak`，印出 `"..."`——這通常不是你要的。

## 2.2 純虛函式與抽象基底

`= 0` 讓函式變「**純虛**」：基底只定義介面、**不給實作**，強制子類必須實作。有純虛函式的 class 叫**抽象類別**，不能直接 new。

```cpp
struct Controller {
    virtual double update(double err, double dt) = 0;  // 純虛：子類「必須」實作
    virtual ~Controller() = default;                   // 多型基底要 virtual 解構（見 2.3）
};
```

這就是「**定義介面、把演算法留給子類**」。控制器基底說「每個控制器都要有 `update`」，但怎麼算交給 `PIDController`、`LQRController`… 各自實作。之後換控制律＝換一個子類，呼叫端 `Controller*` 完全不用改。對應 [M1](m1-offboard-code-reading.md) 之後不同控制模式可換實作。

## 2.3 RAII：C++ 不用 GC 卻不漏的根本

Day 1 用過 RAII（智慧指標），這裡講透。**RAII ＝ 把資源的生命週期，綁在物件的生命週期上**：

- **建構子取得資源**（開檔、配記憶體、上鎖）。
- **解構子釋放資源**（關檔、釋放、解鎖）。
- 物件出作用域時，C++ **保證**呼叫解構子——即使中途 `return`、即使丟出例外。

```cpp
class FileHandle {
    FILE* f_;
public:
    FileHandle(const char* path) { f_ = fopen(path, "r"); }  // 取得
    ~FileHandle() { if (f_) fclose(f_); }                    // 釋放（自動）
};
void read() {
    FileHandle h("data.txt");   // 開檔
    if (error) return;          // ← 即使這裡提早 return，h 的解構子照樣關檔！
}                               // ← 正常結束也一樣
```

> 白話：RAII ＝ **買票進場、離場自動退押金**。物件活著就握資源，物件一死自動還，你不可能忘。

### ★ 為什麼多型基底的解構子要 `virtual`？

這是 Day 2 最常考、最容易漏的點：

```cpp
Controller* c = new PIDController(...);
delete c;   // 如果 ~Controller() 不是 virtual，這裡只呼叫基底解構子！
```

如果 `~Controller()` **沒有 `virtual`**，透過基底指標 `delete` 時，**只會呼叫 `~Controller()`，不呼叫 `~PIDController()`**——子類自己持有的資源（比如它 new 的東西）就漏了，甚至是未定義行為。**規則：只要一個 class 會被當多型基底（有 virtual 函式、會用基底指標 delete 子類），它的解構子就必須 `virtual`。**

## 2.4 `const` 正確性

`const` 是「我保證不改」的承諾，編譯器幫你強制：

```cpp
double get_kp() const { return kp_; }   // const 成員函式：保證不改物件狀態
void process(const Data& d);            // const&：保證不改傳進來的 d（且不複製）
```

`const` 成員函式裡不能改任何成員變數，也不能呼叫非 const 的成員函式。好處：**讀 code 看到 `const` 就知道「這裡不會有副作用」**，且編譯器擋住你手滑改到不該改的。

## 2.5 Move 語意：搬家不是影印

這是現代 C++（C++11 起）最重要、也最難的觀念。問題背景：複製大物件很貴。

```cpp
std::vector<int> a(1000000);   // 一百萬個元素
std::vector<int> b = a;        // 複製：逐一拷貝一百萬個元素（深拷貝，慢）
std::vector<int> c = std::move(a);  // 移動：只把 a 的內部指標轉給 c（O(1)，快）
```

**copy（複製）**：把整個內容複製一份，兩個物件各自獨立。
**move（移動）**：把資源的「所有權」轉手——不複製內容，只把內部那根指向 heap 的指標交給新物件，原物件留空。

> 白話：**複製 ＝ 影印整箱文件；移動 ＝ 把整箱搬過去（只換了個搬運工）。** 搬完原來那箱是空的。

### 三個常見誤會

1. **`std::move` 本身不搬任何東西。** 它只是把物件「轉型成右值（rvalue）」，等於貼上標籤「這個我不要了，可以搬」。真正的搬移發生在接手方的 **move 建構子 / move 賦值**裡。
2. **被 move 走的物件處於「有效但未定義」狀態。** 你不能再依賴它的值（它可能是空 vector、可能是 0），但你可以安全地銷毀它或重新賦值。**move 之後別再讀它。**
3. **右值參考 `T&&`** 是 move 的型別基礎——它是「可以被搬走的臨時物件」的型別標記。函式可以針對 `T&&` 寫一個「偷資源」的版本。

回扣 Day 1：`unique_ptr` 只能 move 不能 copy，正是因為「鑰匙只有一把」——move 把鑰匙交出去，原本那把就變 null。

## 2.6 容器與語法糖（讀 code 會一直遇到）

- `std::vector<T>`：動態陣列（最常用）；`std::array<T,N>`：固定大小；`std::map<K,V>`：鍵值對。
- **範圍 for**：`for (auto& x : vec) {...}`（用 `&` 避免複製）。
- **lambda**：匿名函式 `[capture](args){ body }`，常用來傳 callback（M1 的 timer callback 就是 lambda）。
- **`auto`**：讓編譯器推型別，少打字（`auto p = std::make_unique<Sensor>();`）。

## 2.7 把上面全部串起來：讀 `PIDController` 骨架

這就是 Phase 1 要你寫的東西，先用讀的看懂結構（每行的觀念都在前面講過了）：

```cpp
class Controller {                                    // 抽象基底（介面）
public:
    virtual double update(double err, double dt) = 0; // 純虛 → 子類必實作（2.2）
    virtual ~Controller() = default;                  // ★ 多型基底要 virtual 解構（2.3）
};

class PIDController : public Controller {             // 繼承（2.1）
    double kp_, ki_, kd_, integ_{0}, prev_{0};        // 成員：增益 + 累積狀態
public:
    PIDController(double p, double i, double d)
        : kp_(p), ki_(i), kd_(d) {}                   // 建構子初始化列
    double update(double err, double dt) override {   // override 讓編譯器幫你檢查簽名（2.1）
        integ_ += err * dt;                           // 積分項：誤差對時間累積
        double deriv = (err - prev_) / dt;            // 微分項：誤差變化率
        prev_ = err;                                  // 記住這次誤差，下次算微分用
        return kp_*err + ki_*integ_ + kd_*deriv;      // P + I + D
    }
};
```

逐點回扣：
- `update = 0` 純虛 → 介面與實作分離，換控制律＝換子類。
- `~Controller()` virtual → 用 `Controller*` delete `PIDController` 不漏。
- `override` → 萬一你把簽名打錯（漏了 `dt`），編譯器當場報錯，而不是默默建立一個「新函式」讓多型失效。
- `integ_`、`prev_` 是**跨呼叫保留的狀態**——這正是為什麼控制器要做成物件（有狀態），不是純函式。
- 這條 `kp_*err + ki_*integ_ + kd_*deriv` 的物理意義留到 [M2](m2-cascade-control-diagram.md)：**P 找速度、I 找穩態、D 找阻尼**。

## 2.8 現代 C++ 特性 ↔ 解決什麼痛（對照表）

| 特性 | 解決的痛 | 一句話 |
|---|---|---|
| RAII | 忘了釋放資源 → 漏 | 資源綁物件生命週期，自動還 |
| 智慧指標 | 手動 `new/delete` 三宗罪 | 讓編譯器自動 delete |
| move 語意 | 複製大物件很慢 | 轉手所有權，不深拷貝 |
| `const` 正確性 | 手滑改到不該改的 | 編譯期擋住誤改 |
| `virtual` 解構 | 基底指標 delete 子類漏資源 | 確保子類解構被呼叫 |
| `override` | 簽名打錯導致多型默默失效 | 編譯期檢查覆寫正確 |

## 2.9 Day 2 自我驗收
- [ ] 能解釋虛函式怎麼做到「執行期決定呼叫子類版本」（vtable / 動態分派）
- [ ] 能說明拿掉 `virtual ~Controller()` 會發生什麼、為什麼
- [ ] 能講 RAII 是什麼、為何它是 C++ 不用 GC 卻不漏的根本
- [ ] 能分清 copy vs move，並說明「`std::move` 其實不搬東西」「move 後原物件別再讀」
- [ ] 能逐行說出 `PIDController` 骨架每行用到哪個觀念

---

# 🧵 Day 3 · C++ 多執行緒

前兩天管的是「一條執行緒內的記憶體」。Day 3 進入**多條執行緒同時跑**。為什麼要學這個？因為**飛控本質上就是多執行緒**：感測器讀取、狀態估測（EKF2）、控制計算、通訊，**各跑各的頻率**（IMU 1000Hz、控制 250Hz、GPS 10Hz…），不可能擠在一條線上。學會多執行緒，才讀得懂飛控為何要這樣切分。

## 3.1 起一條執行緒

```cpp
#include <thread>
void work() { /* ... */ }

std::thread t(work);   // 立刻開一條新執行緒跑 work()
t.join();              // 等 t 跑完才繼續（主線在這裡等）
// 或 t.detach();      // 放生：讓它自己跑，主線不等
```

- `join()`：等這條執行緒結束。**忘了 join 也忘了 detach → 程式 crash**（`std::thread` 解構時會檢查）。
- `detach()`：分離，讓它在背景自生自滅。

## 3.2 race condition（競爭條件）：多執行緒的頭號災難

**當兩條執行緒同時讀寫同一塊共享資料，結果取決於誰先誰後 → race condition。**

```cpp
int counter = 0;
void inc() { for (int i=0;i<100000;i++) counter++; }  // counter++ 不是原子操作！

std::thread t1(inc), t2(inc);
t1.join(); t2.join();
// 你以為 counter == 200000，實際往往更小！
```

**為什麼？** `counter++` 其實是三步：①讀 counter ②加 1 ③寫回。兩條執行緒可能同時讀到同一個舊值（比如都讀到 5），各自加 1 寫回 6——**兩次遞增只生效一次**。這種「結果看時序」的 bug 最難抓，因為它**不一定每次都發生**。

## 3.3 mutex + lock_guard：互斥鎖（RAII 再現）

解法：用 **mutex（互斥鎖）**保護共享資料，**一次只准一條執行緒進入臨界區**。

```cpp
#include <mutex>
int counter = 0;
std::mutex m;

void inc() {
    for (int i=0;i<100000;i++) {
        std::lock_guard<std::mutex> lk(m);   // 上鎖（RAII：出作用域自動解鎖）
        counter++;                            // 臨界區：受保護
    }   // ← lk 解構 → 自動 unlock
}
```

- `std::lock_guard` 是 **RAII 上鎖**：建構時 lock、解構時 unlock。**為什麼用它而不是手動 `m.lock()`/`m.unlock()`？** 因為如果中間 `return` 或丟例外，手動的 `unlock()` 會被跳過 → **鎖永遠不放 → deadlock**。lock_guard 保證一定解鎖（又是 RAII！）。

> 白話：mutex ＝ **單間廁所的鑰匙**，一次一人；`lock_guard` ＝ **離開時自動把鑰匙還回去**。

## 3.4 deadlock（死鎖）

兩條執行緒**互相等對方手上的鎖**，誰都不放 → 整個卡死：

```
執行緒1：握著鎖A，想要鎖B
執行緒2：握著鎖B，想要鎖A
→ 永遠互等
```

**避免法**：所有執行緒**用相同順序**取鎖（都先 A 後 B），或用 `std::scoped_lock` 一次鎖多個。

## 3.5 condition_variable：等條件，不空轉

問題：消費者要等生產者放資料。**笨方法**是一直問「有了嗎？有了嗎？」（busy-wait）：

```cpp
while (queue.empty()) { }   // ❌ 空轉燒 CPU，100% 佔用一顆核心
```

**好方法**：用 `condition_variable` **睡著等**，生產者放好資料再「喊醒」：

```cpp
#include <condition_variable>
std::condition_variable cv;

// 消費者：
std::unique_lock<std::mutex> lk(m);
cv.wait(lk, []{ return !queue.empty(); });  // 沒貨就睡（同時放開鎖），有貨被喊醒才繼續

// 生產者放完貨：
cv.notify_one();   // 喊醒一個等待者
```

> 白話：condition_variable ＝ **抽號等叫**。沒輪到你就坐著睡（不佔 CPU），叫號了才醒。

⚠️ `cv.wait` 一定要傳那個 lambda 條件（`[]{ return !queue.empty(); }`）。原因：**spurious wakeup（偽喚醒）**——執行緒可能無緣無故被喚醒。有了條件檢查，醒來發現條件不成立會**再睡回去**，不會在 queue 還空時就去 `front()`（那是未定義行為）。

## 3.6 atomic：無鎖的單變數同步

對「單一變數」的簡單操作，用鎖太重。`std::atomic` 提供**硬體層級保證的原子操作**，無需鎖：

```cpp
#include <atomic>
std::atomic<bool> run{true};   // 多執行緒讀寫 run 都安全，不必加鎖
std::atomic<int> counter{0};
counter++;   // 這個 ++ 是原子的，不會像 3.2 那樣掉數
```

`atomic` 比 mutex 輕量得多。控制環這種「不能容忍延遲」的地方，常用 atomic 或無鎖佇列，**避免上鎖帶來的延遲與抖動**——呼應 [M1](m1-dataflow-diagram.md) 為什麼「gyro 直連角速度環、走低延遲路徑」。

## 3.7 完整範例：producer-consumer（生產者-消費者）

這是多執行緒最經典的模式，也正是飛控「一條線讀感測、一條線處理」的縮影。讀這段，找出每行的角色：

```cpp
std::queue<Imu> q;                       // 共享資源（兩條線都碰）
std::mutex m;
std::condition_variable cv;
std::atomic<bool> run{true};

void producer() {                        // 假裝在讀 IMU
    while (run) {
        Imu d = read();
        { std::lock_guard<std::mutex> lk(m); q.push(d); }  // (A) 上鎖才 push
        cv.notify_one();                                    // 喊醒消費者
    }
}

void consumer() {                        // 拿到資料就濾波
    while (run) {
        std::unique_lock<std::mutex> lk(m);
        cv.wait(lk, []{ return !q.empty() || !run; });      // (B) 等到有貨才醒
        if (!q.empty()) {
            Imu d = q.front(); q.pop();                      // 在鎖內取資料
            lk.unlock();                                     // (C) 先解鎖
            filter(d);                                       // 再做耗時的濾波（不佔鎖）
        }
    }
}
```

**三個關鍵設計（這就是讀懂 code 的考點）：**
- **(A) push 必須在鎖內。** 如果把 `q.push(d)` 移到 `lock_guard` **外面**，兩條線可能同時動 queue → race → 崩潰或掉資料。**圈出共享資源 `q`，碰它的每一行都得在鎖內。**
- **(B) `cv.wait` 的 lambda 防偽喚醒。** 多了 `|| !run` 是為了關閉時也能醒來退出。
- **(C) `filter(d)` 移到鎖外。** 濾波是耗時運算，不碰共享資料，所以**先解鎖再算**——縮短臨界區，讓生產者能繼續 push。**臨界區越短，並行度越高。**

## 3.8 為什麼飛控是多執行緒：接 M1

```
[感測讀取 1000Hz] → [狀態估測 EKF2] → [控制 250Hz] → [通訊 50Hz]
      各自一條執行緒，各自的頻率，靠「訊息佇列」解耦
```

每個模組**各跑各的頻率**，彼此不直接呼叫，而是透過**訊息傳遞**（push 到一個 topic，誰要誰來訂閱）。這種「用佇列解耦」正是上面 producer-consumer 的放大版，也就是 [M1 的 uORB pub/sub](m1-dataflow-diagram.md)。**Day 3 的 producer-consumer 是 uORB 的前傳。**

## 3.9 ⚠️ 最容易誤會
- ❌ 加了 mutex 就一定安全 → ✅ **鎖的範圍不對**（push 在鎖外）照樣 race；**鎖的順序不一致**會 deadlock。
- ❌ 用 `while(q.empty())` 空轉等資料 → ✅ 燒 CPU，該用 `condition_variable` 睡著等。
- ❌ 所有共享變數都該加 mutex → ✅ 單變數的簡單讀寫用 `atomic` 更輕、延遲更低。

## 3.10 Day 3 自我驗收
- [ ] 能解釋 race condition 怎麼發生（用 `counter++` 三步說明）
- [ ] 能說 `lock_guard` 為何優於手動 lock/unlock（RAII 保證解鎖）、deadlock 怎麼來
- [ ] 能說 `condition_variable` 解決什麼、為何 `wait` 要帶條件 lambda
- [ ] 能圈出 producer-consumer 的臨界區，說明 push 為何要在鎖內、filter 為何能移到鎖外
- [ ] 能講飛控為何多執行緒、它如何對應 M1 的 uORB

---

# 🔢 Day 4 · Python 資料處理（NumPy）

C++ 三天結束，轉到 Python。Python 在這個專案的角色：**數值模擬（PID）和 ROS2 通訊**。Day 4 學 NumPy——做數值運算的地基。核心觀念只有一個：**用「整段陣列運算」取代「逐元素的 for 迴圈」**，這叫向量化（vectorization），快幾十到幾百倍。

## 4.1 為什麼 `ndarray` 比 Python `list` 快

| | Python `list` | NumPy `ndarray` |
|---|---|---|
| 內容 | 可以混型別（int、str、物件…）| **同一種型別**（全 float64）|
| 記憶體 | 散落各處（一堆指標）| **一塊連續記憶體** |
| 運算 | 逐元素跑 Python 直譯器（慢）| 底層 C 迴圈、一次處理一整排 |

`ndarray` 把同型別數字塞進**一塊連續記憶體**，運算時交給底層編譯好的 C/SIMD 程式碼跑，省去 Python 直譯器逐個處理的開銷。這就是它快的根本。

```python
import numpy as np
a = np.array([1.0, 2.0, 3.0])   # 一維陣列
b = np.zeros((3, 4))            # 3×4 全零
c = np.arange(0, 1, 0.1)        # [0, 0.1, ..., 0.9]
```

## 4.2 向量化：整批進烤箱

```python
# ❌ for loop 寫法（慢）
result = []
for x in data:
    result.append(x * 2 + 1)

# ✅ 向量化寫法（快幾十倍）
result = data * 2 + 1     # 整個陣列一次運算
```

> 白話：向量化 ＝ **整批進烤箱**（一次烤一盤）；for loop ＝ **一塊一塊烤**。烤箱大小一樣，但你少開關門幾千次。

向量化不只是快，也更短、更好讀。**原則：能用整段陣列運算表達的，就別寫 Python for。**

## 4.3 broadcasting：自動對齊形狀

不同形狀的陣列做運算時，NumPy 會**自動把較小的那個「擴展」對齊**較大的，不用你手動複製：

```python
traj = np.array([[1,2,3],
                 [4,5,6],
                 [7,8,9]])     # 形狀 (3,3)：三個 xyz 點
origin = np.array([1, 1, 1])   # 形狀 (3,)

centered = traj - origin       # 每一列都減掉 origin！結果 (3,3)
# [[0,1,2],
#  [3,4,5],
#  [6,7,8]]
```

`(3,3) - (3,)` 時，NumPy 把 `origin` 沿著列方向「廣播」到每一列。**規則**：從最後一個維度往前比，維度相等或其中一個是 1 就能對齊；否則報錯。

> 白話：broadcasting ＝ **自動把短的那個複製對齊**——但**它多數時候不真的複製記憶體**，是用「視圖」技巧假裝複製，所以省記憶體。

## 4.4 哪種 for「不能」向量化（最重要的邊界）

向量化的前提是**每個元素的計算彼此獨立**。如果計算**有前後依賴**（這一步要用上一步的結果），就**不能**向量化。這個邊界一定要記死。看這個「一階系統階躍響應」——它是 M2 PID 的數值前奏：

```python
# 一階系統 τ·y' + y = u，離散化：y[k+1] = y[k] + dt/τ·(u - y[k])
import numpy as np
dt, tau, T = 0.01, 0.5, 3.0
t = np.arange(0, T, dt)          # ✅ 向量化：時間軸一次生成
y = np.zeros_like(t)             # ✅ 向量化：開一個跟 t 一樣長的零陣列
u = 1.0                          # 階躍輸入（從 0 跳到 1）

for k in range(len(t) - 1):      # ❌ 這個 for 不能向量化！
    y[k+1] = y[k] + dt/tau * (u - y[k])   # y[k+1] 依賴 y[k]：前後相依
```

**為什麼這個 for 不能向量化？** 因為 `y[k+1]` 需要 `y[k]` 算完才能算——這是**時間遞迴**，本質上必須一步步來。但注意：**建 `t`、開 `y`、之後算誤差或畫圖，這些「每個元素獨立」的部分全都該向量化。** 只有這條遞迴迴圈躲不掉。

**對照陷阱**：如果你寫 `t = []; for ...: t.append(...)` 再逐點算，會比 `np.arange` 一次生成慢上百倍。**該向量化的別用 for，不能向量化的（遞迴）才保留 for。**

## 4.5 紙上推導：感受「時間常數」

用 `dt=0.1, τ=0.5, u=1`，手算前幾步（`dt/τ = 0.2`）：

```
y[0] = 0
y[1] = y[0] + 0.2·(1 - 0)   = 0.2
y[2] = y[1] + 0.2·(1 - 0.2) = 0.2 + 0.16 = 0.36
y[3] = y[2] + 0.2·(1 - 0.36)= 0.36 + 0.128 = 0.488
```

看出規律了嗎？**離目標（1）越遠，每步補得越多；越接近，補得越少 → 指數逼近 1。** 系統大約經過 **3–4 個時間常數 τ** 就幾乎到達穩態。

**這條 `y[k+1] = y[k] + dt/τ·(u − y[k])` 就是 [M2](m2-cascade-control-diagram.md) P 控制器的數值直覺**：`(u − y)` 是誤差，誤差越大、修正越猛——這正是比例（P）控制的精神。Day 4 在這裡和 M2 接上。

## 4.6 向量化 vs for 對照（cheat-sheet）

| 任務 | ❌ for 寫法 | ✅ 向量化寫法 |
|---|---|---|
| 建等差陣列 | `t=[];for i...:t.append(i*dt)` | `t = np.arange(0,T,dt)` |
| 逐元素運算 | `for x: r.append(x*2+1)` | `r = a*2 + 1` |
| 條件篩選 | `for x: if x>0: r.append(x)` | `r = a[a > 0]` |
| 求和/平均 | `s=0;for x:s+=x` | `a.sum()` / `a.mean()` |
| 每點減原點 | `for p: r.append(p-o)` | `r = traj - origin`（broadcasting）|

## 4.7 ⚠️ 最容易誤會
- ❌ 所有 for 都能向量化 → ✅ **有前後依賴的遞迴**（時間步進）不行；能向量化的是「對每個元素獨立」的運算。
- ❌ broadcasting 會複製大記憶體 → ✅ 多數是視圖，省記憶體；但**形狀不相容會直接報錯**（不是默默算錯）。

## 4.8 Day 4 自我驗收
- [ ] 能說 `ndarray` 為何比 list 快（同型別 + 連續記憶體 + 底層 C）
- [ ] 能說向量化是什麼、broadcasting 在做什麼、`(N,3)-(3,)` 怎麼一行寫完
- [ ] 能指出上面哪個 for 不能向量化、為什麼（時間遞迴前後相依）
- [ ] 能手算前 3 步 `y`，解釋它怎麼指數逼近 1、幾個 τ 到穩態

---

# ⚡ Day 5 · Python 非同步與工程實務

最後一天：`asyncio`。它解決的問題是「**同時等很多 I/O**」——等網路、等訊息、等感測 stream。這正是 ROS2 通訊的日常：一堆「等訊息進來」的等待。學會它，就懂 ROS2 的回呼模型，也懂 Phase 2 怎麼同時收多個 topic。

## 5.1 核心觀念：單執行緒的協作式並行

先破除最大的誤會：**`asyncio` 不是多執行緒，也不會讓 CPU 運算變快。** 它是**單一執行緒**上的 **event loop（事件迴圈）**，靠協程（coroutine）**互相讓出控制權**來「看起來同時做很多事」。

關鍵在 `await`：

> **`await` ＝「這裡會等一下（通常是等 I/O），我先讓出控制權，event loop 去跑別的協程，等我這邊好了再回來」。**

```python
import asyncio

async def task():            # async def 定義協程
    print("開始")
    await asyncio.sleep(1)   # ← 讓出點：等 1 秒期間，loop 去跑別的協程
    print("結束")            # 1 秒後從這裡接續
```

- **平行（parallel）**：真的同時跑（多核心、多執行緒）。
- **並行 / 並發（concurrent）**：交錯進行，看起來同時，實際是一條線輪流。**asyncio 是後者。**

> 白話：async ＝ **一個廚師顧多個鍋**。這鍋在煮（等 I/O），就轉去顧那鍋；不是請多個廚師（多執行緒）。廚師只有一個，但因為「煮」的時候不用站著看，所以能同時推進好幾鍋。

## 5.2 `async` / `await` / `gather`

```python
import asyncio

async def sensor(name, period):
    while True:
        await asyncio.sleep(period)    # 讓出點：等的時候 loop 去跑別的
        print(f"{name} @ {asyncio.get_event_loop().time():.2f}")

async def main():
    await asyncio.gather(              # 並發跑多個協程
        sensor("imu", 0.1),           # 每 0.1s 一筆
        sensor("gps", 0.5),           # 每 0.5s 一筆
    )

asyncio.run(main())                   # 啟動 event loop
```

- `async def` 定義協程；呼叫它**不會馬上執行**，要 `await` 或丟給 loop 才跑。
- `asyncio.gather(...)`：**並發**跑多個協程（不是依序）。`imu` 和 `gps` 看起來「同時」在印。
- `asyncio.run(main())`：建立 event loop、跑 `main` 直到結束。

**為什麼 imu 和 gps 能「同時」印？** 各自 `await asyncio.sleep` 時都讓出控制權，event loop 在這條線上輪流喚醒到期的那個。單執行緒，卻像並行。

`gather` vs 依序 `await`：
```python
await asyncio.gather(a(), b())   # 並發：a、b 交錯推進
await a(); await b()             # 依序：a 完全做完才開始 b
```

## 5.3 ⚠️ 最大的陷阱：在協程裡用阻塞呼叫

協作式並行的命門：**只要有一個協程「霸佔」控制權不讓出，整個 loop 就卡死。** 最常見的犯法是用同步阻塞呼叫：

```python
async def bad():
    time.sleep(1)        # ❌ 阻塞！這 1 秒整個 loop 卡死，別的協程全停擺
    await asyncio.sleep(1)  # ✅ 非阻塞：讓出控制權，別的協程繼續跑
```

`time.sleep` 是同步阻塞——它不讓出控制權，這條執行緒就傻等，event loop 上**所有**協程一起停。同理，協程裡放一段**純算大矩陣（CPU 密集）**也會卡 loop——因為它一路算到底、中間沒有 `await` 讓出。

**CPU 密集怎麼辦？** async 救不了 CPU 密集。要嘛丟到執行緒池（`loop.run_in_executor`），要嘛用多進程（`multiprocessing`）。**async 只對 I/O 等待有益。**

## 5.4 async vs 多執行緒：怎麼選

| | **asyncio** | **多執行緒（threading）** | **多進程（multiprocessing）** |
|---|---|---|---|
| 平行嗎 | 否（單線協作）| 否*（受 GIL 限制）| 是（真平行）|
| 適合 | **I/O 密集**（等網路/訊息）| I/O 密集（也可，但較重）| **CPU 密集**（重運算）|
| 要不要鎖 | 不用（單線，無 race）| 要（共享狀態有 race）| 各自記憶體，較少 |
| 開銷 | 最輕 | 中 | 重（各自一份記憶體）|
| ROS2 用哪種 | ✅ 回呼/服務本質是這種 | 偶爾 | 重運算節點才用 |

> *CPython 有 GIL（全域直譯器鎖），同一時刻只有一條執行緒跑 Python bytecode，所以多執行緒對 CPU 密集幾乎沒幫助；但 I/O 等待時會釋放 GIL，所以對 I/O 仍有用。

**選擇原則**：等東西（I/O）→ asyncio；重運算（CPU）→ multiprocessing。ROS2 大量「等訊息」的場景，正是 asyncio 的主場。

## 5.5 接 Phase 2：這就是 ROS2 的心智模型

ROS2 的 subscriber callback、service call，本質就是「**等訊息進來 → 處理 → 繼續等**」。Day 5 的 event loop 模型直接套用：一個節點同時訂閱相機、IMU、GPS 多個 topic，就像 `gather` 同時跑多個 `sensor` 協程。**理解「等就讓出」，就理解 ROS2 為什麼能單執行緒顧好多個 topic。**

也因此有個經典坑（[M3 pipeline](m3-perception-pipeline-diagram.md) 會踩到）：**在 callback 裡同步等一個慢操作（比如等 VLM 回覆）會卡住整個 spin**，後續訊息全積壓——解法就是這裡學的「別阻塞、用 async / 丟 executor」。

## 5.6 Python 工程實務（順手帶過，但都會用到）

| 工具 | 解決什麼 | 一句話 |
|---|---|---|
| `venv` | 不同專案依賴打架 | 每個專案一個隔離的虛擬環境 |
| type hints | 看不出參數型別、IDE 不會提示 | `def f(x: int) -> float:` 標型別，給人和工具看 |
| `dataclass` | 寫一堆 `__init__` 樣板 | `@dataclass` 自動生成建構子等 |
| `logging` | 滿地 `print` 無法分級/關閉 | 分級（DEBUG/INFO/ERROR）、可導向檔案 |

```python
from dataclasses import dataclass

@dataclass
class ImuData:           # 自動生成 __init__、__repr__、__eq__
    ax: float
    ay: float
    az: float
    timestamp: int
# 等同手寫一個有 4 個欄位 + 建構子的 class，但少寫十幾行樣板
```

## 5.7 ⚠️ 最容易誤會
- ❌ async ＝ 多執行緒 / 會變快 → ✅ **單執行緒協作式**，只在 I/O 等待時受益；CPU 密集不會變快。
- ❌ 協程裡能隨便 `time.sleep` / 同步阻塞 → ✅ 會卡死整個 loop，要用 `await` 版或丟 executor。
- ❌ `gather` 和依序 `await` 一樣 → ✅ `gather` 並發、依序是 a 完才 b。

## 5.8 Day 5 自我驗收
- [ ] 能解釋 async 是「單執行緒協作式並行」、`await` 是讓出點
- [ ] 能說為何 imu/gps 能「同時」印、`gather` 與依序 `await` 差在哪
- [ ] 能說明協程裡誤用 `time.sleep` / 跑 CPU 密集的後果，以及該怎麼處理
- [ ] 能在 I/O 密集 vs CPU 密集情境選對 async / thread / process
- [ ] 能講 Day 5 的 event loop 如何對應 ROS2 的回呼模型

---

# 🧵 把五天縫成一條線

```
Day1 指標/RAII ┐
Day2 OOP/move  ├─► 看懂「C++ 怎麼安全管資源 + 跑多條線」 ──► M1：讀 offboard_control.cpp 不卡語法
Day3 多執行緒  ┘                                         （飛控＝多模組多執行緒，uORB 解耦）
Day4 NumPy ─► 離散更新 y[k+1]=y[k]+dt/τ·(u−y[k]) ──► M2：P 控制器怎麼逼近目標（數值直覺）
Day5 asyncio ─► 等訊息就讓出（event loop）         ──► Phase2：ROS2 pub/sub 與 Offboard 通訊
```

- **Day1–3（C++）練的是「手指」**：管資源、跑並行。這是讀 [PX4/`px4_ros_com` 原始碼](m1-offboard-walkthrough.md) 的底氣。Day 3 的多執行緒解耦，正是 [M1 uORB pub/sub](m1-dataflow-diagram.md) 的前傳；Day 3「最內環避免鎖」呼應 M1「gyro 直連角速度環、走低延遲」。
- **Day4–5（Python）練的是「算盤 + 耳朵」**：算數值、收訊息。Day 4 的一階系統離散更新，是 [M2 級聯](m2-cascade-control-diagram.md) P 控制器的數值直覺；Day 5 的 event loop 是 [Phase 2 ROS2 通訊](02-phase2-ros2-comm.md) 的心智模型。

> 記法：**有了 Day1–5 這些手感，讀 M1 的 code 才不會字字查語法，調 M2 的參數才知道數字在幹嘛。**

---

# 📊 分級小考（闔上文件再做；答不出回對應 Day）

**🟢 Level 1 · 觀念**
1. `unique_ptr` / `shared_ptr` / `weak_ptr` 各自所有權語義？何時用 weak？（→ §1.4）
2. RAII 是什麼？為何多型基底的解構子要 `virtual`？（→ §2.3）
3. `mutex` 與 `condition_variable` 各解決什麼？race condition 怎麼發生？（→ §3.2/3.3/3.5）

**🟡 Level 2 · 讀 code 抓錯**
4. 那段 `new` 沒配 `delete` / 提早 return 的 code，指出 leak / dangling / double-free 各在哪行、怎麼用智慧指標修。（→ §1.3/1.4）
5. producer-consumer 裡，哪幾行**必須**在鎖內？`filter()` 為何能移到鎖外？（→ §3.7）
6. 哪種 for **不能**向量化？為什麼？（→ §4.4）

**🟡 Level 3 · Python**
7. 向量化為何比 Python for 快？broadcasting 在做什麼？（→ §4.1/4.3）
8. async 是平行嗎？協程裡誤用 `time.sleep` 會怎樣？（→ §5.1/5.3）
9. async vs 多執行緒，I/O 密集 / CPU 密集各該選哪個？（→ §5.4）

**🔴 Level 4 · 串接**
10. Day3 的「多執行緒解耦」如何對應 [M1 dataflow](m1-dataflow-diagram.md) 的 uORB？為何最內層控制環想避免鎖 / 走低延遲？（→ §3.8 + §3.6）
11. Day4 的 `y[k+1]=y[k]+dt/τ·(u−y[k])` 和 [M2](m2-cascade-control-diagram.md) 的 P 控制器有何關係？（→ §4.5）

> **能答 1–9 → 程式手感到位；能答 10–11 → 已接上 M1/M2 介面，可進 [Module 1](m1-guided-reading.md)。**

---

# 🤝 想動手？這樣用我（Claude Code）
- **陪讀**：「帶我逐行看 Day2 的 `PIDController` 骨架，每行問我一題（多型 / RAII / const 各在哪）。」
- **抓錯**：「再給我一段有 race condition 的 C++，我標臨界區、你批改。」
- **☁️ 輕量驗證**：「給我可在 Colab/本機跑的最小 NumPy 階躍響應，跑完對照我紙上推的 y[1..3]。」
- **延伸**：「把 Day5 的雙 stream 擴成 ROS2 `rclpy` talker/listener 玩具，最小改哪幾行？」

➡️ 讀完往下：[Module 1 帶讀](m1-guided-reading.md)（飛控架構與用法）｜對照速覽版 [m0-cpp-python-foundations.md](m0-cpp-python-foundations.md)｜動手版 [01-phase1 Week 1](01-phase1-control-sim.md)
