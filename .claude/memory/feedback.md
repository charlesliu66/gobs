---
name: AI 行为规则与教训
description: 从实际开发中积累的 AI 行为矫正规则，避免重蹈覆辙
type: feedback
---

## 规则 1: 禁止修改后端底层服务文件

不能改 dreaminaVideo.ts、klingVideo.ts、veoPython.ts、studioPipeline.ts、productionTypes.ts、productionAssets.ts。

**Why:** 这些文件是稳定的底层实现，改动会引发连锁故障，且很难在没有真实 API 密钥的情况下验证。
**How to apply:** 任何任务开始前先确认改动范围不涉及上述文件。如果需求必须改这些文件，先停下来询问用户。

## 规则 2: npm run build 必须零错误

每个任务完成后必须跑 `npm run build`（后端）和 `npm run build`（前端）。

**Why:** TypeScript 编译错误在生产环境会导致服务启动失败。
**How to apply:** 在 builder-report.md 中必须包含 build 成功的截图或输出摘要。

## 规则 3: 不硬编码 API Key

任何 API Key、密码、Token 都只能放在 .env 文件中，绝不能出现在源码里。

**Why:** 硬编码密钥一旦提交会永久留在 git 历史中，即使后续删除也会被扫描工具检出。
**How to apply:** 遇到需要密钥的地方，先检查 .env.example，按格式添加占位符，在代码中用 process.env.XXX 读取。

## 规则 4: 不在没有 planner-spec 的情况下开始 build

4+1 工作流中，Gate 1（Planner）必须先过。

**Why:** 没有明确 AC 的 build 容易跑偏，验证时无法对照。
**How to apply:** 每次新任务开始前检查 docs/workflow/runs/<run-id>/planner-spec.md 是否存在。

## 规则 5: 每次改动后必须更新 PRODUCT.md

任何功能新增、Bug 修复、性能优化，完成后必须在 PRODUCT.md 的 Changelog 中补一条记录（版本号递增，日期正确，内容简明）。

**Why:** PRODUCT.md 是产品历史的唯一真实记录，漏记会导致功能溯源困难，也违背三端一统的精神（文档也是产物的一部分）。
**How to apply:** 完成代码改动、三端同步之后，最后一步是打开 PRODUCT.md，在 Changelog 最顶部追加新版本条目，格式参照已有条目（`### vX.Y — YYYY-MM-DD`）。

## 规则 6: 数据清理函数必须按字段名白名单操作，禁止全量模式匹配

写任何递归"清理/strip"函数时，**绝不能用「匹配 pattern 就删」的全量策略**（如「所有 `data:` 开头的字符串一律置 null」）。必须明确列出允许删除的字段名白名单，只对白名单字段执行清理。

**Why（反面教材）:** 2026-04-15 commit `34e9e5d`，为了删掉大体积临时 base64（`previewStillDataUrl`），写了全量 stripBase64，结果把 `imageDataUrl`（用户角色/场景头像）也一起删光，造成全页图裂。用户数据被当垃圾清掉，且每次保存都在清，无法感知。
**How to apply:** 写 strip/clean/sanitize 类函数时，先问自己：「这个函数会碰到哪些字段？哪些是可以删的缓存，哪些是用户创作的真实数据？」然后用 `Set<string>` 白名单限定字段名，函数签名加 `fieldName?: string` 参数向下传递。

```typescript
// ✅ 正确：字段名白名单
const STRIPPABLE_FIELDS = new Set(['previewStillDataUrl', 'imageBase64']);
function strip(obj, fieldName?) {
  if (typeof obj === 'string' && obj.startsWith('data:'))
    return (fieldName && STRIPPABLE_FIELDS.has(fieldName)) ? null : obj;
  // ...递归传 k 作为 fieldName
}

// ❌ 错误：全量模式
function strip(obj) {
  if (typeof obj === 'string') return obj.startsWith('data:') ? null : obj;
}
```

## 规则 7: 修鉴权 bypass 时必须同步检查路由层的用户校验

在 `auth.ts` 中间件为某个路由添加鉴权豁免（允许无 JWT 访问）时，**必须同步检查该路由的处理函数内部**是否还有基于 `req.user?.username` 的二次鉴权逻辑。两处都修，缺一不可。

**Why（反面教材）:** 2026-04-14 commit `b7cd781`，为了让 `<video>` 标签能播放视频，在 auth.ts 放行了 `/api/video/file`，但没有检查 video.ts 路由内部也在用 `req.user?.username` 做用户目录鉴权。无 JWT 时 username 变成 `_default`，视频路径在 `output/admin/` 下，目录不符返回 403，`<video>` 静默失败，页面显示黑屏 0:00。
**How to apply:** 每次在 auth.ts 加豁免时，立即打开对应路由文件，搜索 `req.user`，确认路由内部不会因 `req.user` 为 undefined 而产生新的 403/401。如果路由内部必须知道用户身份，改为从 query 参数（如 `?user=xxx`）或 path 中提取，并做合法性校验。
