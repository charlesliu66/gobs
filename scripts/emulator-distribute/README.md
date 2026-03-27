# Emulator TikTok 分发

替代 GeeLark 云手机，通过**本地 Android 模拟器 + ADB** 上传 TikTok 视频。

参考项目：[edde746/tiktok-uploader](https://github.com/edde746/tiktok-uploader)

---

## 前置条件

1. **安装模拟器**：LDPlayer（推荐，ADB 端口 5554）或 BlueStacks
2. **安装 TikTok**：在模拟器内从应用商店安装 TikTok，并登录目标账号
3. **启用 ADB**：
   - LDPlayer：设置 → 其他设置 → 打开 ADB 调试
   - BlueStacks：设置 → 高级 → 启用 ADB
4. **安装 Android Platform-Tools**：https://developer.android.com/tools/releases/platform-tools
5. **安装 Python 依赖**：`pip install -r requirements.txt`

---

## 验证 ADB 连接

```bash
adb connect 127.0.0.1:5554
adb devices
```

应看到 `127.0.0.1:5554 device`。

---

## 用法

### 方式一：直接调用

```bash
cd QAS/scripts/emulator-distribute

# 指定视频
node distribute.js --video "C:\path\to\video.mp4" --caption "文案"

# 使用 latest.json（video-pipeline 刚生成的成片）
node distribute.js --latest --caption "文案"
```

### 方式二：通过 video-create-distribute

```bash
cd ~/.cursor/skills/video-create-distribute
node scripts/distribute.js --emulator --latest --caption "文案"
```

---

## 配置

编辑 `config.json`：

| 字段 | 说明 | 默认 |
|------|------|------|
| device | ADB 设备地址 | 127.0.0.1:5554 |
| aiVideosPath | Ai Videos 路径 | 从 geelark.json 读取 |
| latestJsonPath | latest.json 路径 | 同上 |
| deviceStoragePath | 模拟器内存储路径 | Pictures/TTUploader |

**多开模拟器**：每个实例端口不同，如 LDPlayer 多开为 5554、5556、5558，修改 `device` 为对应地址。

---

## 故障排查

| 问题 | 处理 |
|------|------|
| `TikTok 未找到` | 在模拟器内安装 TikTok App |
| `adb devices` 无设备 | 检查模拟器已启动、ADB 已启用，执行 `adb connect 127.0.0.1:5554` |
| `uiautomator` 导入失败 | `pip install uiautomator` |
| 上传进度条一直存在 | TikTok 界面可能更新，需用 `weditor` 或 `dump.py` 重新抓取元素，更新 `api/uploader.py` 中的 `resourceId` |
| 选择视频失败 | 等待相册加载，或检查 RecyclerView 结构是否变化 |

---

## 目录结构

```
emulator-distribute/
├── config.json
├── distribute.js      # Node 入口
├── upload_tiktok.py   # Python CLI
├── api/
│   └── uploader.py    # 上传逻辑（参考 tiktok-uploader）
├── to_upload/         # 临时目录（自动创建）
└── requirements.txt
```
