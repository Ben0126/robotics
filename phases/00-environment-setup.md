# 00 · 開發環境選擇與建置指南

> 本檔給你「選哪個環境」的決策 + 「怎麼建」的逐步指令。
> 你目前在 **Windows 11**，且環境尚未決定，以下給明確推薦。

---

## 1. 環境決策表

| 方案 | 優點 | 缺點 | 適合階段 |
|---|---|---|---|
| **WSL2 (Ubuntu 22.04) ★主推** | Windows 上最務實；安裝簡單；VS Code 無痛整合；GPU passthrough 可用 | GUI（Gazebo/QGC）需 WSLg；極端即時性不如原生 | **Week 1–4 全部 OK** |
| **原生 Linux (Ubuntu 22.04/24.04)** | 相容性/效能/即時性最佳；Isaac Lab 官方支援最好 | 需雙系統或專機 | **Week 5–6 RL/Isaac Lab 建議** |
| **Docker（PX4 官方 image）** | 跨平台一致、可拋棄式 | GUI/GPU 設定較煩；新手除錯成本高 | 備選 / CI / 多版本切換 |

### ✅ 結論
- **Week 1–4（C++/Python、PX4 SITL、ROS2、Gazebo、Offboard）**：用 **WSL2 + Ubuntu 22.04 + ROS2 Humble** 即可全程跑完。
- **Week 5–6（若要做 Isaac Lab / PPO 強化學習）**：需要 NVIDIA GPU，建議切到**原生 Linux** 或租**雲端 GPU（如 vast.ai / RunPod / Lambda）**。純做 VLM 推論 / API 呼叫則 WSL2 也夠。

> 版本搭配口訣：**Ubuntu 22.04 ↔ ROS2 Humble**；Ubuntu 24.04 ↔ ROS2 Jazzy。兩個都是 LTS，二擇一即可，**新手建議 Humble**（社群教學/PX4 範例最多）。

---

## 2. WSL2 建置（主路線）

> 以下指令在 **Windows PowerShell（系統管理員）** 與 **WSL Ubuntu 終端機** 切換執行，已標註。

### 2.1 安裝 WSL2 + Ubuntu（PowerShell）
```powershell
wsl --install -d Ubuntu-22.04
wsl --set-default-version 2
# 安裝完重開機，首次啟動 Ubuntu 設定帳號密碼
wsl --status        # 確認 Default Version: 2
```
WSLg（GUI 支援）在 Win11 已內建，Gazebo / QGroundControl 視窗可直接顯示。

### 2.2 基本工具（WSL Ubuntu）
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git build-essential cmake python3-pip python3-venv ninja-build
```

### 2.3 安裝 ROS2 Humble（WSL Ubuntu）
```bash
# 設定 locale
sudo apt install -y locales && sudo locale-gen en_US en_US.UTF-8
# 加入 ROS2 apt 來源
sudo apt install -y software-properties-common curl
sudo add-apt-repository universe -y
sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key \
  -o /usr/share/keyrings/ros-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] \
http://packages.ros.org/ros2/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) main" \
  | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null
sudo apt update
sudo apt install -y ros-humble-desktop ros-dev-tools
# 每次開終端自動 source（寫進 .bashrc）
echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc && source ~/.bashrc
ros2 doctor   # 健康檢查
```

### 2.4 取得 PX4-Autopilot 原始碼 + 工具鏈（WSL Ubuntu）
```bash
cd ~
git clone https://github.com/PX4/PX4-Autopilot.git --recursive
cd PX4-Autopilot
bash ./Tools/setup/ubuntu.sh      # 自動裝 SITL/Gazebo 相依（裝完重開終端）
```

### 2.5 第一次 SITL + Gazebo 起飛測試（WSL Ubuntu）
```bash
cd ~/PX4-Autopilot
make px4_sitl gz_x500        # 啟動 PX4 SITL + Gazebo Harmonic，x500 四旋翼
# 在 pxh> 提示字元輸入：
pxh> commander takeoff       # 應看到無人機在 Gazebo 中起飛
pxh> commander land
```
> 若 Gazebo 視窗開不起來：先確認 `echo $DISPLAY` 有值；WSLg 通常自動設定。

### 2.6 Micro XRCE-DDS Agent（ROS2 ↔ PX4 橋樑，Week 3–4 才需要）
```bash
cd ~
git clone -b v2.4.2 https://github.com/eProsima/Micro-XRCE-DDS-Agent.git
cd Micro-XRCE-DDS-Agent && mkdir build && cd build
cmake .. && make && sudo make install && sudo ldconfig /usr/local/lib/
# 啟動 agent（之後跑 Offboard 會用到）
MicroXRCEAgent udp4 -p 8888
```

### 2.7 px4_ros_com / px4_msgs 工作區（Week 3–4）
```bash
mkdir -p ~/ws_offboard/src && cd ~/ws_offboard/src
git clone https://github.com/PX4/px4_msgs.git
git clone https://github.com/PX4/px4_ros_com.git
cd ~/ws_offboard
source /opt/ros/humble/setup.bash
colcon build
echo "source ~/ws_offboard/install/setup.bash" >> ~/.bashrc
```

### 2.8 QGroundControl（地面站，選裝）
- 從官網下載 AppImage：<https://qgroundcontrol.com/downloads/>
- WSL 中 `chmod +x QGroundControl.AppImage && ./QGroundControl.AppImage`（WSLg 顯示）。

---

## 3. 原生 Linux / 雲端 GPU（Week 5–6 RL 路線）
- Ubuntu 22.04/24.04 + 最新 NVIDIA 驅動 + CUDA。
- **Isaac Lab** 安裝參考官方文件（基於 Isaac Sim）：需 RTX GPU（建議 ≥ 8GB VRAM，跑得舒服 ≥ 12GB）。
- 無實體 GPU → 雲端方案（RunPod / vast.ai / Lambda）租 RTX 4090 / A100，按時計費做 PPO 訓練。
- 純 VLM 推論 / API 呼叫（Week 5）不需要這套，WSL2 + 一張中階 GPU 或純 API 即可。

---

## 4. Docker 備選
```bash
# PX4 官方開發 image（含 SITL 工具鏈）
docker run -it --privileged \
  -e DISPLAY=$DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  px4io/px4-dev-simulation-jammy bash
```
> GUI 需處理 X11 forwarding；GPU 需 `--gpus all` + nvidia-container-toolkit。新手不建議當主環境。

---

## 5. 環境自我驗收 ✅
完成以下代表環境就緒（對應 [progress-tracker.md](progress-tracker.md) 的 Setup checkpoint）：
- [ ] `ros2 doctor` 無重大錯誤、`ros2 topic list` 可執行
- [ ] `make px4_sitl gz_x500` 能成功編譯並開啟 Gazebo
- [ ] `commander takeoff` 能讓 Gazebo 中無人機起飛
- [ ] `MicroXRCEAgent udp4 -p 8888` 能啟動（Week 3 前確認即可）
- [ ] `colcon build` 在 `~/ws_offboard` 成功（Week 3 前確認即可）

➡️ 環境就緒後，前往 [Phase 1：Week 1](01-phase1-control-sim.md)。
