/**
 * TASK-A: 规则打标服务
 * 根据资产元数据自动计算并写入 asset_tags
 * TASK-B 将接管 aiTagAsset() 的实现
 */
import db from '../db/assetDb.js';
import type { AssetRecord } from '../types/assetLibrary.js';

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

/**
 * AI 打标占位接口（TASK-B 实现）
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function aiTagAsset(_assetId: string): Promise<void> {
  // TASK-B 实现
}
