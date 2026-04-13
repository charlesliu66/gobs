# 任务包 06: 即梦 CLI 登录态检测与友好提示

## 任务目标
在视频生成链路中增加即梦 CLI 登录态预检，避免"假完成"问题。

## 背景
即梦视频生成依赖服务器上的 `dreamina` CLI 登录态。如果登录态过期：
- 后端不会报明确错误
- 前端可能显示"已完成"但没有实际视频
- 用户体验非常差，以为生成了其实没有

## 范围
- ✅ 做: 后端增加登录态检测接口
- ✅ 做: 前端在生成前检测，过期时给出明确提示
- ❌ 不做: 不做自动重新登录（需要人工扫码）

## 后端改动

### `services/dreaminaVideo.ts` — 新增检测函数

```typescript
/** 检测 dreamina CLI 是否登录：执行 dreamina whoami 或类似命令 */
export async function checkDreaminaAuth(): Promise<{
  loggedIn: boolean;
  username?: string;
  error?: string;
}> {
  // 尝试运行 dreamina CLI 的身份检查命令
  // 如果 CLI 没有 whoami，可以用一个轻量操作（如 list）来验证
}
```

### `routes/video.ts` — 新增检测端点

```
GET /api/video/dreamina/auth-status
→ { loggedIn: boolean, username?: string, error?: string }
```

### 生成接口增加前置检查

在 `POST /dreamina/submit` 和 `POST /generate`（即梦模型）的入口，先调用检测：
- 未登录 → 返回 400: `"即梦 CLI 未登录，请在服务器执行 dreamina login"`
- 已登录 → 继续正常流程

## 前端改动

### `api/video.ts` — 新增 API 调用

```typescript
export async function checkDreaminaAuthStatus(): Promise<{ loggedIn: boolean }>;
```

### `TabGenerate.tsx` / 生成按钮

选择即梦模型时，点击"生成"先调 auth-status：
- 未登录 → toast.error("即梦服务登录已过期，请联系管理员在服务器重新登录")
- 已登录 → 正常提交

## 验收标准
1. 即梦未登录时，生成按钮点击后 1s 内给出明确中文提示
2. 不影响 Veo 和可灵的生成流程
3. auth-status 接口响应 < 3s
4. `npm run build` 无报错

## 给 Cursor 的 Prompt

```
即梦视频生成依赖服务器上的 dreamina CLI 登录态，过期后不会报错但生成无结果。

我需要加登录态检测：

1. services/dreaminaVideo.ts 新增 checkDreaminaAuth()
   - spawn dreamina CLI 做身份检查（尝试 dreamina whoami，如果没这个命令就用其他轻量命令）
   - 返回 { loggedIn: boolean, error?: string }
   - 超时 5s

2. routes/video.ts 新增 GET /api/video/dreamina/auth-status
   - 调用 checkDreaminaAuth 返回结果

3. POST /dreamina/submit 和 POST /generate（isDreaminaModel 为 true 时）
   - 生成前先调 checkDreaminaAuth
   - 未登录返回 400 + 明确中文提示

4. 前端 api/video.ts 新增 checkDreaminaAuthStatus()
5. TabGenerate 生成按钮（选即梦模型时）先检测登录态

注意：
- dreamina CLI 路径从 getDreaminaExecutableForWrapper() 或 DREAMINA_BIN 获取
- 检测不要太重，timeout 5s
- 不影响 Veo/可灵流程
- 完成后确保 npm run build 通过
```
