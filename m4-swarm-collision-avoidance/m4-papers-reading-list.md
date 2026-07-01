# 📑 M4④ 群飛 / 避碰 必讀論文清單（Annotated Reading List）

> 格式與根目錄 [papers-reading-list.md](../papers-reading-list.md) 一致：每篇標註**難度**與**為何讀**。
> 難度：🟢 入門概念 ／ 🟡 方法細節 ／ 🔴 進階/重現級。
> 所有連結皆已透過網路搜尋逐篇查證（arXiv ID / DOI / 會議出處），少數僅能查到 DOI/標題但作者名單未逐字核對者，已於備註標明。

---

## A · 隊形控制 / 群飛基礎理論（對應 [M4①](m4-swarm-guided-reading.md)）

| 論文 | 出處 | 難度 | 為何讀 |
|---|---|---|---|
| **Flocks, Herds, and Schools: A Distributed Behavioral Model** — Craig W. Reynolds | *Computer Graphics* (SIGGRAPH '87 Proceedings), 21(4), pp. 25–34, 1987 | 🟢 | **Boids 模型原始論文**，行為式群飛/去中心化湧現行為的起點，即使不用這套架構也該懂它的三條局部規則。 |
| **Consensus and Cooperation in Networked Multi-Agent Systems** — Olfati-Saber, Fax, Murray | *Proceedings of the IEEE*, 95(1), pp. 215–233, 2007 · [DOI:10.1109/JPROC.2006.887293](https://doi.org/10.1109/JPROC.2006.887293) | 🟡 | 共識演算法的經典綜述，分散式隊形控制的數學基礎，理解「去中心化如何保證收斂」的必讀奠基作。 |
| **Advancement Challenges in UAV Swarm Formation Control: A Comprehensive Review** — Bu, Yan, Yang | *Drones*, 8(7), 320, 2024 · [DOI:10.3390/drones8070320](https://doi.org/10.3390/drones8070320) | 🟢 | **先讀這篇建立全貌**：涵蓋 leader-follower / virtual structure / behavior-based / consensus-based / APF 及 AI/RL 方法的完整分類與比較，開放取用。 |
| A Comprehensive Review of UAV Formation Control from a Mission-Driven Perspective | *Drones*, 10(4), 278, 2026 · DOI:10.3390/drones10040278 | 🟢 | 2026 年最新綜述，從「任務導向」角度切入隊形控制，適合對照你的「脫隊執行任務」需求場景。⚠️ 作者名單未逐字核對，讀前請自行於 MDPI 官網確認。 |
| **A Formal Analysis and Taxonomy of Task Allocation in Multi-Robot Systems** — Gerkey, Matarić | *International Journal of Robotics Research*, 23(9), pp. 939–954, 2004 · [DOI:10.1177/0278364904045564](https://doi.org/10.1177/0278364904045564) | 🟡 | **MRTA 分類法經典**，對應 [M4①§4a](m4-swarm-guided-reading.md#4a-任務分配multi-robot-task-allocation-mrta)，幫你判斷自己的「脫隊任務指派」問題屬於哪一類、該用什麼複雜度的演算法。 |
| **Towards a Swarm of Agile Micro Quadrotors** — Kushleyev, Mellinger, Powers, Kumar | RSS 2012 · [DOI:10.15607/RSS.2012.VIII.028](https://doi.org/10.15607/RSS.2012.VIII.028)；期刊版 *Autonomous Robots*, 2013 · [DOI:10.1007/s10514-013-9349-9](https://doi.org/10.1007/s10514-013-9349-9) | 🟡 | UPenn GRASP Lab（Vijay Kumar 團隊）**20 台微型四旋翼群飛實機展示**，規模與你的目標幾乎一致，強烈建議精讀其系統架構。 |
| **Programmable self-assembly in a thousand-robot swarm** — Rubenstein, Cornejo, Nagpal | *Science*, 345(6198), pp. 795–799, 2014 · [DOI:10.1126/science.1254295](https://doi.org/10.1126/science.1254295) | 🟡 | Harvard Kilobots——千台等級地面機器人自組裝，理解「純去中心化、極簡通訊」群體智慧的天花板案例（非 UAV，但架構思路值得對照）。 |
| **SwarmGPT: Combining Large Language Models with Safe Motion Planning for Drone Swarm Choreography** — Jiang et al. | arXiv:2412.08428, 2024 | 🔴 | 用 LLM 生成群飛編舞、疊加安全運動規劃層，實機驗證 20 台、模擬驗證達 200 台，展示「高階任務指令 → 安全軌跡」的現代路線，對你「脫隊任務」的指令介面設計有參考價值。 |

> ⚠️ **重要澄清**：查資料常會看到 Intel Shooting Star（千台等級）、EHang（22,580 台，2026 年金氏世界紀錄）等超大型無人機秀。這些是**中央離線預先規劃**的表演，機間不通訊、機上無避碰感測器，跟你要做的「線上即時避碰 + 動態任務」在技術本質上不同，細節見 [M4①§3](m4-swarm-guided-reading.md#3-重要澄清你以為的群飛表演其實不是你要做的群飛)。

---

## B · 避碰演算法（對應 [M4②](m4-collision-avoidance-diagnosis.md)）

### B1 · 人工勢場（APF）
| 論文 | 出處 | 難度 | 為何讀 |
|---|---|---|---|
| **Real-Time Obstacle Avoidance for Manipulators and Mobile Robots** — Oussama Khatib | *International Journal of Robotics Research*, 5(1), pp. 90–98, 1986 · [DOI:10.1177/027836498600500106](https://doi.org/10.1177/027836498600500106) | 🟢 | APF 原始論文，理解其「局部極小值」「震盪」等已知限制的源頭，讀完才知道為何業界後來轉向 VO/ORCA 系列。 |

### B2 · 速度障礙物系列（VO / RVO / ORCA）
| 論文 | 出處 | 難度 | 為何讀 |
|---|---|---|---|
| **Reciprocal Velocity Obstacles for Real-Time Multi-Agent Navigation** — van den Berg, Guy, Lin, Manocha | ICRA 2008, pp. 1928–1935 | 🟡 | RVO 原始論文，速度空間避碰的關鍵過渡（從 VO 到後來 ORCA 的橋樑）。 |
| **Reciprocal n-Body Collision Avoidance**（ORCA） — van den Berg, Guy, Lin, Manocha | ISRR 2011, Springer Tracts in Advanced Robotics vol. 70, pp. 3–19 | 🟡 | **業界避碰基線首選**，把互惠避碰化簡成低維度線性規劃，[M4②](m4-collision-avoidance-diagnosis.md) 建議的第一個 baseline，配合 [RVO2 Library](m4-ros2-swarm-tooling.md) 開源實作直接可用。 |
| Optimal Reciprocal Collision Avoidance for Multiple Non-Holonomic Robots（NH-ORCA） — Alonso-Mora, Breitenmoser, Rufli, Beardsley, Siegwart | DARS 2010, Springer Tracts in Advanced Robotics vol. 83, pp. 203–216 · [DOI:10.1007/978-3-642-32723-0_15](https://doi.org/10.1007/978-3-642-32723-0_15) | 🟡 | 把 ORCA 從全向點機器人擴展到**非完整約束（non-holonomic）機器人**（差速輪/類車/氣墊船），若你的僚機動力學不是簡單全向模型，這篇是必讀擴展。 |
| Smooth and Collision-Free Navigation for Multiple Robots Under Differential-Drive Constraints（ORCA-DD） — Snape, van den Berg, Guy, Manocha | IROS 2010, Taipei, pp. 4584–4589 | 🟡 | ORCA 對差速驅動機器人的另一擴展，跟 NH-ORCA 互補參照。 |
| Reciprocal Collision Avoidance with Acceleration-Velocity Obstacles（AVO） — van den Berg, Snape, Guy, Manocha | ICRA 2011, Shanghai | 🟡 | 處理 ORCA「瞬時速度可任意改變」的不實際假設，加入加速度約束，更貼近真實無人機動力學限制。 |
| **3-D Reciprocal Collision Avoidance on Physical Quadrotor Helicopters with On-Board Sensing for Relative Positioning** — Conroy, Bareiss, Beall, van den Berg | arXiv:1411.3794, 2014 | 🟡 | ORCA **在真實四旋翼上的 3D 實機驗證**，含機載相對定位感測，是你評估 ORCA 能否落地的直接參考案例。 |
| Generalized Reciprocal Collision Avoidance — Bareiss, van den Berg | *International Journal of Robotics Research*, 2015 · [DOI:10.1177/0278364915576234](https://doi.org/10.1177/0278364915576234) | 🔴 | 把互惠避碰理論推廣到任意動力學/控制空間，進階讀物，若前面幾篇的擴展仍不夠貼合你的機型可再深入。 |

### B3 · 緩衝 Voronoi 胞（BVC）
| 論文 | 出處 | 難度 | 為何讀 |
|---|---|---|---|
| **Fast, On-line Collision Avoidance for Dynamic Vehicles Using Buffered Voronoi Cells** — Zhou, Wang, Bandyopadhyay, Schwager | *IEEE Robotics and Automation Letters*, 2(2), pp. 1047–1054, 2017 · [DOI:10.1109/LRA.2017.2656241](https://doi.org/10.1109/LRA.2017.2656241) | 🟡 | Stanford MSL（Schwager 團隊）提出，**只需相對位置、不需通訊速度/意圖**即可證明安全，若你的機隊感測條件受限（例如僅測距/視覺），這是 ORCA 的實用替代方案。 |

### B4 · 控制屏障函數（CBF）
| 論文 | 出處 | 難度 | 為何讀 |
|---|---|---|---|
| **Control Barrier Functions: Theory and Applications** — Ames, Coogan, Egerstedt, Notomista, Sreenath, Tabuada | ECC 2019, pp. 3420–3431 · [DOI:10.23919/ECC.2019.8796030](https://doi.org/10.23919/ECC.2019.8796030) | 🟡 | CBF 理論總覽，理解「用最小修正量保證安全」這個思路，[M4②](m4-collision-avoidance-diagnosis.md) 建議可疊加在既有隊形邏輯外層的「安全氣囊」做法即出自此類方法。 |
| Decentralized Collision Avoidance With Dynamics Constraints for Agile Quadrotor Swarms（DCAD） | *IEEE Robotics and Automation Letters*, 2020 · arXiv:1909.03961 | 🔴 | 結合 ORCA 思路與 MPC 動力學約束的四旋翼群避碰，是 B2+CBF/MPC 混合路線的具體案例；⚠️ 完整作者名單本次未逐字核對。 |

### B5 · 學習式 / 強化學習避碰
| 論文 | 出處 | 難度 | 為何讀 |
|---|---|---|---|
| **Decentralized Non-communicating Multiagent Collision Avoidance with Deep Reinforcement Learning**（CADRL） — Chen, Liu, Everett, How | ICRA 2017 · [DOI:10.1109/ICRA.2017.7989037](https://dl.acm.org/doi/10.1109/ICRA.2017.7989037) | 🟡 | 學習式避碰奠基作：訓練價值網路把「自身+可觀測鄰機狀態」映射到偏好速度，去中心化、不需通訊。理解其**沒有形式化安全保證**這個限制，是評估要不要走這條路線的關鍵。 |
| Motion Planning Among Dynamic, Decision-Making Agents with Deep Reinforcement Learning（GA3C-CADRL） — Everett, Chen, How | IROS 2018 · [arXiv:1805.01956](https://arxiv.org/abs/1805.01956) | 🔴 | CADRL 的 LSTM 擴展版，處理**可變數量的鄰機**，機數增加時表現優於原版 CADRL，適合想量化評估學習式方法在 20 機規模下的可擴展性。 |

---

## 🗓️ 建議閱讀順序

1. **建立地圖**（半天）：A 表的 Bu/Yan/Yang UAV 群飛綜述 → Gerkey & Mataric MRTA → 回頭讀完 [M4①](m4-swarm-guided-reading.md)。
2. **避碰基線**（1 天）：Khatib APF → van den Berg RVO(2008) → ORCA(2011)，對照 [M4②](m4-collision-avoidance-diagnosis.md) 的症狀表，同時動手把 [RVO2 Library](m4-ros2-swarm-tooling.md) 跑起來做基線比較。
3. **貼近你的機型**（依需求挑）：若非全向動力學 → NH-ORCA/ORCA-DD；若感測受限 → BVC；若想在既有邏輯外層加安全過濾 → CBF 總覽。
4. **深讀進階**（Week 8 式深讀）：UPenn 20 機實機展示 + Conroy et al. 四旋翼 3D ORCA 實機驗證，這兩篇規模/機型都最貼近你的專案，值得逐段精讀並對照你現有系統的落差。
5. **前沿/延伸**：SwarmGPT（LLM 任務指令介面）、CADRL/GA3C-CADRL（學習式路線的可擴展性參考）。

➡️ 回到 [README](../README.md)｜[群飛與隊形控制入門](m4-swarm-guided-reading.md)｜[避碰演算法診斷](m4-collision-avoidance-diagnosis.md)｜[ROS2 群飛工具鏈](m4-ros2-swarm-tooling.md)
