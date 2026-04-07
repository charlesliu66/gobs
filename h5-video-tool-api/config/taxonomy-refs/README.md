# 职业 / 场景参考图（给 Gemini 比对录屏）

将 **3～5 张/类** 的典型截图放入对应子目录即可，支持 `.jpg` / `.png` / `.webp`。

## 目录约定

与 `game-taxonomy.json` 里 `roles`、`scenes` 的**中文名完全一致**（文件夹名）：

```
config/taxonomy-refs/
  roles/
    盗贼/
      01.jpg
      02.jpg
    祭司/
      ...
  scenes/
    王城/
      01.png
    海岛/
      ...
```

- `game-taxonomy.json` 中需设置 `"referenceImagesRoot": "config/taxonomy-refs"`（或你的自定义根目录）。
- 图片会在**视觉分析的第一个批次**里，插在录屏抽帧之前送给模型；未放置的类不会传图，不影响跑通。

## 选图建议

- **职业**：站立/技能前摇清晰、职业特征（武器、剪影、UI）可见；避免强剧透剧情。
- **场景**：有地标、天空盒或区域 loading 图一致的画面。
- 单张不宜过大；若报错可减小张数或调低 `EDITOR_TAXONOMY_REF_MAX`。

## 环境变量（可选）

- `EDITOR_TAXONOMY_REF_PER_LABEL`：每类最多几张（默认 3）
- `EDITOR_TAXONOMY_REF_MAX`：全局参考图上限（默认 24）

修改词表或参考图后，**重启 API**；词表 JSON 文件保存后会自动按修改时间重载。

## 批量压缩（换大图后执行）

在后端目录执行：

```bash
npm run compress:taxonomy-refs
```

长边限制 1600px、JPEG 质量 82；PNG 会转为 `.jpg`。脚本见 `scripts/compress-taxonomy-refs.ts`。
