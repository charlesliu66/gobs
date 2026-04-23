# SESSION-ANCHOR - output gallery usability

> Run ID: `2026-04-23-output-gallery-usability`
> Sprint: gallery usability polish
> 对应问题：我的成片里的“服务端文件”缺少用户级隐藏、搜索与筛选，且即梦回补范围不够清晰

---

## 目标（一句话）

让“我的成片 -> 服务端文件”从单纯的目录列表升级为可搜索、可筛选、可按当前账号隐藏的服务端成片工作台。

## 本轮交付

| ID | 交付项 | 主要落地文件 |
|---|---|---|
| OG-01 | 服务端文件列表支持搜索、来源筛选、时间筛选 | `h5-video-tool-api/src/routes/video.ts`, `h5-video-tool/src/api/video.ts` |
| OG-02 | 服务端文件支持“仅当前账号隐藏/恢复显示” | `h5-video-tool-api/src/routes/video.ts`, `h5-video-tool-api/src/services/outputGalleryService.ts` |
| OG-03 | 前端补齐搜索栏、筛选 chips、隐藏入口、已保存状态 | `h5-video-tool/src/components/GalleryView.tsx`, `h5-video-tool/src/components/outputGalleryUtils.ts` |
| OG-04 | 回归测试覆盖过滤与隐藏规则 | `h5-video-tool-api/tests/outputGalleryService.test.ts`, `h5-video-tool/tests/outputGalleryUtils.test.ts` |

## 本轮禁区

- 不改 Dreamina / Kling / Veo 底层生成服务
- 不改现有视频落盘路径结构
- 不在这一轮重构即梦任务的历史 owner 归属推断
