/**
 * 游戏本体：角色 / 场景 / 行为枚举，供多模态提示词约束输出，减少胡编。
 * - 优先读环境变量 EDITOR_GAME_TAXONOMY_PATH；
 * - 未设置时若存在 `config/game-taxonomy.json` 则自动加载（便于本地开发）。
 */
import fs from 'fs';
import path from 'path';

export interface GameTaxonomy {
  gameName?: string;
  description?: string;
  roles: string[];
  scenes: string[];
  activities: string[];
  /**
   * 参考图根目录（相对 cwd 或绝对路径）。其下约定：
   * `roles/<职业名>/*.jpg` 、`scenes/<场景名>/*.jpg`（png/webp 亦可）
   */
  referenceImagesRoot?: string;
}

const DEFAULT: GameTaxonomy = {
  roles: [],
  scenes: [],
  activities: [],
};

const DEFAULT_RELATIVE_PATH = 'config/game-taxonomy.json';

export type TaxonomyContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

let cached: { path: string; mtimeMs: number; data: GameTaxonomy } | null = null;

function resolveTaxonomyFilePath(): string | null {
  const env = process.env.EDITOR_GAME_TAXONOMY_PATH?.trim();
  if (env) {
    return path.isAbsolute(env) ? env : path.join(process.cwd(), env);
  }
  const fallback = path.join(process.cwd(), DEFAULT_RELATIVE_PATH);
  if (fs.existsSync(fallback)) return fallback;
  return null;
}

export function loadGameTaxonomy(): GameTaxonomy {
  const abs = resolveTaxonomyFilePath();
  if (!abs) return DEFAULT;
  try {
    const stat = fs.statSync(abs);
    const mtimeMs = stat.mtimeMs;
    if (cached?.path === abs && cached.mtimeMs === mtimeMs) {
      return cached.data;
    }
    const raw = JSON.parse(fs.readFileSync(abs, 'utf8')) as Record<string, unknown>;
    const data: GameTaxonomy = {
      gameName: typeof raw.gameName === 'string' ? raw.gameName : undefined,
      description: typeof raw.description === 'string' ? raw.description : undefined,
      roles: Array.isArray(raw.roles) ? raw.roles.filter((x): x is string => typeof x === 'string') : [],
      scenes: Array.isArray(raw.scenes) ? raw.scenes.filter((x): x is string => typeof x === 'string') : [],
      activities: Array.isArray(raw.activities)
        ? raw.activities.filter((x): x is string => typeof x === 'string')
        : [],
      referenceImagesRoot:
        typeof raw.referenceImagesRoot === 'string' ? raw.referenceImagesRoot.trim() : undefined,
    };
    cached = { path: abs, mtimeMs, data };
    return data;
  } catch (e) {
    console.warn('[gameTaxonomy] 解析失败', e);
    return DEFAULT;
  }
}

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

/**
 * 从 referenceImagesRoot 读取各职业/场景子目录下的图片，拼成多模态消息片段（供首帧批次前置）。
 * 每类最多 EDITOR_TAXONOMY_REF_PER_LABEL 张，全局最多 EDITOR_TAXONOMY_REF_MAX 张。
 */
export function buildReferenceAnchorParts(taxonomy: GameTaxonomy): TaxonomyContentPart[] {
  const root = taxonomy.referenceImagesRoot?.trim();
  if (!root) return [];
  const base = path.isAbsolute(root) ? root : path.join(process.cwd(), root);
  if (!fs.existsSync(base)) {
    console.warn('[gameTaxonomy] referenceImagesRoot 不存在:', base);
    return [];
  }

  const maxPerLabel = Math.max(1, Math.min(5, Number(process.env.EDITOR_TAXONOMY_REF_PER_LABEL || 3)));
  const maxTotal = Math.max(3, Math.min(48, Number(process.env.EDITOR_TAXONOMY_REF_MAX || 24)));
  const parts: TaxonomyContentPart[] = [];
  let total = 0;

  const pushDir = (segment: 'roles' | 'scenes', label: string, kindCn: string) => {
    const dir = path.join(base, segment, label);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;
    const files = fs.readdirSync(dir).filter((f) => IMAGE_EXT.test(f)).sort();
    let n = 0;
    for (const f of files) {
      if (n >= maxPerLabel || total >= maxTotal) break;
      const absFile = path.join(dir, f);
      try {
        const buf = fs.readFileSync(absFile);
        const b64 = buf.toString('base64');
        const lower = f.toLowerCase();
        const mime = lower.endsWith('.png')
          ? 'image/png'
          : lower.endsWith('.webp')
            ? 'image/webp'
            : 'image/jpeg';
        if (n === 0) {
          parts.push({ type: 'text', text: `【参考图·${kindCn}「${label}」】` });
        }
        parts.push({
          type: 'image_url',
          image_url: { url: `data:${mime};base64,${b64}` },
        });
        n += 1;
        total += 1;
      } catch {
        /* 跳过坏文件 */
      }
    }
  };

  for (const role of taxonomy.roles) {
    if (total >= maxTotal) break;
    pushDir('roles', role, '职业');
  }
  for (const sc of taxonomy.scenes) {
    if (total >= maxTotal) break;
    pushDir('scenes', sc, '场景');
  }

  if (parts.length === 0) return [];

  const header: TaxonomyContentPart = {
    type: 'text',
    text: '下列为「职业/场景参考图」，用于与后面的录屏抽帧对比；若录屏中无法对应，角色填 []、场景填「未知」。',
  };
  return [header, ...parts];
}

export function formatTaxonomyForPrompt(t: GameTaxonomy): string {
  if (t.roles.length + t.scenes.length + t.activities.length === 0) {
    return '（未配置词表：角色/场景/行为请根据画面合理推断，用简短中文。可在 config/game-taxonomy.json 提供词表。）';
  }
  const lines: string[] = [];
  if (t.gameName) lines.push(`游戏/项目：${t.gameName}`);
  if (t.description) lines.push(t.description);
  if (t.roles.length) lines.push(`可选职业/角色标签（从中选 0~2 个最符合的，无法判断填 []）：${t.roles.join('、')}`);
  if (t.scenes.length) lines.push(`可选场景标签（选 0~1 个）：${t.scenes.join('、')}`);
  if (t.activities.length)
    lines.push(
      `可选行为标签（搜打撤类：选 1 个最符合当前画面的）：${t.activities.join('、')}`,
    );
  if (t.referenceImagesRoot) {
    lines.push(
      `已启用参考图目录（仅首屏批次附带）：${t.referenceImagesRoot} 下 roles/<职业>/、scenes/<场景>/`,
    );
  }
  return lines.join('\n');
}
