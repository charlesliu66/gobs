# Builder Report: Legacy Path Fallbacks

## Summary

本轮实现的是双环境目录拆分后的历史路径兼容层，目标是让已有数据在 `shared-data` 新布局下继续可读、可迁移、可部署。

## Scope Mapping

| Area | Implementation |
|---|---|
| Editor project fallback and rehome | `h5-video-tool-api/src/services/editorProjectStorage.ts`, `src/routes/editorAgent.ts`, `src/routes/editorProjects.ts` |
| Output gallery legacy output fallback | `h5-video-tool-api/src/routes/video.ts`, `src/services/outputGalleryService.ts` |
| GeeLark config fallback | `h5-video-tool-api/src/services/geelark.ts`, `src/gobs/gobsPublishCatalog.ts` |
| Imagen runtime script fallback | `h5-video-tool-api/src/services/imagenPython.ts` |
| Dual-env legacy data migration | `scripts/init_dual_env_server.py`, `scripts/tests/test_init_dual_env_server.py` |
| Product docs | `PRODUCT.md`, `CHANGELOG.md` |

## Verification Evidence

- PASS: `cd h5-video-tool-api && npm run build`
- PASS: `cd h5-video-tool && npm run build`
- PASS: `cd h5-video-tool-api && npx tsx --test tests/editorProjectStorageLegacyFallback.test.ts tests/geelarkConfigPathFallback.test.ts tests/imagenScriptPathFallback.test.ts tests/outputGalleryLegacyFallback.test.ts`
- PASS: `python -m unittest scripts.tests.test_init_dual_env_server`

## Notes

- Frontend code was not changed in this batch, but frontend build was still executed to satisfy release policy.
- The fallback tests need `tsx --test`; `node --test` alone does not resolve the backend TypeScript module graph correctly in this package.

