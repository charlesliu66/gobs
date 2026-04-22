# Planner Spec - style-ref picker preview fix

> Run: `2026-04-22-style-ref-picker-preview-fix`
> Gate 1 产物

---

## 背景

高级制片 Step 0 新增“从素材库选择”后，素材列表能正常拉起，但弹层中的图片全部裂图。用户反馈说明元数据列表已成功返回，因此问题更可能出在素材卡片预览 URL 的访问方式，而不是素材本身不存在。

## 根因

`StepInput` 弹层预览直接使用 `asset.thumbnail_url ?? asset.file_url`。这两个字段在当前环境里并不保证自带可用鉴权参数，所以 `<img>` 请求会被拦下，表现为卡片全裂图。

## 方案

- 素材卡片预览不再依赖列表接口返回的裸地址
- 统一改走带 token 的素材文件 URL
- 保持选中素材后的主链路不变，仍复用 `onStyleRefFileChange`

## AC

| # | 场景 | 预期 |
|---|---|---|
| AC-1 | 打开“从素材库选择”弹层 | 图片素材卡片正常显示预览 |
| AC-2 | 预览 URL 规则回归 | 测试明确锁定为受保护 URL |
