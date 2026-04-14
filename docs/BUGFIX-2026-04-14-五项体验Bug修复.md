# BUGFIX-2026-04-14 — 五项体验 Bug 修复指南

> 本文档供 Cursor 直接执行。逐项修复 → 验证 → 勾选。
> 云服务器 IP: 49.235.61.68 / User: ubuntu / 后端: ~/gobs/backend / PM2: gobs-api

---

## Bug 1：一键成片 → "即梦未启用"

### 根因
`isDreaminaEnabled()` 在 `h5-video-tool-api/src/services/dreaminaVideo.ts:31-37` 判断逻辑：
1. 若 `DREAMINA_ENABLED` 未设置，fallback 检查脚本目录是否存在
2. 默认脚本目录 `<cwd>/../.cursor/skills/dreamina-cli-skill/scripts` 在云服务器上不存在
3. 导致 `isDreaminaEnabled()` 返回 false

### 修复（服务器 .env 配置）

SSH 到服务器执行：
```bash
ssh ubuntu@49.235.61.68

# 1. 确认 dreamina 脚本目录实际位置
find /home/ubuntu -path "*/dreamina-cli-skill/scripts" -type d 2>/dev/null
# 如果找不到，检查 dreamina wrapper 是否部署：
ls -la /home/ubuntu/.local/bin/dreamina 2>/dev/null

# 2. 在 .env 中添加（路径根据上面结果调整）
cd ~/gobs/backend
cat >> .env << 'EOF'

# === Bug1 fix: 启用即梦 ===
DREAMINA_ENABLED=1
DREAMINA_SCRIPTS_DIR=/home/ubuntu/gobs/.cursor/skills/dreamina-cli-skill/scripts
EOF

# 3. 重启
pm2 restart gobs-api
```

### 代码加固（可选但推荐）

如果 dreamina-cli-skill 脚本确实不在服务器上，需要先部署。但作为代码侧改进，给前端一个更明确的错误提示：

**文件：`h5-video-tool-api/src/routes/quickfilm.ts`**

找到 `quickfilm.ts` 第 126-128 行：
```typescript
  if (!isDreaminaEnabled()) {
    res.status(400).json({ error: '即梦未启用，无法执行一键成片。请先配置 dreamina-cli 并重启 API。' });
    return;
  }
```

在此之后、批量提交之前，增加一个登录态检查：
```typescript
  // 检查即梦 CLI 登录态
  const authCheck = await checkDreaminaAuth();
  if (!authCheck.loggedIn) {
    res.status(400).json({
      error: `即梦 CLI 未登录：${authCheck.error || '请在服务器执行 dreamina login'}`,
    });
    return;
  }
```

确保 import 中包含 `checkDreaminaAuth`（当前只 import 了 `isDreaminaEnabled` 和 `submitDreaminaVideo`）：
```typescript
import { isDreaminaEnabled, submitDreaminaVideo, checkDreaminaAuth } from '../services/dreaminaVideo.js';
```

### 验证
- [ ] `pm2 logs gobs-api --lines 5` 无启动报错
- [ ] 在一键成片页面点击"开始生成视频"，不再报"即梦未启用"
- [ ] 若 dreamina CLI 未登录，应报"即梦 CLI 未登录"而非静默失败

---

## Bug 2：高级制片 → 一键补全缺图卡住

### 根因
1. `imagenPython.ts` 中 `imagenQueueTail` 是**全局串行队列**，所有生图请求排队
2. 每张图最多重试 `keyCandidates.length × maxAttempts × modelCandidates.length` 次
3. 遇到 429/RESOURCE_EXHAUSTED 时重试间隔叠加，单张图可能卡 3-5 分钟
4. 前端 `ProductionWizard.tsx` 的 `CONCURRENCY = 1`，串行等待，用户看到的是"卡死"
5. 前端虽然有 `setBatchAssetGen` 但没有展示**当前正在处理哪一项**的信息

### 修复 A：后端 — 降低重试延迟，快速失败

**文件：`h5-video-tool-api/src/services/imagenPython.ts`**

找到 `generateImageWithPython` 函数中的重试循环（约第 150-200 行附近），修改以下逻辑：

1. 在文件顶部或 `generateImageWithPython` 函数内，加一个快速失败的辅助函数：

```typescript
/** 批量模式下应快速失败的错误（配额耗尽、无权限） */
function isFatalImagenError(msg: string): boolean {
  return isRateLimitOrQuotaError(msg) && !/retry/i.test(msg);
}
```

2. 在 key 循环内，当所有 model candidates 都因 429 失败时，不再切换下一个 key 继续尝试相同的 quota pool，而是直接抛错。找到以下代码块（约在函数末尾）：

```typescript
      if (hasNextKey && isRateLimitOrQuotaError(keyFailMsg)) {
        continue;
      }
```

改为：

```typescript
      if (hasNextKey && isRateLimitOrQuotaError(keyFailMsg)) {
        // 若所有 key 共享同一个 Compass 项目配额，切换 key 不会解决 429
        // 加一个短等待后再试，而非立即切换
        await sleep(2000);
        continue;
      }
```

### 修复 B：前端 — 加进度提示 + 取消按钮响应优化

**文件：`h5-video-tool/src/pages/ProductionWizard.tsx`**

1. 给 `batchAssetGen` state 加一个 `currentLabel` 字段。找到 `setBatchAssetGen` 的初始化（约第 327 行）：

```typescript
    setBatchAssetGen({
      current: 0,
      total: tasks.length,
      success: 0,
      failed: 0,
      startedAt: Date.now(),
    });
```

改为：

```typescript
    setBatchAssetGen({
      current: 0,
      total: tasks.length,
      success: 0,
      failed: 0,
      startedAt: Date.now(),
      currentLabel: '',
    });
```

2. 在 `runTask` 函数开头（`setGenKey` 那行之后）加上 label 更新：

```typescript
      setGenKey(`${t.kind}:${t.sheetId}:${t.variantId}`);
      // 更新进度提示
      setBatchAssetGen((prev) => prev ? { ...prev, currentLabel: `${t.kind === 'char' ? '角色' : t.kind === 'scene' ? '场景' : '道具'} ${t.sheetId}` } : null);
```

3. 在渲染 `batchAssetGen` 进度的 UI 处（搜索使用 `batchAssetGen` 显示进度的 JSX），增加 `currentLabel` 的展示：

```tsx
{batchAssetGen && (
  <div className="text-sm text-gray-500">
    正在处理 {batchAssetGen.current + 1}/{batchAssetGen.total}
    {batchAssetGen.currentLabel ? `：${batchAssetGen.currentLabel}` : ''}
    （成功 {batchAssetGen.success}，失败 {batchAssetGen.failed}）
  </div>
)}
```

### 验证
- [ ] 补全缺图时 UI 显示当前正在处理的项目名称和序号
- [ ] 单项生图失败后在 5 秒内跳到下一项（不长时间卡住）
- [ ] 取消按钮点击后在当前项完成/超时时停止
- [ ] `pm2 logs gobs-api --lines 100 | grep "RESOURCE_EXHAUSTED"` 检查是否有配额问题

---

## Bug 3：高级制片 → 角色场景图生图报错

### 根因
生图链路：前端 → `/api/storyboard/frames` 或 `/api/character/standardize-image` → `generateImageWithPython()` → Python SDK → Compass Imagen API。

可能的报错原因（按概率排序）：
1. Compass API Key 配额耗尽（429 RESOURCE_EXHAUSTED）
2. 模型不可用（gemini-3.1-flash-image-preview 未在当前项目白名单）
3. Python 环境问题（缺 google-genai 包）
4. 网络不通（Compass API URL 不可达）

### 排查（SSH 到服务器）

```bash
ssh ubuntu@49.235.61.68

# 1. 查最近的生图错误日志
pm2 logs gobs-api --lines 500 | grep -i "imagen\|character.*image\|standardize\|RESOURCE_EXHAUSTED\|429\|404\|not found\|ENOENT" | tail -30

# 2. 测试 Python 环境
cd ~/gobs/backend
python3 -c "import google.genai; print('ok')"

# 3. 测试 Compass API 连通性
source .env
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $COMPASS_API_KEY" \
  "$COMPASS_API_URL/models"
```

### 修复（根据排查结果选择）

**情况 A：429 配额耗尽**

```bash
# 检查 .env 里是否有备用 key
grep COMPASS_API_KEY ~/gobs/backend/.env

# 如果只有一把 key，加一把备用的：
echo 'COMPASS_API_KEY2=你的备用key' >> ~/gobs/backend/.env
pm2 restart gobs-api
```

**情况 B：模型 404**

**文件：`h5-video-tool-api/.env`**

```bash
# 切换到可用模型
COMPASS_IMAGEN_MODEL=gemini-2.0-flash-exp
# 或者配置多个候选（逗号分隔，自动降级）
COMPASS_IMAGEN_MODEL_CANDIDATES=gemini-3.1-flash-image-preview,gemini-2.0-flash-exp
```

**情况 C：Python 环境**

```bash
pip3 install --upgrade google-genai
```

### 代码加固

**文件：`h5-video-tool-api/src/routes/characterImage.ts`**

在 catch 块中给出更具体的错误信息，帮助用户自行排查。找到第 70-74 行：

```typescript
  } catch (err) {
    console.error('[character/standardize-image]', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : '图像生成失败',
    });
  }
```

改为：

```typescript
  } catch (err) {
    const msg = err instanceof Error ? err.message : '图像生成失败';
    console.error('[character/standardize-image]', msg);
    
    // 给前端更友好的错误提示
    let userMessage = msg;
    if (/RESOURCE_EXHAUSTED|429|quota/i.test(msg)) {
      userMessage = '生图配额已耗尽，请稍后重试或联系管理员更换 API Key';
    } else if (/404|not found|does not have access/i.test(msg)) {
      userMessage = '当前生图模型不可用，请在 .env 中更换 COMPASS_IMAGEN_MODEL 后重启 API';
    } else if (/ENOENT|python/i.test(msg)) {
      userMessage = '服务器 Python 环境异常，请检查 python3 和 google-genai 包是否安装';
    } else if (/超时|timeout/i.test(msg)) {
      userMessage = '生图请求超时，请重试';
    }
    
    res.status(500).json({ success: false, error: userMessage });
  }
```

### 验证
- [ ] `pm2 logs gobs-api --lines 20` 查看具体错误类型
- [ ] 根据错误类型执行对应修复
- [ ] 在高级制片中重新点击角色/场景图生图，成功返回图片
- [ ] 错误提示对用户友好（不再是原始 Python 报错）

---

## Bug 4：生成分镜表 → Gateway Time-out

### 根因
1. `generateStoryboardTable()` 调 Compass LLM，`maxTokens: 16384`，可能调 **2 次**（首次 + 场景修复）
2. 每次 Compass 请求超时 120 秒（`promptPolish.ts:122`），2 次 = 最多 240 秒
3. **Nginx 默认 `proxy_read_timeout` 是 60 秒**，不够等 LLM 返回
4. Nginx 直接给浏览器返回 504 Gateway Timeout

### 修复 A：Nginx 配置（必须）

SSH 到服务器：

```bash
ssh ubuntu@49.235.61.68

# 1. 找到 Nginx 配置文件
sudo grep -rl "proxy_pass.*3001" /etc/nginx/
# 通常是 /etc/nginx/sites-enabled/default 或 /etc/nginx/conf.d/gobs.conf

# 2. 编辑配置（下面以 default 为例，路径根据上面结果调整）
sudo nano /etc/nginx/sites-enabled/default
```

在 `location /api/` 块中添加：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    
    # === Bug4 fix: 延长超时 ===
    proxy_connect_timeout 60s;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
    
    # === Bug5 fix: 允许大文件上传 ===
    client_max_body_size 500m;
}
```

```bash
# 3. 测试并重载
sudo nginx -t
sudo systemctl reload nginx
```

### 修复 B：后端加速（可选优化）

**文件：`h5-video-tool-api/src/services/studioPipeline.ts`**

找到 `generateStoryboardTable` 函数（第 529 行开始），在 `compassChatCompletion` 调用中，适当降低 `maxTokens` 以加快响应。

当前是 `maxTokens: 16384`，对于 6-14 镜的分镜表，通常 8192 足够：

```typescript
    const raw = await compassChatCompletion({
      systemPrompt: STORYBOARD_TABLE_SYSTEM,
      userText,
      temperature: 0.35,
      maxTokens: 8192,  // 从 16384 降到 8192，加速响应
    });
```

### 验证
- [ ] `sudo nginx -t` 通过
- [ ] `sudo systemctl reload nginx` 成功
- [ ] 在高级制片中点击"生成分镜表"，成功返回分镜数据（可能需要 30-60 秒，但不再 504）
- [ ] `curl -v http://49.235.61.68/api/health` 返回 200

---

## Bug 5：70MB 视频上传十分钟未成功

### 根因（多层限制叠加）

| 层 | 配置项 | 当前值 | 问题 |
|----|--------|--------|------|
| Nginx | `client_max_body_size` | 默认 1m | **70MB 直接 413** |
| Nginx | `proxy_read_timeout` | 默认 60s | 大文件上传可能超时 |
| Express | `express.json({ limit })` | 50mb | 不影响 multipart，无问题 |
| Multer | `EDITOR_UPLOAD_MAX_MB` | 2048mb | 无问题 |
| 网络 | 云服务器上行带宽 | 1-5 Mbps | 70MB ≈ 2-10 分钟，正常 |

核心问题是 **Nginx `client_max_body_size`**。

### 修复（与 Bug 4 合并处理）

已在 Bug 4 的 Nginx 配置中包含 `client_max_body_size 500m;`。

如果上传仍然慢但不报错，那是带宽问题，可以加一个前端进度条优化体验。

### 代码加固：前端上传进度

**文件：`h5-video-tool/src/pages/EditorWorkbench.tsx`**（或视频剪辑上传组件所在文件）

找到上传调用的位置，确保使用了 `onUploadProgress` 回调。如果当前用的是 fetch，改为 XMLHttpRequest 或 axios 以支持上传进度。

示例（如果用 axios）：

```typescript
const uploadFile = async (file: File, onProgress?: (pct: number) => void) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('originalName', file.name);
  
  const res = await axios.post('/api/editor/assets/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600_000, // 10 分钟
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return res.data;
};
```

### 验证
- [ ] Nginx 配置已包含 `client_max_body_size 500m;`
- [ ] 上传 70MB 视频文件，不再报 413
- [ ] 上传过程中显示进度百分比
- [ ] 上传成功后文件出现在剪辑器素材列表

---

## 执行清单

### 第一步：服务器配置（无需代码修改）

```bash
ssh ubuntu@49.235.61.68

# 1. 修改 .env（Bug 1）
cd ~/gobs/backend
echo '' >> .env
echo '# === 2026-04-14 bugfix ===' >> .env
echo 'DREAMINA_ENABLED=1' >> .env
# 下面这行路径需要先 find 确认
# echo 'DREAMINA_SCRIPTS_DIR=/home/ubuntu/gobs/.cursor/skills/dreamina-cli-skill/scripts' >> .env

# 2. 修改 Nginx（Bug 4 + Bug 5）
sudo cp /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.bak
# 编辑 Nginx 配置，在 location /api/ 块中加入：
#   proxy_read_timeout 300s;
#   proxy_send_timeout 300s;
#   client_max_body_size 500m;
sudo nginx -t && sudo systemctl reload nginx

# 3. 重启 API
pm2 restart gobs-api

# 4. 验证
curl -s http://localhost:3001/api/health
pm2 logs gobs-api --lines 10
```

### 第二步：代码修改（Cursor 执行）

| 文件 | 改动 | 对应 Bug |
|------|------|---------|
| `h5-video-tool-api/src/routes/quickfilm.ts` | 增加 `checkDreaminaAuth` 登录态校验 | Bug 1 |
| `h5-video-tool-api/src/routes/characterImage.ts` | 优化错误提示信息 | Bug 3 |
| `h5-video-tool/src/pages/ProductionWizard.tsx` | 补全缺图进度提示 + currentLabel | Bug 2 |
| `h5-video-tool-api/src/services/studioPipeline.ts` | maxTokens 16384 → 8192 | Bug 4 |

### 第三步：构建与部署

```bash
# 本地构建
cd h5-video-tool-api
npm run build

cd ../h5-video-tool
npm run build

# 部署到服务器（参考项目现有部署流程）
# 注意：云端是部署产物目录，不是 git 工作副本
```

### 第四步：全量验证

- [ ] **Bug 1**: 一键成片 → 点击生成 → 不再报"即梦未启用"
- [ ] **Bug 2**: 高级制片 → 一键补全缺图 → 有进度提示，失败快速跳过
- [ ] **Bug 3**: 高级制片 → 角色/场景生图 → 返回图片或友好错误提示
- [ ] **Bug 4**: 高级制片 → 生成分镜表 → 30-90 秒内返回结果，不 504
- [ ] **Bug 5**: 视频剪辑 → 上传 70MB 文件 → 成功，有进度显示

---

## 回滚方案

```bash
# Nginx 回滚
sudo cp /etc/nginx/sites-enabled/default.bak /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# .env 回滚：删除最后追加的 bugfix 行
cd ~/gobs/backend
# 手动编辑 .env 删除 "# === 2026-04-14 bugfix ===" 及之后的行

# 代码回滚
git revert HEAD
npm run build
# 重新部署
```
