# Game Director Pro — 游戏视频导演 · 顶配版（封装版）

一个完整的 **Cursor Skill**：游戏宣传与病毒向短视频全流程（创意简报 → 分镜/脚本/即梦安全提示词 → 每镜首帧/尾帧图 → 视频生成 → 成片合成 → 社媒策略）。支持宣传向（新角色/新地图公式）与病毒向（趋势+Meme 前置）。镜头与分镜图已补强自 seedance-storyboard 与 storyboard-creation。

---

## 如何分享给其他人

1. **打包**：将本文件夹 **`game-director-pro`** 整体压缩为 zip（或直接复制整个文件夹）。
2. **发给对方**：通过网盘、Git 仓库、或公司内网分享。
3. **对方安装**：让对方解压/复制到其 Cursor 的 skills 目录，并阅读 **`安装与使用说明.md`** 完成安装与配置。

对方无需再安装其他 skill，本目录已包含全部 references 与 scripts。

---

## 安装方法（接收方）

- **项目内使用**：复制到项目的 `.cursor/skills/` 下，得到 `项目/.cursor/skills/game-director-pro/`。
- **全局使用**：复制到 Cursor 用户级 skills 目录（见 Cursor 设置中的 Skills 路径）。

详细步骤、配置 API、使用流程见：**`安装与使用说明.md`**。

---

## 目录结构

```
game-director-pro/
├── SKILL.md                 # 主技能说明（Agent 入口）
├── README.md                # 本说明（封装版）
├── 安装与使用说明.md         # 给「其他人」的安装与使用指南
├── requirements.txt         # 可选 Python 依赖（python-dotenv）
├── .env.example             # 环境变量模板，复制为 .env 后填入 Key
├── .gitignore               # 忽略 .env，勿提交 Key
├── references/              # 参考文档
│   ├── platform_specs.md
│   ├── kling_api_docs.md
│   ├── prompt_templates.md
│   ├── rules_and_formulas.md   # 新英雄/新地图模板、Hook、公式
│   ├── asset_library_guide.md
│   ├── frame_image_api_guide.md # 首帧/尾帧生图 API 绑定
│   └── ...
└── scripts/
    ├── asset_manager.py           # 素材库搜索
    ├── generate_frame_images.py  # 按分镜 JSON 批量生成首帧/尾帧图
    ├── call_kling_api.py         # 火山 Ark 视频生成
    ├── concat_shots_to_final.py  # 成片合成（需 FFmpeg）
    ├── generate_production.py
    └── *.json                    # 示例 batch 配置
```

---

## 环境与配置概要

| 功能 | 所需配置 |
|------|----------|
| 首帧/尾帧生图 | `FRAME_IMAGE_API_KEY`、`FRAME_IMAGE_API_URL`（火山填 `volcano`）、`FRAME_IMAGE_API_MODEL`（Endpoint ID）；见 `references/frame_image_api_guide.md` |
| 视频生成 | `SEEDANCE_API_KEY`（火山 Ark）；见 `references/kling_api_docs.md` |
| 成片合成 | 本机安装 FFmpeg 并加入 PATH |

`.env` 从项目根或本 skill 目录加载（脚本会尝试两者）；勿提交 `.env`。

---

## 本 Skill 包含内容

- **SKILL.md**：三阶段流程、模式选择、安全红线、角色一致性、确认门；新英雄/新地图模板。
- **references/**：平台规格、Kling/即梦 API、提示词与公式、**首帧/尾帧生图 API 绑定**、素材库约定。
- **scripts/**：素材库搜索、**按分镜生成首帧/尾帧图**、视频生成、成片合成；均在本目录内，无需其他 skill。

其他人安装本文件夹后，在 Cursor 中按 SKILL 流程使用即可。
