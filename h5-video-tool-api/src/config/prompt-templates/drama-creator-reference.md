# drama-creator 竖屏短剧方法论（集成参考）

> Archived reference: `short-drama` / `cat-harem` were removed from active Advanced Studio templates in run `2026-05-09-advanced-studio-template-optimization`. This document is retained only as historical methodology for any future Production Wizard preset migration.

本文件为 `short-drama` 模板提供理论支撑，能力来源于 [drama-creator](https://skills.sh/vangongwanxiaowan/screen-creative-skills/drama-creator) skill。

## 核心理论

### 1. 情绪弹簧理论
- **压弹簧**：误会、主角被压制、反派嚣张、危机降临 → 积蓄观众负面情绪
- **放弹簧**：打脸、反转、身份揭晓、真相大白 → 瞬间释放情绪
- **硬性指标**：每镜/每段要么压要么放，无中间状态

### 2. 钩子-反转-再钩子
- **开篇钩子**：5 秒内建立微型冲突或悬念
- **中段反转**：30-45 秒出现情节小反转或小高潮
- **结尾再钩子**：抛出更强悬念或未完成的打脸动作

### 3. 信息前置，废话后置
- 台词直白，第一时间抛出身份、冲突、目标
- 消灭绕弯子对话

### 4. 动作可视化
- 用动词和短句，避免形容词堆砌
- 预设竖屏特写与快剪镜头

## 在 short-drama 模板中的应用

`short-drama.json` 的 `systemPromptSuffix` 已将上述方法论注入 LLM system prompt。
`promptPolish.ts` 在 `templateId === 'short-drama'` 时，会将 `systemPromptSuffix` 作为「模板专属要求」附加到 `VEO_MULTI_SHOT_SYSTEM`。

## 内置模板：猫猫后宫剧 (cat-harem)

模板 `cat-harem` 提供《橘座的三选一》预设剧本：橘猫男主被高冷白猫、撒娇布偶、傲娇黑猫追求，争宠吃醋打脸。用户上传 4 张猫咪图（按顺序对应 @图片1～4）即可生成 6 镜 30 秒视频。详见 `cat-harem.json`。

## 扩展方向
- 人物参考输入：支持上传人物图，自动映射 @图片1、@图片2
- 剧情生成：从零创意（如「打脸场景」「霸道总裁」）生成完整分镜
