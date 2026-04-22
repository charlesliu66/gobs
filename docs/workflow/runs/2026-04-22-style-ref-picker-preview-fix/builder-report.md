# Builder Report - style-ref picker preview fix

> Run: `2026-04-22-style-ref-picker-preview-fix`
> Gate 2 产物

---

## 实现映射

| AC | 实现 |
|---|---|
| PF-01 / AC-1 | `h5-video-tool/src/studio/steps/StepInput.tsx`：素材卡片预览统一改为受保护文件 URL |
| PF-02 / AC-2 | `h5-video-tool/tests/stepInput.test.tsx`：新增预览 URL 规则回归测试 |

## 自测证据

- `..\\h5-video-tool-api\\node_modules\\.bin\\tsx.cmd --test tests/stepInput.test.tsx` 通过
- `h5-video-tool` `npm run build` 通过
- `h5-video-tool-api` `npx tsc --noEmit` 待验证于 Gate 3
