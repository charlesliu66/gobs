# Builder Report: Production Wizard Imagen Runtime Script

## Implementation

- `scripts/deploy_api.py`
  - 增加运行时脚本列表，目前包含 `imagen_generate.py`。
  - 计算目标环境运行时目录为 `remote_parent(api_dir)/scripts`，对应 `/home/ubuntu/qas-h5/prod/scripts` 和 `/home/ubuntu/qas-h5/staging/scripts`。
  - 上传 `dist/` 后同步上传运行时脚本，再重启 PM2。
  - 缺少本地运行时脚本时提前失败，避免部署一个已知会损坏生图链路的版本。
- `scripts/tests/test_deploy_api.py`
  - 补充运行时脚本目录计算、脚本列表和缺失脚本拦截测试。
- `PRODUCT.md` / `CHANGELOG.md` / daily report
  - 记录 v0.126 修复和验证结果。

## Acceptance Mapping

- 覆盖所有高级制片 Compass/Imagen 生图入口：通过修复共用后端脚本部署完成。
- 不修改底层视频生成服务：未触碰 forbidden files。
- 不修改 Python 生图脚本逻辑：仅部署该脚本。
- 增加回归测试：`scripts.tests.test_deploy_api`。
