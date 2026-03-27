# Video Pipeline 视频生成流水线

一键从指令到成片的自动化流程。

## 前置

1. **安装依赖**
   ```bash
   cd C:\Users\wei.liu\Desktop\cursor_try\video-pipeline
   npm install
   npx playwright install chromium
   ```

2. **登录即梦**
   - 首次运行会打开浏览器。若在**首页**或**登录页**，请先完成登录，然后按 **Enter**，脚本将跳转到视频生成页并**保存登录状态**
   - 登录状态保存在 `~/.video-pipeline-browser/jimeng-auth.json`，**下次启动会自动加载**
   - ⚠️ **禁止删除** `~/.video-pipeline-browser` 目录

### 方式 B：使用已登录的 Chrome（免重复登录，推荐）

若自动保存登录经常失效，可改用你日常使用的 Chrome：

1. **关闭所有 Chrome 窗口**
2. 双击 `launch-chrome-for-pipeline.bat`，以调试模式启动 Chrome（会使用你平时的配置和登录）
3. 在打开的 Chrome 中登录即梦（若尚未登录）
4. 在**另一个终端**运行流水线并指定连接端口：
   ```bash
   cd C:\Users\wei.liu\Desktop\cursor_try\video-pipeline
   node run.js --prompt "你的prompt" --materials "路径" --cdp-port 9222
   ```
5. 或在 `config.json` 中设置 `"cdpPort": 9222`，之后可直接运行 `node run.js --prompt "..."`

## 使用方式

### 方式一：通过 Cursor `/video-pipeline` 命令（推荐）

1. 在 Cursor 聊天框输入：`/video-pipeline 帮我生成一个 10 秒浪人视频`
2. 按流程选择 prompt、素材
3. 确认后自动执行，成片保存到 `Ai Videos`

### 方式二：命令行直接运行

```bash
node run.js --prompt "你的完整prompt" [--materials "路径1,路径2"] [--output "输出目录"]
```

示例：
```bash
node run.js --prompt "【风格】黑泽明剑戟片..." --materials "C:\Users\wei.liu\Desktop\cursor_try\Ai test\1\img.png" --output "C:\Users\wei.liu\Desktop\cursor_try\Ai Videos"
```

## 配置

编辑 `config.json`：
- `seedanceUrl`: 即梦 AI 生成页 URL
- `materialFolder`: 素材库路径
- `outputFolder`: 成片输出路径
- `timeoutMs`: 最长等待时间（毫秒）
- `pollIntervalMs`: 轮询间隔

## 注意事项

1. **页面结构变化**：即梦若改版，需更新 `run.js` 中的选择器
2. **登录状态**：登录后保存到 `jimeng-auth.json`，下次启动自动加载，**勿删除该文件**
3. **生成耗时**：视频生成约 2–5 分钟（平台排队可能更久），请耐心等待
