# 高级制片参考图素材库选取设计

> 日期：2026-04-22
> 主题：在高级制片 Step 0 的“参考图反解析”处支持直接从素材库选图

---

## 背景

当前高级制片的“参考图反解析”只支持本地文件上传。用户如果已经把参考图沉淀在素材库里，还需要先回到素材库下载，再重新上传到高级制片，操作割裂且重复。

`ProductionWizard` 现有链路已经具备完整的参考图处理能力：
- 预览图即时展示
- `production/images` 上传，避免草稿 JSON 长期保留大体积 data URL
- `/api/studio/extract-style-reference` 风格反解析
- 解析结果回填 `styleRefSummary` 与 `styleRefAnalysis`

因此本次设计的目标不是重做后端协议，而是给 Step 0 增加一个更顺手的入口，让素材库图片也能走同一条处理链。

---

## 方案对比

### A. 输入页内置素材库弹层

- 在 `StepInput` 的“参考图反解析”旁新增“从素材库选择”
- 组件内弹出图片素材选择层
- 选中素材后，把远端图片转成 `File`，直接复用现有 `onStyleRefFileChange`

优点：
- 用户路径最短
- 完全复用现有反解析链路，影响面小
- 不需要后端新增接口

缺点：
- `StepInput` 会从纯展示组件变成轻量状态组件

### B. 跳转素材库后带 `assetId` 回跳

- 点击按钮跳到素材库
- 选完后回跳到 `ProductionWizard?assetId=...`
- 复用现有 URL `assetId` 回填逻辑

优点：
- 复用已有回跳逻辑最多

缺点：
- 用户路径更长
- 需要在素材库和高级制片之间来回跳转，打断当前输入流

### C. 直接在 `ProductionWizard` 顶层新增全局素材选择器

- 由 `ProductionWizard` 控制弹层和选图
- `StepInput` 只透传按钮点击事件

优点：
- 页面级状态集中

缺点：
- 需要新增更多 props，改动面反而更大

---

## 结论

采用 **方案 A**。

`StepInput` 直接提供“从素材库选择”入口，选中图片后转成 `File` 并复用现有 `onStyleRefFileChange`。这样后续的预览、上传到 `production/images`、风格反解析、摘要回填都无需额外分叉。

---

## 数据流

1. 用户在 Step 0 点击“从素材库选择”
2. `StepInput` 调 `listAssets({ type: 'image' })` 拉取图片素材
3. 用户选中素材后，组件通过带 token 的素材 URL 拉取 Blob
4. Blob 转成 `File`
5. 调用既有 `onStyleRefFileChange(file)`
6. `ProductionWizard.handleStyleRefFile` 继续执行：
   - 更新预览
   - 写入临时 data URL
   - 上传到 `production/images`
   - 调 `/api/studio/extract-style-reference`
   - 回填 `styleRefSummary` / `styleRefAnalysis`

---

## 错误处理

- 素材库列表加载失败：弹层内展示错误，不影响当前表单其他输入
- 选中非图片素材：提示“只能选择图片素材作为参考图”
- 素材拉取失败：保持弹层，允许重新选择
- 风格反解析失败：沿用现有 `ProductionWizard` 错误反馈

---

## 验证点

- Step 0 出现“从素材库选择”入口
- 弹层只展示图片素材
- 选中图片后会关闭弹层并触发既有反解析链路
- 构建通过，不引入新的后端改动
