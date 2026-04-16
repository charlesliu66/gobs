/**
 * TASK-A: 规则打标服务
 * 根据资产元数据自动计算并写入 asset_tags
 * TASK-B: 实现 aiTagAsset() — Compass Vision API 打标
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { spawn } from 'child_process';
import db from '../db/assetDb.js';
import type { AssetRecord } from '../types/assetLibrary.js';
import { AI_CATEGORIES } from '../types/assetLibrary.js';
import { compassChatCompletionWithContent } from './promptPolish.js';

const execFileAsync = promisify(execFile);

function nowIso(): string {
  return new Date().toISOString();
}

interface TagRow {
  key: string;
  value: string;
}

function computeRuleTags(asset: AssetRecord): TagRow[] {
  const tags: TagRow[] = [];

  // type: image / video
  if (asset.mimetype.startsWith('image/')) {
    tags.push({ key: 'type', value: 'image' });
  } else if (asset.mimetype.startsWith('video/')) {
    tags.push({ key: 'type', value: 'video' });
  }

  // ratio & orientation（需要宽高）
  if (asset.width && asset.height && asset.width > 0 && asset.height > 0) {
    const w = asset.width;
    const h = asset.height;
    const ratio = w / h;

    // ratio tag
    let ratioValue: string;
    if (Math.abs(ratio - 9 / 16) < 0.05) {
      ratioValue = '9:16';
    } else if (Math.abs(ratio - 16 / 9) < 0.05) {
      ratioValue = '16:9';
    } else if (Math.abs(ratio - 1) < 0.05) {
      ratioValue = '1:1';
    } else {
      ratioValue = 'other';
    }
    tags.push({ key: 'ratio', value: ratioValue });

    // orientation tag
    let orientationValue: string;
    if (w > h) {
      orientationValue = 'landscape';
    } else if (h > w) {
      orientationValue = 'portrait';
    } else {
      orientationValue = 'square';
    }
    tags.push({ key: 'orientation', value: orientationValue });

    // quality tag
    const longSide = Math.max(w, h);
    tags.push({ key: 'quality', value: longSide >= 720 ? 'hd' : 'sd' });
  }

  // duration_range（仅视频）
  if (asset.mimetype.startsWith('video/') && asset.duration !== null && asset.duration !== undefined) {
    let rangeValue: string;
    if (asset.duration < 15) {
      rangeValue = 'short';
    } else if (asset.duration <= 60) {
      rangeValue = 'medium';
    } else {
      rangeValue = 'long';
    }
    tags.push({ key: 'duration_range', value: rangeValue });
  }

  // platform suggestion（基于 orientation + duration）
  const isPortrait = asset.orientation === 'portrait';
  const isLandscape = asset.orientation === 'landscape';
  const dur = asset.duration ?? null;

  if (isPortrait && (dur === null || dur < 60)) {
    tags.push({ key: 'platform', value: 'TikTok' });
  }
  if (isLandscape) {
    tags.push({ key: 'platform', value: 'YouTube' });
  }

  return tags;
}

/**
 * 计算规则标签并批量写入 asset_tags 表
 */
export function applyRuleTags(assetId: string, asset: AssetRecord): void {
  const tags = computeRuleTags(asset);
  const now = nowIso();

  const insertTag = db.prepare(`
    INSERT INTO asset_tags (asset_id, key, value, source, confidence, status, created_at)
    VALUES (@asset_id, @key, @value, 'rule', 1.0, 'confirmed', @created_at)
  `);

  const insertMany = db.transaction((rows: TagRow[]) => {
    for (const row of rows) {
      insertTag.run({ asset_id: assetId, key: row.key, value: row.value, created_at: now });
    }
  });

  insertMany(tags);
}

// ── ffmpeg 首帧截取 ────────────────────────────────────────────────────────────

function getFfmpegBin(): string {
  const envPath = process.env.FFMPEG_PATH?.trim();
  if (envPath && envPath.length > 0) return envPath;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('ffmpeg-static') as string | null;
    if (typeof mod === 'string' && mod) return mod;
  } catch {
    // ignore
  }
  return 'ffmpeg';
}

/**
 * 截取视频首帧，返回 base64 JPEG 字符串
 */
async function extractFirstFrame(videoPath: string): Promise<string> {
  const tmpFile = path.join(os.tmpdir(), `asset-frame-${Date.now()}.jpg`);
  try {
    const ffmpeg = getFfmpegBin();
    await execFileAsync(ffmpeg, [
      '-hide_banner', '-loglevel', 'error',
      '-i', videoPath,
      '-ss', '0',
      '-frames:v', '1',
      '-vf', 'scale=768:-2',
      '-q:v', '3',
      '-y', tmpFile,
    ]);
    const base64 = fs.readFileSync(tmpFile).toString('base64');
    return base64;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore cleanup error */ }
  }
}

// ── AI 分类响应解析 ──────────────────────────────────────────────────────────

interface AiCategoryResponse {
  category: string;
  description: string;
}

const VALID_CATEGORIES = new Set(AI_CATEGORIES);

function stripJsonMarkdown(text: string): string {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) return m[1].trim();
  return text.trim();
}

function parseAiCategoryResponse(raw: string): AiCategoryResponse | null {
  try {
    const cleaned = stripJsonMarkdown(raw);
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const category = typeof parsed.category === 'string' ? parsed.category.trim() : '';
    const description = typeof parsed.description === 'string' ? parsed.description.trim() : '';
    if (!category) return null;
    return { category, description };
  } catch {
    console.warn('[aiTagAsset] JSON parse failed, raw:', raw.slice(0, 200));
    return null;
  }
}

// ── AI 打标主函数（简化版：只返回 category + description）──────────────────────

const AI_TAG_PROMPT = `你是一个游戏素材分类助手。请分析这张图片，返回 JSON（不要其他文字，不要 markdown 代码块）：

1. category：从以下类别中选一个
   - "角色"：人物、怪物、NPC、Boss 等有生命的实体
   - "武器道具"：武器、装备、道具、物品、宝箱等物件
   - "场景"：地图、背景、建筑、环境、地形等场景元素
   - "UI素材"：按钮、图标、Banner、界面元素
   - "宣传图"：KV 图、海报、封面、营销物料
   - "视频片段"：录屏、CG 片段、过场动画截图

2. description：用一句中文简要描述图片内容（30字以内）

仅返回 JSON，不要其他内容。
示例：{"category": "角色", "description": "手持火焰剑的重甲战士"}`;

/**
 * AI 打标（简化版）
 * 只产出 category + description，直接写入 assets 表的 ai_category / ai_description 列。
 * 同时在 asset_tags 写一条 ai_category 标签供检索兼容。
 * 失败时 category 设为"未分类"，不阻塞上传。
 */
export async function aiTagAsset(assetId: string): Promise<void> {
  try {
    const asset = db.prepare(`SELECT * FROM assets WHERE id = @id`).get({ id: assetId }) as AssetRecord | undefined;
    if (!asset) {
      console.warn(`[aiTagAsset] Asset not found: ${assetId}`);
      return;
    }

    let imageBase64: string;
    const isVideo = asset.mimetype.startsWith('video/');
    const isImage = asset.mimetype.startsWith('image/');

    if (isImage) {
      imageBase64 = fs.readFileSync(asset.filepath).toString('base64');
    } else if (isVideo) {
      imageBase64 = await extractFirstFrame(asset.filepath);
    } else {
      console.warn(`[aiTagAsset] Unsupported mimetype: ${asset.mimetype} for asset ${assetId}`);
      return;
    }

    const mimeForUrl = isVideo ? 'image/jpeg' : (asset.mimetype as string);
    const dataUrl = `data:${mimeForUrl};base64,${imageBase64}`;

    const rawResponse = await compassChatCompletionWithContent({
      systemPrompt: '你是游戏素材分类助手，严格按要求输出 JSON，不要其他文字。',
      userContent: [
        { type: 'text', text: AI_TAG_PROMPT },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
      temperature: 0.1,
      maxTokens: 256,
    });

    const parsed = parseAiCategoryResponse(rawResponse);
    if (!parsed) {
      throw new Error(`AI response parse failed: ${rawResponse.slice(0, 100)}`);
    }

    const category = VALID_CATEGORIES.has(parsed.category as typeof AI_CATEGORIES[number])
      ? parsed.category
      : '未分类';
    const description = parsed.description.slice(0, 100);
    const now = nowIso();

    db.transaction(() => {
      db.prepare(`
        UPDATE assets SET ai_category = @category, ai_description = @description, updated_at = @now
        WHERE id = @id
      `).run({ category, description, now, id: assetId });

      db.prepare(`
        INSERT INTO asset_tags (asset_id, key, value, source, confidence, status, created_at)
        VALUES (@asset_id, 'ai_category', @value, 'ai', 1.0, 'confirmed', @created_at)
      `).run({ asset_id: assetId, value: category, created_at: now });

      if (description) {
        db.prepare(`
          INSERT INTO asset_tags (asset_id, key, value, source, confidence, status, created_at)
          VALUES (@asset_id, 'ai_description', @value, 'ai', 1.0, 'confirmed', @created_at)
        `).run({ asset_id: assetId, value: description, created_at: now });
      }
    })();

    console.log(`[aiTagAsset] Done: ${assetId} → ${category} | ${description}`);

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[aiTagAsset] Failed for asset ${assetId}:`, errorMsg);

    try {
      db.prepare(`
        UPDATE assets SET ai_category = '未分类', updated_at = @now WHERE id = @id
      `).run({ now: nowIso(), id: assetId });

      db.prepare(`
        INSERT INTO asset_tags (asset_id, key, value, source, confidence, status, created_at)
        VALUES (@asset_id, 'ai_tag_error', @value, 'ai', 0, 'pending', @created_at)
      `).run({
        asset_id: assetId,
        value: errorMsg.slice(0, 500),
        created_at: nowIso(),
      });
    } catch (dbErr) {
      console.error(`[aiTagAsset] Failed to record error tag:`, dbErr);
    }
  }
}
