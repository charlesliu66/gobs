# Prompt 模板系统 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现配置驱动的 prompt 模板系统，用户通过下拉显式选择模板（viral-dance / cg-trailer），产出不同风格的 prompt 并路由到对应 pipeline。

**Architecture:** 在 h5-video-tool-api 下新增 `config/prompt-templates/` 存放 JSON 配置；`promptPolish` 接受 `templateId` 并注入模板专属 system prompt；新增 `GET /api/prompt/templates` 供前端下拉使用。

**Tech Stack:** TypeScript, Express, JSON 配置

---

## Task 1: 模板 Schema 与类型定义

**Files:**
- Create: `h5-video-tool-api/src/config/prompt-templates/schema.ts`
- Create: `h5-video-tool-api/src/config/prompt-templates/index.ts`

**Step 1: 创建 schema.ts**

```typescript
// h5-video-tool-api/src/config/prompt-templates/schema.ts
export type PipelineMode = 'single' | 'multishot';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  duration: number;
  aspectRatio: '9:16' | '16:9';
  pipelineMode: PipelineMode;
  systemPromptSuffix: string;
  defaultSearchKeywords?: string[];
  formulaRef?: string;
}
```

**Step 2: 创建 index.ts（占位，下一 Task 填入模板）**

```typescript
// h5-video-tool-api/src/config/prompt-templates/index.ts
import type { PromptTemplate } from './schema.js';

const templates: PromptTemplate[] = [];

export function getTemplate(id: string): PromptTemplate | undefined {
  return templates.find((t) => t.id === id);
}

export function getAllTemplates(): PromptTemplate[] {
  return templates;
}
```

**Step 3: 验证编译**

Run: `cd h5-video-tool-api && npm run build`
Expected: 无 TS 错误

**Step 4: Commit**

```bash
git add h5-video-tool-api/src/config/prompt-templates/schema.ts h5-video-tool-api/src/config/prompt-templates/index.ts
git commit -m "feat: add prompt template schema and loader stub"
```

---

## Task 2: 添加 viral-dance 与 cg-trailer 模板配置

**Files:**
- Create: `h5-video-tool-api/src/config/prompt-templates/viral-dance.json`
- Create: `h5-video-tool-api/src/config/prompt-templates/cg-trailer.json`
- Modify: `h5-video-tool-api/src/config/prompt-templates/index.ts`

**Step 1: 创建 viral-dance.json**

```json
{
  "id": "viral-dance",
  "name": "Viral 舞蹈",
  "description": "10秒，角色跳近期流行MV舞蹈，适合 TikTok/小红书",
  "duration": 10,
  "aspectRatio": "9:16",
  "pipelineMode": "single",
  "systemPromptSuffix": "角色跳近期流行MV中的热门舞蹈，前3秒抓人，卡点节奏感强，适合社媒传播。可提及「近期爆款舞蹈」「TikTok 热门动作」等作为参考，但不要写具体艺人名或曲名（版权规避）。",
  "defaultSearchKeywords": ["dance", "viral", "trending"]
}
```

**Step 2: 创建 cg-trailer.json**

```json
{
  "id": "cg-trailer",
  "name": "CG 宣传片",
  "description": "60秒，多镜头讲述角色故事，电影级叙事",
  "duration": 60,
  "aspectRatio": "16:9",
  "pipelineMode": "multishot",
  "systemPromptSuffix": "按公式4（新角色 CG 史诗宣发型）生成分镜：0–40% 电影级铺垫、40–80% 实机爽点、80–90% 收招定格、90–100% CTA。每镜头需含首帧与尾帧描述，确保镜头间衔接。",
  "formulaRef": "formula-4",
  "defaultSearchKeywords": ["character", "cinematic", "trailer"]
}
```

**Step 3: 修改 index.ts 加载 JSON（使用 createRequire，兼容 ESM）**

```typescript
import { createRequire } from 'module';
import type { PromptTemplate } from './schema.js';

const require = createRequire(import.meta.url);
const viral = require('./viral-dance.json') as PromptTemplate;
const cg = require('./cg-trailer.json') as PromptTemplate;

const templates: PromptTemplate[] = [viral, cg];

export function getTemplate(id: string): PromptTemplate | undefined {
  return templates.find((t) => t.id === id);
}

export function getAllTemplates(): PromptTemplate[] {
  return [...templates];
}
```

**Step 4: 验证**

Run: `cd h5-video-tool-api && npm run build`
Expected: 成功

**Step 5: Commit**

```bash
git add h5-video-tool-api/src/config/prompt-templates/
git commit -m "feat: add viral-dance and cg-trailer template configs"
```

---

## Task 3: 改造 promptPolish 支持 templateId

**Files:**
- Modify: `h5-video-tool-api/src/services/promptPolish.ts`
- Modify: `h5-video-tool-api/src/services/promptPolish.ts` (PolishResult 扩展)

**Step 1: 扩展 PolishResult 接口**

在 `promptPolish.ts` 中，为 `PolishResult` 增加可选字段（若传入了 templateId，则返回模板的 duration、aspectRatio）：

```typescript
export interface PolishResult {
  polishedPrompt: string;
  searchKeywords: string[];
  folderHints?: string[];
  /** 传入 templateId 时返回 */
  template?: { duration: number; aspectRatio: string; pipelineMode: string };
}
```

**Step 2: 修改 polishPrompt 函数签名**

```typescript
export async function polishPrompt(
  rawPrompt: string,
  options?: { styleId?: string; templateId?: string }
): Promise<PolishResult>
```

保持向后兼容：若 `options` 为 `string`，则当作 `styleId`（兼容旧调用 `polishPrompt(prompt, 'viral')`）。

**Step 3: 实现 templateId 逻辑**

```typescript
import { getTemplate } from '../config/prompt-templates/index.js';

// 在 polishPrompt 内：
let styleHint = '';
let templateConfig: { duration: number; aspectRatio: string; pipelineMode: string } | undefined;

const opts = typeof options === 'string' ? { styleId: options } : options ?? {};
if (opts.templateId) {
  const t = getTemplate(opts.templateId);
  if (t) {
    templateConfig = { duration: t.duration, aspectRatio: t.aspectRatio, pipelineMode: t.pipelineMode };
    styleHint = `\n\n## 模板要求（${t.name}）\n${t.systemPromptSuffix}\n`;
  }
}
if (!styleHint && opts.styleId && STYLE_HINTS[opts.styleId]) {
  styleHint = `\n\n## 风格要求\n用户选择了「${opts.styleId}」风格，请严格遵循：${STYLE_HINTS[opts.styleId]}\n`;
}
```

将 `styleHint` 拼接到 `SYSTEM_PROMPT` 后传入 LLM。

**Step 4: 返回结果中附带 template**

```typescript
return {
  polishedPrompt,
  searchKeywords,
  folderHints,
  ...(templateConfig && { template: templateConfig }),
};
```

**Step 5: 验证**

Run: `cd h5-video-tool-api && npm run build`
Expected: 无错误

**Step 6: Commit**

```bash
git add h5-video-tool-api/src/services/promptPolish.ts
git commit -m "feat: polishPrompt support templateId with template config injection"
```

---

## Task 4: 改造 prompt 路由接受 templateId

**Files:**
- Modify: `h5-video-tool-api/src/routes/prompt.ts`

**Step 1: 修改 POST /polish 的 body 解析**

```typescript
const { prompt, style, templateId } = req.body as { prompt?: string; style?: string; templateId?: string };
```

**Step 2: 调用 polishPrompt 时传入 options**

```typescript
const result = await polishPrompt(raw, {
  styleId: typeof style === 'string' ? style : undefined,
  templateId: typeof templateId === 'string' ? templateId : undefined,
});
```

**Step 3: 验证**

手动或通过 curl 测试：

```bash
curl -X POST http://localhost:3000/api/prompt/polish \
  -H "Content-Type: application/json" \
  -d '{"prompt":"宣传浪人","templateId":"viral-dance"}'
```

Expected: JSON 中含 `polishedPrompt`、`searchKeywords`，且含 `template: { duration: 10, aspectRatio: "9:16", pipelineMode: "single" }`

**Step 4: Commit**

```bash
git add h5-video-tool-api/src/routes/prompt.ts
git commit -m "feat: prompt polish route accept templateId"
```

---

## Task 5: 新增 GET /api/prompt/templates

**Files:**
- Modify: `h5-video-tool-api/src/routes/prompt.ts`
- Import: `getAllTemplates` from config

**Step 1: 添加 GET 路由**

```typescript
import { getAllTemplates } from '../config/prompt-templates/index.js';

promptRouter.get('/templates', (_req: Request, res: Response) => {
  const templates = getAllTemplates();
  res.json({
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      duration: t.duration,
      aspectRatio: t.aspectRatio,
      pipelineMode: t.pipelineMode,
    })),
  });
});
```

**Step 2: 验证**

```bash
curl http://localhost:3000/api/prompt/templates
```

Expected: 返回 viral-dance、cg-trailer 两个模板的列表

**Step 3: Commit**

```bash
git add h5-video-tool-api/src/routes/prompt.ts
git commit -m "feat: add GET /api/prompt/templates"
```

---

## Task 6: 向后兼容 polishPrompt 的 styleId 单参数调用

**Files:**
- Modify: `h5-video-tool-api/src/services/promptPolish.ts`

**Step 1: 兼容旧的 polishPrompt(prompt, styleId) 调用**

在 `polishPrompt` 开头：

```typescript
const opts = (() => {
  if (options === undefined) return {};
  if (typeof options === 'string') return { styleId: options };
  return options;
})();
```

确保现有调用 `polishPrompt(raw, 'viral')` 仍有效。

**Step 2: 检查所有调用方**

Run: `grep -r "polishPrompt(" h5-video-tool-api/src --include="*.ts"`
若有调用，确认传参方式兼容。

**Step 3: Commit**

```bash
git add h5-video-tool-api/src/services/promptPolish.ts
git commit -m "chore: ensure polishPrompt backward compatible with styleId string"
```

---

## 验收清单

- [ ] `GET /api/prompt/templates` 返回 viral-dance、cg-trailer
- [ ] `POST /api/prompt/polish` 传 `templateId: "viral-dance"` 时，prompt 符合 10s、舞蹈、9:16
- [ ] `POST /api/prompt/polish` 传 `templateId: "cg-trailer"` 时，prompt 符合 60s、多镜
- [ ] 不传 `templateId` 时，现有 `style` 行为不变
