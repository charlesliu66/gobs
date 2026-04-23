# Session Anchor: Production Wizard Imagen Runtime Script

> Run ID: `2026-04-23-production-wizard-imagen-runtime-script`  
> Date: 2026-04-23

## Goal

统一排查高级制片图片生成入口，修复线上生成形象变体时报错缺少 `/home/ubuntu/qas-h5/prod/scripts/imagen_generate.py` 的问题。

## Scope

- 高级制片角色定妆 / 形象状态衣橱 / 场景图 / 道具图 / 分镜首帧生成链路。
- 后端部署脚本与部署脚本回归测试。
- 产品与变更记录文档。

## Non-Goals

- 不修改底层视频生成服务。
- 不修改 Compass/Imagen Python 脚本逻辑。
- 不修改用户项目数据或素材库数据。

## Acceptance Commands

```powershell
python -m unittest scripts.tests.test_deploy_api
cd h5-video-tool-api
npx tsc --noEmit
npm run build
cd ..\h5-video-tool
npm run build
```
