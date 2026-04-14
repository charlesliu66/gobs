# TASK-D：接入视频生成与剪辑

## 目标
资产中台不是孤岛，必须直接产出价值。

## 生成侧接入
- Studio / Production Wizard 增加"从资产库选素材"入口
- 所选素材自动映射到 `dreaminaPromptHints` / 参考图视频参数
- 支持选多张参考图，自动拼入 prompt 结构

## 剪辑侧接入
- Editor 侧边栏新增"项目资产库" tab
- 支持拖拽素材到时间轴
- 视频素材返回高光候选片段（先规则版：按音量峰值 + 画面变化率）

## 验收标准
- [x] 用户无需重复上传素材即可在生成流程中使用（AC-D1: TabGenerate "从资产库选参考图" 按钮）
- [x] 剪辑器可直接消费资产库素材（AC-D2: Editor MediaLibrary "项目资产库" tab）
- [x] 视频素材有高光候选时间点提示（AC-D3: GET /api/asset-library/assets/:id/highlights）
- [x] npm run build 零错误（AC-D4: 前后端均通过）

## 完成时间
2026-04-14

## Run 目录
docs/workflow/runs/2026-04-14-asset-lib-task-d/
