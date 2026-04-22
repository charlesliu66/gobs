# SESSION-ANCHOR - style-ref picker preview fix

> Run ID: `2026-04-22-style-ref-picker-preview-fix`
> Sprint: production usability polish
> 对应问题：高级制片“从素材库选择”弹层图片裂图

---

## 目标（一句话）

修复高级制片参考图素材选择弹层里的图片预览，让素材库卡片稳定显示真实图片。

## 本轮交付物

| ID | 交付项 | 主要落地文件 |
|---|---|---|
| PF-01 | 素材卡片预览统一走受保护 URL | `h5-video-tool/src/studio/steps/StepInput.tsx` |
| PF-02 | 回归测试锁定预览 URL 规则 | `h5-video-tool/tests/stepInput.test.tsx` |

## 本轮禁区

- 不改素材库后端接口
- 不改高级制片参考图反解析主链路
- 不触碰底层生成服务
