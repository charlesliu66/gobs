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

// ── AI 标签响应解析 ────────────────────────────────────────────────────────────

interface AiTagResponse {
  type?: string;
  scene?: string;
  purpose?: string | string[];
  platform?: string | string[];
  confidence?: {
    type?: number;
    scene?: number;
    purpose?: number;
    platform?: number;
  };
}

function stripJsonMarkdown(text: string): string {
  // Remove markdown code blocks if present: ```json ... ``` or ``` ... ```
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) return m[1].trim();
  return text.trim();
}

function parseAiTagResponse(raw: string): AiTagResponse | null {
  try {
    const cleaned = stripJsonMarkdown(raw);
    return JSON.parse(cleaned) as AiTagResponse;
  } catch {
    console.warn('[aiTagAsset] JSON parse failed, raw:', raw.slice(0, 200));
    return null;
  }
}

// ── AI 打标主函数 ──────────────────────────────────────────────────────────────

const AI_TAG_PROMPT = `分析这张游戏素材图片，返回 JSON 格式（不要其他文字，不要 markdown 代码块）：
{
  "type": "角色立绘|游戏截图|录屏|宣传图|UI素材",
  "scene": "战斗|日常|菜单|过场|其他",
  "purpose": ["买量","社媒","版本宣发"],
  "platform": ["TikTok","YouTube"],
  "confidence": {
    "type": 0.9,
    "scene": 0.85,
    "purpose": 0.7,
    "platform": 0.8
  }
}`;

const CONFIDENCE_THRESHOLD = 0.7;
const FALLBACK_CONFIDENCE = 0.6;

/**
 * AI 打标接口（TASK-B 实现）
 * 调用 Compass Vision API 分析资产图片/视频帧，写入 AI 标签到 asset_tags 表
 * 失败时不抛出，不影响 asset.status，记录 error 标签供前端重试
 */
export async function aiTagAsset(assetId: string): Promise<void> {
  try {
    // 1. 从 DB 读取 asset 信息
    const asset = db.prepare(`SELECT * FROM assets WHERE id = @id`).get({ id: assetId }) as AssetRecord | undefined;
    if (!asset) {
      console.warn(`[aiTagAsset] Asset not found: ${assetId}`);
      return;
    }

    // 2. 获取图片 base64
    let imageBase64: string;
    const isVideo = asset.mimetype.startsWith('video/');
    const isImage = asset.mimetype.startsWith('image/');

    if (isImage) {
      // 直接读取图片
      imageBase64 = fs.readFileSync(asset.filepath).toString('base64');
    } else if (isVideo) {
      // 截取视频首帧
      imageBase64 = await extractFirstFrame(asset.filepath);
    } else {
      console.warn(`[aiTagAsset] Unsupported mimetype: ${asset.mimetype} for asset ${assetId}`);
      return;
    }

    // 3. 调用 Compass Vision API
    const mimeForUrl = isVideo ? 'image/jpeg' : (asset.mimetype as string);
    const dataUrl = `data:${mimeForUrl};base64,${imageBase64}`;

    const rawResponse = await compassChatCompletionWithContent({
      systemPrompt: '你是游戏素材分析助手，严格按要求输出 JSON，不要其他文字。',
      userContent: [
        { type: 'text', text: AI_TAG_PROMPT },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
      temperature: 0.1,
      maxTokens: 512,
    });

    // 4. 解析响应
    const parsed = parseAiTagResponse(rawResponse);
    if (!parsed) {
      throw new Error(`AI response parse failed: ${rawResponse.slice(0, 100)}`);
    }

    const conf = parsed.confidence ?? {};
    const now = nowIso();

    const insertAiTag = db.prepare(`
      INSERT INTO asset_tags (asset_id, key, value, source, confidence, status, created_at)
      VALUES (@asset_id, @key, @value, 'ai', @confidence, @status, @created_at)
    `);

    const insertAiTags = db.transaction(() => {
      // type
      if (parsed.type) {
        const c = typeof conf.type === 'number' ? conf.type : FALLBACK_CONFIDENCE;
        insertAiTag.run({
          asset_id: assetId,
          key: 'ai_type',
          value: parsed.type,
          confidence: c,
          status: c < CONFIDENCE_THRESHOLD ? 'pending' : 'confirmed',
          created_at: now,
        });
      }

      // scene
      if (parsed.scene) {
        const c = typeof conf.scene === 'number' ? conf.scene : FALLBACK_CONFIDENCE;
        insertAiTag.run({
          asset_id: assetId,
          key: 'ai_scene',
          value: parsed.scene,
          confidence: c,
          status: c < CONFIDENCE_THRESHOLD ? 'pending' : 'confirmed',
          created_at: now,
        });
      }

      // purpose（可为数组）
      const purposes = Array.isArray(parsed.purpose)
        ? parsed.purpose
        : parsed.purpose ? [parsed.purpose] : [];
      const purposeConf = typeof conf.purpose === 'number' ? conf.purpose : FALLBACK_CONFIDENCE;
      for (const p of purposes) {
        if (typeof p === 'string' && p.trim()) {
          insertAiTag.run({
            asset_id: assetId,
            key: 'ai_purpose',
            value: p.trim(),
            confidence: purposeConf,
            status: purposeConf < CONFIDENCE_THRESHOLD ? 'pending' : 'confirmed',
            created_at: now,
          });
        }
      }

      // platform（AI 建议，可为数组）
      const platforms = Array.isArray(parsed.platform)
        ? parsed.platform
        : parsed.platform ? [parsed.platform] : [];
      const platformConf = typeof conf.platform === 'number' ? conf.platform : FALLBACK_CONFIDENCE;
      for (const pl of platforms) {
        if (typeof pl === 'string' && pl.trim()) {
          insertAiTag.run({
            asset_id: assetId,
            key: 'ai_platform',
            value: pl.trim(),
            confidence: platformConf,
            status: platformConf < CONFIDENCE_THRESHOLD ? 'pending' : 'confirmed',
            created_at: now,
          });
        }
      }
    });

    insertAiTags();
    console.log(`[aiTagAsset] Done: ${assetId} (type=${parsed.type}, scene=${parsed.scene})`);

  } catch (err) {
    // 5. 失败：记录 error 标签，asset.status 保持 ready，不抛出
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[aiTagAsset] Failed for asset ${assetId}:`, errorMsg);

    try {
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
    // 不重新抛出，不阻塞导入任务
  }
}
