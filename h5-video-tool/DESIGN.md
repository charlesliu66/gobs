# GOBS Design System — Cinematic Tool Aesthetic

> Framer 的工具精度 × RunwayML 的电影质感。暗色优先的 AI 视频创作平台。

---

## 1. Visual Theme & Atmosphere

GOBS 是一款 AI 视频创作工具平台，视觉语言融合了 **Framer 的精密工具美学** 和 **RunwayML 的电影沉浸感**。

整体以深空暗色为画布（非纯黑，而是带蓝调的深色 `#090b13`），让视频内容、分镜卡片、生成预览成为视觉主角。界面本身退居幕后 — 通过微妙的玻璃态表面、冷蓝光晕边框和精确的排版层级来引导操作，而非抢夺注意力。

**核心特征：**
- 深空蓝黑画布（`#090b13`）— 不是纯黑，带有微妙的蓝色暗调，比纯黑更温和
- 靛蓝紫主色（`#7c8dff`）— 冷调、精确、专业，贯穿所有交互元素
- 玻璃态表面 — 侧栏、卡片、浮层使用半透明 + 模糊背景
- 冷光晕深度系统 — 用主色光环（ring shadow）替代传统阴影，卡片悬浮感来自光而非影
- 视频内容为王 — 预览区域全出血展示，圆角最小化，让 AI 生成的内容占满画幅
- 紧凑排版 — 标题使用负字距，正文行高克制，营造编辑室/调色台的专业密度感

---

## 2. Color Palette & Roles

### Primary

| Token | Hex | Role |
|-------|-----|------|
| `--color-surface` | `#090b13` | 页面主背景，深空画布 |
| `--color-surface-elevated` | `#131726` | 卡片/侧栏/浮层背景 |
| `--color-surface-hover` | `#1a2034` | 可交互表面悬浮态 |
| `--color-primary` | `#7c8dff` | 主色：按钮、链接、焦点环、选中态 |
| `--color-primary-hover` | `#97a4ff` | 主色悬浮：更亮一档 |
| `--color-primary-muted` | `#5e73ee` | 主色柔和：标签背景、次要强调 |

### Text

| Token | Hex | Role |
|-------|-----|------|
| `--color-text` | `#edf1ff` | 高强调文字（标题、正文） |
| `--color-text-muted` | `#a7b1d5` | 中强调文字（描述、标签） |
| `--color-text-subtle` | `#7681ab` | 低强调文字（占位符、时间戳） |

### Border & Depth

| Token | Hex | Role |
|-------|-----|------|
| `--color-border` | `#2d3756` | 通用边框（卡片、分割线） |
| `--color-border-focus` | `#94a3ff` | 焦点边框 |

### Semantic

| Token | Hex | Role |
|-------|-----|------|
| `--color-success` | `#22c55e` | 成功/完成 |
| `--color-error` | `#ef4444` | 错误/危险 |
| `--color-warning` | `#f59e0b` | 警告/注意 |

### Light Theme Overrides

亮色主题通过 `[data-theme="light"]` 覆盖，紫色主色保留但加深：
- Surface: `#fafafa` → `#ffffff` → `#f4f4f5`
- Primary: `#7c3aed`（更饱和的紫，保证亮底对比度）
- Text: `#18181b` → `#52525b` → `#71717a`

### Gradient Usage

- **页面背景**：双径向渐变叠加在 surface 上 — 左上角主色光晕 20%，右上角青色光晕 14%
- **卡片**：160° 线性渐变，从 surface-elevated 混白 8% 到纯 surface-elevated
- **按钮**：主色实底为主，无渐变；hover 时可添加微妙的亮度提升
- **内容区域**：无渐变 — 让视频/图片内容自身的色彩成为唯一视觉丰富度来源

---

## 3. Typography Rules

### Font Family

- **标题**: `Space Grotesk`（几何无衬线，weight 500–700）— 紧凑、现代、带有工程精度感
- **正文/UI**: `Plus Jakarta Sans`（人文无衬线，weight 400–700）— 清晰易读，微妙的圆润感
- **Fallback**: `Segoe UI, system-ui, -apple-system, sans-serif`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Hero Display | Space Grotesk | 48px (3rem) | 600 | 1.05 | -1.5px | 首页 Hero 标题 |
| Page Title | Space Grotesk | 24px (1.5rem) | 600 | 1.15 | -0.5px | 页面顶部标题（如"生成视频"） |
| Section Title | Space Grotesk | 18px (1.125rem) | 600 | 1.25 | -0.3px | 卡片区块标题 |
| Card Title | Plus Jakarta Sans | 15px (0.9375rem) | 600 | 1.3 | -0.1px | 卡片内标题 |
| Body | Plus Jakarta Sans | 14px (0.875rem) | 400 | 1.5 | normal | 正文/描述 |
| Body Small | Plus Jakarta Sans | 13px (0.8125rem) | 400 | 1.45 | normal | 次要描述 |
| Label | Plus Jakarta Sans | 12px (0.75rem) | 500 | 1.4 | 0.3px | 标签、元数据 |
| Micro Label | Plus Jakarta Sans | 11px (0.6875rem) | 600 | 1.2 | 0.5px | 徽标、uppercase 小标签 |
| Section Overline | Plus Jakarta Sans | 11px | 600 | 1.0 | 1.5px | `uppercase`，区块上方引导词 |

### Principles

- **标题负字距**：所有 Space Grotesk 标题使用负 letter-spacing，创造紧凑的编辑室感觉
- **正文克制行高**：Body 行高 1.5 而非 1.75，保持信息密度，适合工具型界面
- **Overline 大写间距**：小号 uppercase 标签使用正向 letter-spacing（1–2px），提供结构性视觉锚点
- **中文友好**：避免极端负字距（不超过 -1.5px），确保中文字符不粘连

---

## 4. Component Stylings

### Buttons

**Primary（药丸形）**
- Background: `var(--color-primary)`
- Text: `#ffffff`, weight 600, 14px
- Radius: `9999px`（全药丸）
- Padding: `10px 20px`
- Shadow: `0 0 20px rgba(124, 141, 255, 0.25)`（主色光晕）
- Hover: `var(--color-primary-hover)` + `scale(1.02)` + shadow 加强
- Active: `scale(0.97)`
- Transition: `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`

**Secondary（毛玻璃）**
- Background: `rgba(255, 255, 255, 0.06)`
- Border: `1px solid var(--color-border)`
- Text: `var(--color-text)`, weight 500, 14px
- Radius: `12px`
- Hover: `rgba(255, 255, 255, 0.1)` + border 亮化
- Backdrop: `blur(8px)`

**Ghost（幽灵）**
- Background: `transparent`
- Text: `var(--color-text-muted)`, weight 500
- Hover: `var(--color-surface-hover)` 背景浮现 + text 变 `var(--color-text)`

**Tag/Chip（标签药丸）**
- Background: `var(--color-primary)/10`
- Border: `1px solid var(--color-primary)/30`
- Text: `var(--color-primary-hover)`, weight 600, 11px
- Radius: `9999px`
- Padding: `4px 12px`

### Cards

**Standard Card (`gobs-card`)**
- Background: 160° 线性渐变（surface-elevated 混白 8% → 纯 surface-elevated）
- Border: `1px solid var(--color-border)` at 80% opacity
- Shadow: `inset 0 1px 0 rgba(255,255,255,0.05)` + `0 8px 24px rgba(2,8,24,0.24)`
- Radius: `16px`（内容卡片）/ `24px`（Hero 卡片）
- Hover: border-color 混入主色 45%

**Glass Surface (`gobs-glass`)**
- Background: `color-mix(in srgb, var(--color-surface-elevated) 88%, transparent)`
- Backdrop: `blur(10px)`
- 用于侧栏、浮动工具条、弹出层

**Video Preview Card**
- Radius: `8px`（更小，不干扰视频内容）
- Shadow: none — 视频内容自带视觉重量
- Hover: 薄主色光环 `0 0 0 1px var(--color-primary)/30`
- 比例：保持原始宽高比，`object-fit: cover`

### Inputs & Forms

- Background: `var(--color-surface-elevated)`
- Border: `1px solid var(--color-border)`
- Radius: `12px`
- Text: `var(--color-text)`, 14px
- Placeholder: `var(--color-text-subtle)`
- Focus: `border-color: var(--color-primary)` + `box-shadow: 0 0 0 2px var(--color-primary)/25`
- Textarea: 相同规则，min-height 按需

### Navigation (Sidebar)

- Width: `240px` (w-60)
- Background: `var(--color-surface-elevated)` at 85% opacity + glass blur
- Border-right: `1px solid var(--color-border)/70`
- Nav Item:
  - Padding: `10px 12px`
  - Radius: `8px`
  - Text: 14px, weight 500, `var(--color-text-muted)`
  - Icon: 20px, stroke-width 2
  - Gap: `12px`（icon ↔ text）
  - Hover: `var(--color-surface-hover)` 背景 + text 变 `var(--color-text)` + `translateX(2px)`
  - Active: `var(--color-primary)/14` 背景 + `var(--color-primary-hover)` text + `1px solid var(--color-primary)/35` 边框

---

## 5. Layout Principles

### Spacing System

Base unit: **4px**

| Scale | Value | Usage |
|-------|-------|-------|
| 0.5 | 2px | 微间距（icon 与 badge） |
| 1 | 4px | 紧凑间距 |
| 1.5 | 6px | 组件内紧凑 |
| 2 | 8px | 组件内标准 |
| 3 | 12px | 组内元素间距 |
| 4 | 16px | 卡片内 padding |
| 5 | 20px | 区块内 padding |
| 6 | 24px | 区块间距 |
| 8 | 32px | 主内容区 padding |
| 10 | 40px | section 间距 |
| 12 | 48px | 大 section 间距 |

### Grid & Container

- **Max width**: `1280px`（max-w-5xl 到 max-w-6xl）
- **Content padding**: `16px`（mobile）/ `24px`（desktop）
- **Column patterns**: 
  - 1 列：全宽 Hero、表单
  - 2 列：特性展示（40% text + 60% preview）
  - 3 列：步骤卡片、快捷入口
  - 4 列：网格缩略图

### Whitespace Philosophy

- **密中有疏**：组件内部紧凑（行高低、间距小），组件之间留足呼吸空间（section gap 48px）
- **视频内容不留白**：视频预览/分镜卡片的图像区域全填充，padding 为 0
- **文字区精确留白**：标题与描述之间 4–8px，描述与操作之间 16–20px

### Border Radius Scale

| Size | Value | Usage |
|------|-------|-------|
| sm | 6px | 小标签、inline 元素 |
| md | 8px | 按钮（非药丸）、视频卡片 |
| lg | 12px | 输入框、次要卡片 |
| xl | 16px | 标准内容卡片 |
| 2xl | 24px | Hero 卡片、大容器 |
| full | 9999px | 药丸按钮、标签 chip |

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 — Flat | 无阴影，纯表面色 | 页面背景、列表行 |
| 1 — Bordered | `1px solid var(--color-border)` | 基础卡片、输入框 |
| 2 — Glow Ring | `0 0 0 1px var(--color-primary)/20` | 选中卡片、focus 态的容器 |
| 3 — Glass | `backdrop-blur(10px)` + 半透明背景 | 侧栏、浮动工具条 |
| 4 — Elevated | `inset 0 1px 0 rgba(255,255,255,0.05)` + `0 8px 24px rgba(2,8,24,0.24)` | Hero 卡片、modal |
| 5 — Floating | Level 4 + `0 0 30px var(--color-primary)/15` | Toast、dropdown |

### Shadow Philosophy

借鉴 Framer 的暗色深度理念：
- **光而非影**：深色界面中，深度感通过光晕（glow）而非暗影表达
- **主色光环**：选中、悬浮时用低透明度主色 ring shadow 营造"发光"感
- **白边高光**：卡片顶部 `inset 0 1px 0 rgba(255,255,255,0.05)` 模拟顶光
- **视频区零阴影**：借鉴 RunwayML，视频/图片内容区不加阴影，内容自带视觉重量

---

## 7. Do's and Don'ts

### Do

- ✓ 使用 CSS 变量 `var(--color-*)` 作为唯一色彩来源
- ✓ 按钮 CTA 使用全药丸（9999px radius）+ 主色光晕阴影
- ✓ 视频预览区域保持小圆角（8px），让内容占满画幅
- ✓ 标题使用 Space Grotesk + 负字距，正文用 Plus Jakarta Sans
- ✓ Overline 标签使用 uppercase + 正字距（1–2px）
- ✓ 卡片边框 hover 时混入主色，提供微妙的交互反馈
- ✓ 深色表面上用白色 inset 高光模拟顶部光线
- ✓ 侧栏和浮层使用 glass 效果（半透明 + blur）
- ✓ 一切过渡使用 `cubic-bezier(0.4, 0, 0.2, 1)`

### Don't

- ✗ 不在组件中直接使用 Tailwind 默认色阶（`zinc-*`、`sky-*`）— 全部走 token
- ✗ 不给视频/图片内容添加投影 — 内容自带视觉重量
- ✗ 不混用 `@theme` 和 `:root` 定义同名变量 — 单一来源
- ✗ 不在标题上使用 bold (700+) — 600 是标题最重的字重
- ✗ 不使用暖灰色 — 保持冷蓝调灰（`#7681ab` 系列）
- ✗ 不在深色模式使用纯白背景区块 — 最亮的表面是 `#1a2034`
- ✗ 不让装饰元素（emoji、图标）成为视觉主角 — 内容和功能优先
- ✗ 不使用 line-height > 1.6 — 保持编辑室般的信息密度

---

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <640px | 侧栏收起为汉堡菜单，内容单列，Hero 文字缩小 |
| Tablet | 640–1024px | 侧栏显现，内容 2 列，卡片保持全宽 |
| Desktop | >1024px | 完整布局，3–4 列网格，max-w 容器居中 |

### Touch Targets

- 所有可交互元素最小 44px（高度或直径）
- 侧栏 NavLink: `py-2.5`（约 40px 高）+ gap 确保足够
- 药丸按钮: `h-10`（40px）最小
- 移动端卡片: 全宽，内 padding 16px

### Collapsing Strategy

- **侧栏**: `translate-x` 抽屉 + 遮罩，300ms ease-in-out
- **Hero**: 文字从 48px → 32px，padding 减半
- **步骤卡片**: 横排 → 竖排
- **快捷入口网格**: 4 列 → 2 列
- **全屏工作区**（编辑器/制片/风控）: 始终全屏，无 padding

---

## 9. Agent Prompt Guide

### Quick Color Reference

```
Background:      #090b13 (deep space blue-black)
Elevated:        #131726 (card/sidebar surface)
Hover:           #1a2034 (interactive hover)
Primary:         #7c8dff (indigo-blue)
Primary Hover:   #97a4ff (lighter indigo)
Text:            #edf1ff (near-white, cool)
Text Muted:      #a7b1d5 (cool silver)
Text Subtle:     #7681ab (slate blue)
Border:          #2d3756 (dark slate)
```

### Example Component Prompts

- "创建 Hero 区：`#090b13` 深色背景上 `gobs-card` 容器（24px radius），48px Space Grotesk 标题白色，letter-spacing -1.5px，下方 14px Plus Jakarta Sans 灰色描述（`#a7b1d5`），底部有玻璃态输入框"
- "设计侧栏导航项：8px radius，12px gap（icon↔text），左侧 20px stroke 图标 + 14px 文字。默认 `#a7b1d5` 文字色，hover 背景 `#1a2034` + 文字变白 + translateX(2px)。Active 状态 primary/14 背景 + primary 边框"
- "视频预览卡片：8px radius，无阴影，hover 时 `0 0 0 1px rgba(124,141,255,0.3)` 主色光环。内部视频 object-fit cover，底部覆盖半透明黑渐变 + 白色小标题"

### Iteration Guide

1. 颜色永远走 `var(--color-*)` — 禁止裸写 hex 或 Tailwind 默认色
2. 卡片边框 hover 效果是品牌签名 — `color-mix(in srgb, var(--color-primary) 45%, var(--color-border))`
3. 药丸按钮 + 主色光晕是 CTA 的唯一形态 — 不用方角按钮做主操作
4. 视频/图片区域零阴影、小圆角 — 借鉴 RunwayML 的电影内容优先
5. 标题 Space Grotesk + 负字距是品牌字体签名 — 不可省略
