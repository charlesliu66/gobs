# Planner Spec: Legacy Path Fallbacks

## Background

双环境目录拆分之后，线上 API 的运行目录从单一 `qas-h5/api` 迁移到 `qas-h5/<env>/api + <env>/shared-data`。已有若干能力仍默认依赖旧目录：

- 剪辑项目仍可能落在旧 `api/editor-projects`
- 服务端成片仍可能留在旧 `api/output/<user>`
- GeeLark 账号配置可能位于共享 `../../config/geelark-accounts.json`
- Imagen 运行时脚本在部署后位于环境根目录 `scripts/imagen_generate.py`

如果没有路径回退和数据归位，这些历史数据会在新布局下表现为“列表为空 / 文件找不到 / 配置丢失 / 脚本找不到”。

## Decision

补一层保守兼容：

1. Editor projects: 读取时优先走 `shared-data/editor-projects`，命中旧路径时自动 copy 到新目录。
2. Output gallery: 扫描与文件访问同时支持 `shared-data/output` 和旧 `api/output`。
3. GeeLark config: 增加 `../../config/geelark-accounts.json` 回退。
4. Imagen script: 运行时脚本解析支持 repo 根层 `scripts/imagen_generate.py`。
5. Dual-env init script: 初始化时把旧 `api` 下关键历史数据复制到新 `shared-data`。

## Acceptance Criteria

### Product

- 历史剪辑项目在新目录布局下仍可加载，不要求用户手动搬文件。
- 服务端文件页在共享目录为空时仍能展示旧 `api/output` 下属于当前账号的视频。
- GeeLark 账号列表在 `qas-h5/config/geelark-accounts.json` 布局下仍可读取。
- Imagen 生图在 `prod/api` / `staging/api` 运行目录下仍能找到脚本。

### Engineering

- 所有回退仅在目标路径真实存在时生效，不扩大权限边界。
- 不修改禁区文件。
- 补齐 targeted tests 覆盖 editor project / output gallery / GeeLark config / imagen script / dual-env init script。
- Backend build 通过；frontend build 通过。

### Release

- 更新 `PRODUCT.md` 与 `CHANGELOG.md`。
- 提交并 push 到 `origin/main` 后再执行 `staging -> smoke -> prod`。

## Test Matrix

| Area | Verification |
|---|---|
| Backend build | `cd h5-video-tool-api && npm run build` |
| Frontend build | `cd h5-video-tool && npm run build` |
| Backend fallback tests | `node --test tests/editorProjectStorageLegacyFallback.test.ts tests/geelarkConfigPathFallback.test.ts tests/imagenScriptPathFallback.test.ts tests/outputGalleryLegacyFallback.test.ts` |
| Init script tests | `python -m unittest scripts.tests.test_init_dual_env_server` |
| Staging smoke | `gobs-h5-smoke-test` quick |
| Prod smoke | `gobs-h5-smoke-test` quick |
