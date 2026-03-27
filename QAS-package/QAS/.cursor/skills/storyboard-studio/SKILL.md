---
name: storyboard-studio
description: 面向视频分镜的专业指导。基于分镜大师(Storyboard Studio)工作流，提供镜头类型、构图、光线、色调、运镜等电影级参数规范。Use when creating storyboards, writing AI image/video prompts, designing shot structures, or building video production tools.
---

# 分镜大师 Storyboard Studio 参考技能

基于 [BroderQi/Storyboard](https://github.com/BroderQi/Storyboard) 开源项目的专业分镜工作流与 AI 生成最佳实践。

## 工作流概览

```
创建项目 → 导入视频/输入文本 → 抽帧/生成分镜 → AI 解析镜头 → 编辑 → 生成图片/视频 → 合成成片 → 导出
```

| 模式 | 输入 | 处理 |
|------|------|------|
| **视频导入** | 现有视频 | 智能抽帧 → AI 分析首尾帧 → 生成结构化描述 |
| **文本生成** | 自然语言描述 | AI 拆分为多个镜头 → 自动生成专业参数 |

---

## 镜头类型 (Shot Type)

| 类型 | 说明 | 适用场景 |
|------|------|----------|
| **特写** (Close-up) | 突出细节、情感 | 表情、产品细节 |
| **近景** | 人物胸部以上 | 对话、情绪 |
| **中景** (Medium Shot) | 人物腰部以上 | 平衡环境与人物 |
| **全景** (Full Shot) | 完整人物 | 展示动作 |
| **远景** (Long Shot) | 大场景 | 氛围、空间感 |
| **大远景** (Extreme Long Shot) | 宏大场景 |  establishing shot |

---

## 构图方式 (Composition)

- **三分法** (Rule of Thirds) — 经典平衡
- **对称构图** (Symmetry) — 庄重、稳定
- **黄金分割** (Golden Ratio) — 自然和谐
- **中心构图** (Center) — 突出主体
- **对角线构图** (Diagonal) — 动感、张力

---

## 光线类型 (Lighting)

- **自然光** (Natural Light) — 真实、柔和
- **柔光** (Soft Light) — 减少阴影，人像
- **逆光** (Backlight) — 轮廓光、氛围
- **侧光** (Side Light) — 立体感、层次
- **顶光** (Top Light) — 戏剧化效果

---

## 色调风格 (Color Tone)

- **暖色调** (Warm) — 温馨、舒适
- **冷色调** (Cool) — 冷静、科技
- **高对比度** (High Contrast) — 强烈、戏剧
- **低饱和度** (Desaturated) — 复古、文艺
- **中性色调** (Neutral)

---

## 运镜方式 (Camera Movement)

- **推进** (Push In) — 增强代入
- **拉远** (Pull Out) — 展现环境
- **平移** (Pan) — 水平展示场景
- **跟随** (Tracking) — 跟随主体
- **环绕** (Orbit) — 展示全貌
- **固定** (Fixed) — 稳定画面

---

## 分镜结构化字段

生成分镜时，每个镜头应包含：

**基础字段（必需）**
- `shotType` — 镜头类型
- `coreContent` — 核心画面内容（主体、环境、氛围）
- `actionCommand` — 动作指令
- `sceneSettings` — 场景设定
- `firstFramePrompt` / `lastFramePrompt` — 首尾帧 AI 生成提示词
- `durationSeconds` — 时长（建议 3–8 秒）

**专业参数（建议）**
- `composition` — 构图
- `lightingType` — 光线
- `timeOfDay` — 时间段（白天/黄昏/夜晚/清晨）
- `colorStyle` — 色调
- `cameraMovement` — 运镜
- `videoPrompt` — 视频主提示词（场景 + 动作 + 风格）

---

## 创意意图融合

设置以下维度可提升 AI 生成质量：

| 维度 | 说明 |
|------|------|
| **创作目标** | 产品宣传、教学演示、故事叙述 |
| **目标受众** | 年轻人、专业人士、儿童等 |
| **视频基调** | 轻松幽默、严肃专业、温馨感人 |
| **关键信息** | 必须传达的核心内容 |

---

## 提示词规范

1. **使用中文**：所有描述、提示词、参数值均用中文
2. **图片提示词**：主体 + 环境 + 光线 + 色调 + 构图 + 风格
3. **视频提示词**：场景 + 动作 + 运镜 + 风格 + 氛围
4. **负面提示**：模糊、变形、低质量等需避免的元素
5. **首尾帧差异**：`firstFramePrompt` 与 `lastFramePrompt` 需体现明显动作变化

---

## 参考资源

- 项目: https://github.com/BroderQi/Storyboard
- 在线演示: http://47.100.163.84/
- 技术栈: .NET 8, Avalonia, SQLite, FFmpeg, 通义千问, 火山引擎 Seedream/Seedance
