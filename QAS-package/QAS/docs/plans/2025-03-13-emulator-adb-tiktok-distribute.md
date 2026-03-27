# 模拟器 + ADB 分发 TikTok 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 用本地 Android 模拟器 + ADB 自动化替代 GeeLark，实现 TikTok 视频分发，与现有 video-create-distribute 流程对接。

**Architecture:** 新增 `emulator-distribute` 模块，复用 edde746/tiktok-uploader 的 ADB + uiautomator 思路，通过 `adb push` 将视频推入模拟器，再用 uiautomator 模拟点击完成上传。通过 `distribute-emulator.js` 脚本与 video-create-distribute 保持一致的 CLI 入口。

**Tech Stack:** Node.js（主入口）、Python（uiautomator 脚本）、ADB、LDPlayer/BlueStacks

---

## 前置依赖（用户手动完成）

| 步骤 | 操作 |
|------|------|
| 1 | 安装 LDPlayer 或 BlueStacks（推荐 LDPlayer，ADB 端口固定 5554） |
| 2 | 在模拟器内安装 TikTok App 并登录目标账号 |
| 3 | 启用模拟器 ADB：LDPlayer 设置 → 其他设置 → 打开 ADB 调试 |
| 4 | 安装 Android SDK Platform-Tools（含 adb）：https://developer.android.com/tools/releases/platform-tools |
| 5 | 验证：`adb connect 127.0.0.1:5554` 后 `adb devices` 能看到设备 |

---

## Task 1: 创建 emulator-distribute 目录结构

**Files:**
- Create: `QAS/scripts/emulator-distribute/package.json`
- Create: `QAS/scripts/emulator-distribute/config.json`
- Create: `QAS/scripts/emulator-distribute/README.md`

**Step 1: 创建 package.json**

```json
{
  "name": "emulator-distribute",
  "version": "1.0.0",
  "description": "TikTok upload via Android emulator + ADB",
  "main": "distribute.js",
  "scripts": {
    "distribute": "node distribute.js",
    "upload": "node run-upload.js"
  }
}
```

**Step 2: 创建 config.json**

```json
{
  "adbHost": "127.0.0.1",
  "adbPort": 5554,
  "aiVideosPath": "C:\\Users\\wei.liu\\Desktop\\cursor_try\\Ai Videos",
  "deviceStoragePath": "/sdcard/Pictures/TTUploader"
}
```

**Step 3: 创建 README.md**

```markdown
# Emulator TikTok 分发

替代 GeeLark，通过本地模拟器 + ADB 上传 TikTok。

## 前置

1. 安装 LDPlayer/BlueStacks，安装 TikTok 并登录
2. 启用 ADB，执行 `adb connect 127.0.0.1:5554`
3. 安装 Python 3 + `pip install uiautomator2`

## 用法

node distribute.js --video "path/to/video.mp4" [--caption "文案"]
```

**Step 4: Commit**

```bash
git add QAS/scripts/emulator-distribute/
git commit -m "feat: add emulator-distribute scaffold"
```

---

## Task 2: 实现 Node 主入口 distribute.js

**Files:**
- Create: `QAS/scripts/emulator-distribute/distribute.js`

**Step 1: 实现 distribute.js**

- 解析 `--video`、`--caption`、`--latest`
- 若 `--latest`，从 `config.latestJsonPath` 或 `Ai Videos/latest.json` 读取成片路径
- 将视频复制到临时目录 `to_upload/`（Python 脚本工作目录）
- 调用 `python upload_tiktok.py --video <path> --caption <caption>`
- 输出成功/失败

**Step 2: 验证**

运行：`node distribute.js --help` 或 `node distribute.js --latest`（需有 latest.json）

**Step 3: Commit**

```bash
git add QAS/scripts/emulator-distribute/distribute.js
git commit -m "feat: emulator-distribute main entry"
```

---

## Task 3: 实现 Python 上传脚本 upload_tiktok.py

**Files:**
- Create: `QAS/scripts/emulator-distribute/upload_tiktok.py`
- Create: `QAS/scripts/emulator-distribute/requirements.txt`

**Step 1: requirements.txt**

```
uiautomator2>=2.16.0
```

**Step 2: 实现 upload_tiktok.py**

参考 edde746/tiktok-uploader 的 `api/uploader.py` 逻辑，适配：

- 使用 `uiautomator2` 连接 `config.adbHost:config.adbPort`
- 接收 `--video`、`--caption` 参数
- 将视频 `adb push` 到 `deviceStoragePath`
- 启动 TikTok → 点击上传 → 选择视频 → 填写描述 → 点击 Post
- 轮询等待上传完成（可参考 resourceId 或进度条）
- 若 TikTok 界面有变化，需用 `weditor` 或 `dump.py` 更新元素定位

**Step 3: 验证**

在模拟器已启动、TikTok 已登录的前提下：

```bash
pip install -r requirements.txt
python upload_tiktok.py --video "C:\path\to\test.mp4" --caption "test"
```

**Step 4: Commit**

```bash
git add QAS/scripts/emulator-distribute/upload_tiktok.py requirements.txt
git commit -m "feat: Python ADB upload script for TikTok"
```

---

## Task 4: 集成到 video-create-distribute

**Files:**
- Modify: `C:\Users\wei.liu\.cursor\skills\video-create-distribute\scripts\distribute.js`
- Create: `QAS/config/emulator.json`（可选，用于覆盖默认 ADB 端口等）

**Step 1: 在 distribute.js 中增加 --emulator 分支**

当传入 `--emulator` 时，不调用 geelark-publish，改为调用 `QAS/scripts/emulator-distribute/distribute.js`，并透传 `--video`、`--caption`、`--latest`。

**Step 2: 验证**

```bash
cd ~/.cursor/skills/video-create-distribute
node scripts/distribute.js --emulator --latest
```

**Step 3: Commit**

```bash
git add video-create-distribute/scripts/distribute.js
git commit -m "feat: add --emulator mode to bypass GeeLark"
```

---

## Task 5: 文档与配置说明

**Files:**
- Modify: `QAS/docs/plans/2025-03-13-emulator-adb-tiktok-distribute.md`（补充故障排查）
- Create: `QAS/docs/emulator-distribute-setup.md`

**Step 1: 编写 emulator-distribute-setup.md**

包含：LDPlayer/BlueStacks 安装、ADB 连接、TikTok 登录、常见错误（如 resourceId 变更、多开端口）及解决方式。

**Step 2: Commit**

```bash
git add QAS/docs/
git commit -m "docs: emulator distribute setup guide"
```

---

## 风险与备选

| 风险 | 应对 |
|------|------|
| TikTok 界面更新导致元素失效 | 用 weditor 重新抓取，更新 upload_tiktok.py 中的选择器 |
| 多开模拟器端口不同 | 在 config 中支持 `adbPort`，或通过 `--adb-port` 传入 |
| uiautomator2 连接失败 | 确认 adb devices、模拟器已启动、防火墙未拦截 |

---

## 执行状态

✅ **已实现**（2025-03-13）

- Task 1–5 已完成
- 代码位于 `QAS/scripts/emulator-distribute/`
- video-create-distribute 已支持 `--emulator` 模式
