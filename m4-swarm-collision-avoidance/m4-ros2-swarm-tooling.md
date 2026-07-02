# 🔧 M4③ ROS2 群飛工具鏈與擴展性筆記（20 台規模）

> 你的環境已經用 ROS2 + PX4（見 [resources.md](../resources.md) 的 uXRCE-DDS 路線）跑單機。這份筆記聚焦「從 1 台變 20 台」時，ROS2/DDS 層會遇到的新問題，以及現成的開源工具可以省下多少重造輪子的力氣。
> 上一份：[m4-collision-avoidance-diagnosis.md](m4-collision-avoidance-diagnosis.md)｜回到：[m4-swarm-guided-reading.md](m4-swarm-guided-reading.md)

---

## 1. 開源群飛框架：先看有沒有輪子可以借

| 工具 | 說明 | 適合你嗎 |
|---|---|---|
| **Crazyswarm2**（IMRCLab，MIT License）<br>[github.com/IMRCLab/crazyswarm2](https://github.com/IMRCLab/crazyswarm2) | ROS2 群飛測試平台，原生支援 Bitcraze Crazyflie 系列（含 Crazyflie 2.1、Bolt 客製機型），有完整的多機命名空間、群飛啟動腳本、與模擬後端。是原始 Crazyswarm（ICRA 2017, Preiss et al.）的 ROS2 移植版。 | **架構參考價值高，機型不同**：Crazyflie 是室內小型機，你若是 PX4 戶外機隊，不能直接套用其飛控介面，但它的**命名空間設計、多機啟動架構、座標系管理**非常值得抄——尤其是它示範了「1 個地面站節點 + N 個機身命名空間」怎麼組織。 |
| **PX4 Multi-Vehicle Simulation**（PX4 官方）<br>[docs.px4.io](https://docs.px4.io/main/en/simulation/multi-vehicle-simulation.html) | PX4 SITL 官方支援用 `gz_x500` 等模型起多個 instance，每個 instance 對應一個獨立的 uXRCE-DDS session 與 ROS2 命名空間，可在同一台開發機模擬整個機隊。 | ✅ **你目前 SITL 路線的直接延伸**——先在這裡把 20 台的邏輯跑順，再上實機。 |
| **RVO2 Library**（UNC GAMMA）<br>[gamma.cs.unc.edu/RVO2](https://gamma.cs.unc.edu/RVO2/) | ORCA 演算法的官方 C++/Python 實作，開源、輕量、無外部依賴，是避碰模組落地 ORCA 最省力的路徑。 | ✅ 若採納 [M4②](m4-collision-avoidance-diagnosis.md) 建議把 ORCA 當 baseline，這是最快的實作起點——包一層 ROS2 node 訂閱鄰機狀態、發布安全速度即可。 |
| **BehaviorTree.CPP + `groot2`** | 行為樹框架，PX4 生態圈（包括 `px4-behavior-tree` 相關實驗性專案）常用它來組織「起飛→巡邏→脫隊任務→歸隊→降落」這種有分支、有中斷條件的任務邏輯。 | ◐ 適合你 [M4①§4](m4-swarm-guided-reading.md) 的脫隊/歸隊任務邏輯，比寫一堆 if-else 的狀態機更好維護，值得評估導入。 |

---

## 2. ROS2 在 20 台規模下會冒出來的新問題

單機時你不會注意到的東西，20 台之後全部浮上檯面：

### 2a. DDS 探索（Discovery）風暴
ROS2 預設的 DDS 探索機制是**每個節點都用多播（multicast）跟所有其他節點互相交換「我在這裡」的訊息**。節點數是 N 台，光是探索階段的訊息量就跟 N² 成長關係。20 台機、每台跑好幾個節點，探索流量會在 WiFi/區網環境下變得不可忽視，甚至造成節點啟動緩慢或探索失敗。

**解法**：改用 **Discovery Server 模式**（Fast DDS 官方支援，ROS2 Humble/Jazzy 皆可用）——把探索改成「集中式伺服器」架構，所有節點只跟一台 Discovery Server 對話，而非互相多播，把 O(N²) 的探索流量降成 O(N)。地面站（leader 所在機）是很自然的 Discovery Server 部署位置。

### 2b. 命名空間設計
每台僚機的所有 topic/node/TF frame 都要有清楚的命名空間，否則 20 台機的 `/pose`、`/cmd_vel` 會互相打架。慣例做法（Crazyswarm2 就是這樣設計）：
```
/drone_01/pose
/drone_01/cmd_vel
/drone_02/pose
/drone_02/cmd_vel
...
```
TF frame 也要比照：`drone_01/base_link` 相對 `map`，避免所有機共用同一個 `base_link` frame id。

### 2c. QoS 設定：避碰用的高頻廣播該選哪種
避碰演算法需要每台機**高頻**廣播自己的位置/速度給鄰機（例如 20–50Hz）。這類資料的 QoS 建議：
- **Reliability：Best Effort**（不是 Reliable）——位置資料是「新的蓋掉舊的」，丟一幀無所謂，用 Reliable 的重傳機制反而在網路壅塞時把延遲越拖越長，對即時避碰是負面效果。
- **History：Keep Last, depth=1**——只在乎「最新一筆」，不需要佇列。
- 這跟你在 M3 pipeline 筆記里學到的「相機影像用 best-effort」是同一個道理：**高頻、可容忍丟幀的資料一律 best-effort**，需要保證送達的指令類（如任務指派、起降指令）才用 reliable。

### 2d. 頻寬與延遲：廣播式 vs. 地面站中繼
20 台機互相廣播位置/速度，理論頻寬需求隨 N² 成長（每台都要收到其餘 19 台的資料）。兩種常見架構：
- **去中心化廣播（peer-to-peer multicast）**：延遲最低，但頻寬需求隨機數增加最快，WiFi 環境下 20 台左右就可能開始出現壅塞。
- **地面站中繼（star topology）**：所有機把狀態送到地面站，地面站彙整後廣播「全機隊狀態摘要」回去。頻寬需求變成 O(N)，但多一跳延遲，且地面站變成單點故障——需要搭配 §2a 的 Discovery Server 一起設計容錯（例如 leader 機身兼地面站角色，並有備援機制）。

**讀到這裡停一下 ⏸**：這幾項工程設定（Discovery Server、命名空間、QoS、廣播拓樸）正是 [M4②§2](m4-collision-avoidance-diagnosis.md) 提到「通訊延遲/丟包」病灶的具體來源。如果你現有模組還沒特別處理 Discovery Server 或 QoS，這通常是「20 台一起飛比 5 台明顯變差」的頭號嫌疑犯，值得優先排查。

---

## 3. 給你的落地建議（依優先序）

1. **先在 PX4 SITL 多機模擬里把 20 台的通訊拓樸跑起來**，量測實際的探索時間、topic 延遲、CPU/頻寬占用，再決定要不要上 Discovery Server。
2. **統一命名空間規範**（`/drone_XX/...`），現在補上比之後 20 台都寫死了再改便宜很多。
3. **避碰用的狀態廣播 topic 一律 best-effort + keep-last(1)**，任務指派/起降指令等關鍵指令維持 reliable。
4. **評估 BehaviorTree.CPP** 來組織「巡邏/脫隊/任務/歸隊」的任務邏輯，比起自己刻狀態機更容易除錯與擴充。
5. **參考 Crazyswarm2 的專案結構**（即使機型不同）取經其地面站/命名空間/啟動腳本設計。

---

## 4. 分級小考

**🟢 Level 1**
1. 為什麼 ROS2 預設的 DDS 探索機制在 20 台規模下會出問題？Discovery Server 怎麼解決？
2. 避碰用的高頻位置廣播，QoS 該選 Reliable 還是 Best Effort？為什麼？

**🟡 Level 2**
3. 去中心化廣播 vs. 地面站中繼，兩種拓樸的頻寬/延遲/容錯 trade-off 各是什麼？

**🔴 Level 3**
4. 如果你現在的 20 台機都還沒有統一命名空間規範，你會怎麼設計一個遷移方案，讓改動範圍最小？

➡️ 回到 [README](../README.md)｜上一份：[避碰演算法診斷](m4-collision-avoidance-diagnosis.md)｜下一份：[論文清單](m4-papers-reading-list.md)
