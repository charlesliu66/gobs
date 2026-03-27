# 模拟器 TikTok 分发 - 安装与配置指南

本文档为 `scripts/emulator-distribute` 的详细安装步骤。

---

## 一、安装模拟器

### 推荐：LDPlayer

1. 下载：https://www.ldplayer.net/
2. 安装后启动
3. 设置 → 其他设置 → **打开 ADB 调试**
4. 默认 ADB 端口：**5554**

### 备选：BlueStacks

1. 下载：https://www.bluestacks.com/
2. 设置 → 高级 → **启用 ADB 连接**
3. ADB 端口：每次启动可能变化，在设置中查看或通过 `netstat -ano | findstr "LISTENING"` 查找

---

## 二、安装 TikTok 并登录

1. 在模拟器内打开应用商店（Google Play 或 LD 商店）
2. 搜索并安装 **TikTok**
3. 打开 TikTok，使用目标账号登录
4. 确保账号可正常浏览、上传

---

## 三、安装 ADB

### Windows

1. 下载 Platform-Tools：https://developer.android.com/tools/releases/platform-tools
2. 解压到如 `C:\platform-tools`
3. 将 `C:\platform-tools` 加入系统 PATH

### 验证

```powershell
adb version
adb connect 127.0.0.1:5554
adb devices
```

应看到 `127.0.0.1:5554 device`。

---

## 四、安装 Python 依赖

```bash
cd QAS/scripts/emulator-distribute
pip install -r requirements.txt
```

---

## 五、首次测试

1. 确保模拟器已启动，TikTok 已登录
2. 将任意 MP4 视频放入 `to_upload/` 目录
3. 执行：

```bash
python upload_tiktok.py --caption "测试"
```

若成功，视频会发布到 TikTok。

---

## 六、与 video-create-distribute 集成

```bash
cd C:\Users\wei.liu\.cursor\skills\video-create-distribute
node scripts/distribute.js --emulator --latest --caption "文案"
```

需确保 `QAS/scripts/emulator-distribute` 存在，或设置环境变量 `QAS_ROOT` 指向 QAS 项目根目录。
