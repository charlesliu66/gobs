# Session Anchor: Legacy Path Fallbacks

> Run ID: `2026-04-24-legacy-path-fallbacks`
> Date: 2026-04-24

## Goal

修复双环境拆分后的历史路径兼容问题，确保旧目录中的剪辑项目、服务端成片、GeeLark 账号配置和 Imagen 运行时脚本，在 `prod/shared-data` 与 `staging/shared-data` 新布局下仍能被稳定读取或自动迁移。

## Scope

- `h5-video-tool-api/src/services/editorProjectStorage.ts`
- `h5-video-tool-api/src/routes/editorAgent.ts`
- `h5-video-tool-api/src/routes/editorProjects.ts`
- `h5-video-tool-api/src/routes/video.ts`
- `h5-video-tool-api/src/services/outputGalleryService.ts`
- `h5-video-tool-api/src/services/imagenPython.ts`
- `h5-video-tool-api/src/services/geelark.ts`
- `h5-video-tool-api/src/gobs/gobsPublishCatalog.ts`
- `scripts/init_dual_env_server.py`
- `scripts/tests/test_init_dual_env_server.py`
- `h5-video-tool-api/tests/editorProjectStorageLegacyFallback.test.ts`
- `h5-video-tool-api/tests/geelarkConfigPathFallback.test.ts`
- `h5-video-tool-api/tests/imagenScriptPathFallback.test.ts`
- `h5-video-tool-api/tests/outputGalleryLegacyFallback.test.ts`
- `PRODUCT.md`
- `CHANGELOG.md`

## Forbidden Files

- `h5-video-tool-api/src/services/dreaminaVideo.ts`
- `h5-video-tool-api/src/services/klingVideo.ts`
- `h5-video-tool-api/src/services/veoPython.ts`
- `h5-video-tool-api/src/services/studioPipeline.ts`
- `h5-video-tool-api/src/types/productionTypes.ts`
- `h5-video-tool-api/src/config/productionAssets.ts`
- `.env`

## Release Requirement

Release must follow `staging -> smoke -> prod`, and the final live SHA must match `origin/main`.

