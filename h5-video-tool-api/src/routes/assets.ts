/**
 * 素材库 API 路由
 */
import { Router, Request, Response } from 'express';
import {
  loadAssetIndex,
  saveAssetIndex,
  buildAssetIndex,
  autoTagImage,
  type Asset,
  type AssetType,
} from '../services/assetLibrary.js';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import { getApiDataDir } from '../config/apiDataDir.js';

const assetsRouter = Router();

/**
 * GET /api/assets
 * 获取素材索引
 */
assetsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const index = await loadAssetIndex();
    res.json(index);
  } catch (err) {
    console.error('[assets] 加载索引失败', err);
    res.status(500).json({ error: '加载素材库失败' });
  }
});

/**
 * POST /api/assets/auto-tag
 * 自动打标签
 * Body: { imageBase64, filename }
 */
assetsRouter.post('/auto-tag', async (req: Request, res: Response) => {
  const { imageBase64, filename } = req.body as { imageBase64?: string; filename?: string };
  if (!filename) {
    res.status(400).json({ error: '请提供文件名' });
    return;
  }
  try {
    const result = await autoTagImage({
      imageBase64: typeof imageBase64 === 'string' ? imageBase64 : undefined,
      filename,
    });
    res.json(result);
  } catch (err) {
    console.error('[assets/auto-tag] 失败', err);
    res.status(500).json({ error: err instanceof Error ? err.message : '自动识别失败' });
  }
});

/**
 * POST /api/assets/scan
 * 扫描 uploads 目录，重新建索引
 */
assetsRouter.post('/scan', async (_req: Request, res: Response) => {
  try {
    const index = await buildAssetIndex();
    res.json({ success: true, count: index.assets.length });
  } catch (err) {
    console.error('[assets/scan] 失败', err);
    res.status(500).json({ error: err instanceof Error ? err.message : '扫描失败' });
  }
});

/**
 * POST /api/assets/upload
 * 上传并加入素材库
 * Body: { imageBase64, filename, metadata?: Partial<Asset> }
 */
assetsRouter.post('/upload', async (req: Request, res: Response) => {
  const { imageBase64, filename, metadata } = req.body as {
    imageBase64?: string;
    filename?: string;
    metadata?: Partial<Asset>;
  };

  if (!imageBase64 || !filename) {
    res.status(400).json({ error: '请提供 imageBase64 和 filename' });
    return;
  }

  try {
    // 保存文件到本地
    const uploadsDir = path.join(getApiDataDir(), 'uploads', 'assets');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const ext = path.extname(filename) || '.png';
    const savedFilename = `${nanoid()}${ext}`;
    const localPath = path.join(uploadsDir, savedFilename);
    fs.writeFileSync(localPath, Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64'));

    // 打标签
    const tagged = await autoTagImage({ imageBase64, filename });

    // 合并用户覆盖的元数据
    const asset: Asset = {
      id: nanoid(),
      file: path.relative(getApiDataDir(), localPath),
      localPath,
      type: metadata?.type ?? tagged.type,
      name: metadata?.name ?? tagged.name,
      tags: metadata?.tags ?? tagged.tags,
      gameVersion: metadata?.gameVersion ?? tagged.gameVersion,
      description: metadata?.description ?? tagged.description,
    };

    // 更新索引
    const index = await loadAssetIndex();
    index.assets.push(asset);
    await saveAssetIndex(index);

    res.json({ asset, autoTag: tagged });
  } catch (err) {
    console.error('[assets/upload] 失败', err);
    res.status(500).json({ error: err instanceof Error ? err.message : '上传失败' });
  }
});

/**
 * PUT /api/assets/:id
 * 更新素材元数据
 */
assetsRouter.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body as Partial<Asset>;

  try {
    const index = await loadAssetIndex();
    const idx = index.assets.findIndex((a) => a.id === id);
    if (idx < 0) {
      res.status(404).json({ error: '素材不存在' });
      return;
    }

    const allowed: (keyof Asset)[] = ['name', 'type', 'tags', 'gameVersion', 'description'];
    for (const key of allowed) {
      if (key in updates) {
        (index.assets[idx] as unknown as Record<string, unknown>)[key] = updates[key];
      }
    }

    await saveAssetIndex(index);
    res.json({ asset: index.assets[idx] });
  } catch (err) {
    console.error('[assets/:id PUT] 失败', err);
    res.status(500).json({ error: err instanceof Error ? err.message : '更新失败' });
  }
});

/**
 * DELETE /api/assets/:id
 * 删除素材（仅从索引移除，不删实体文件）
 */
assetsRouter.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const index = await loadAssetIndex();
    const idx = index.assets.findIndex((a) => a.id === id);
    if (idx < 0) {
      res.status(404).json({ error: '素材不存在' });
      return;
    }
    index.assets.splice(idx, 1);
    await saveAssetIndex(index);
    res.json({ success: true });
  } catch (err) {
    console.error('[assets/:id DELETE] 失败', err);
    res.status(500).json({ error: err instanceof Error ? err.message : '删除失败' });
  }
});

export default assetsRouter;
