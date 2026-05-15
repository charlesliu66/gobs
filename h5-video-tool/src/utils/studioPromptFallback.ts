import type { PromptReferenceAsset } from '../api/promptPolish';

export type StudioPromptFallbackMode = 'custom' | 'viral-dance' | 'boss-showcase';

export interface StudioPromptFallbackOptions {
  mode?: StudioPromptFallbackMode;
  duration?: number;
  aspectRatio?: string;
  locale?: 'zh' | 'en';
  referenceAssets?: PromptReferenceAsset[];
  referenceVideoUrl?: string;
}

function roleLabel(asset: PromptReferenceAsset, locale: 'zh' | 'en'): string {
  if (asset.kind === 'video') return locale === 'en' ? 'motion video' : '动作参考视频';
  if (asset.semanticRole === 'scene') return locale === 'en' ? 'environment mood' : '环境/氛围参考';
  return locale === 'en' ? 'subject consistency' : '主角/产品一致性参考';
}

function stripReferenceVideoHeader(raw: string): string {
  return raw
    .replace(/^\[[^\]]*Reference video URL[^\]]*\]\s*\nhttps?:\/\/\S+\s*/i, '')
    .replace(/^【[^】]*参考视频[^】]*】\s*\nhttps?:\/\/\S+\s*/i, '')
    .trim();
}

export function isWeakPolishedPrompt(value: string | undefined | null, rawPrompt = ''): boolean {
  const text = String(value ?? '').trim();
  if (!text) return true;
  const rawHasPrompt = rawPrompt.trim().length >= 6;
  if (rawHasPrompt && /(当前输入为空|请提供您的视频创意|missing creative idea|empty input)/i.test(text)) return true;
  const meaningful = text.replace(/[?\uff1f\ufffd\s.,;:!'"()[\]{}<>/\\|`~_-]/g, '');
  if (meaningful.length < 6 && rawPrompt.trim().length >= 6) return true;
  const questionMarks = (text.match(/[?\uff1f]/g) ?? []).length;
  const replacementMarks = (text.match(/\ufffd/g) ?? []).length;
  const weakMarks = questionMarks + replacementMarks;
  if (text.length > 0 && weakMarks / text.length > 0.35) return true;
  return /^[?\uff1f\ufffd\s]+$/.test(text);
}

export function buildStudioPromptFallback(rawPrompt: string, options: StudioPromptFallbackOptions = {}): string {
  const locale = options.locale ?? 'zh';
  const cleanRaw = stripReferenceVideoHeader(rawPrompt).trim();
  const idea = cleanRaw || (locale === 'en' ? 'Create a clear short video around the provided concept.' : '围绕当前创意生成一条清晰短视频。');
  const duration = options.duration ?? (options.mode === 'boss-showcase' ? 15 : 10);
  const aspectRatio = options.aspectRatio ?? '9:16';
  const refs = (options.referenceAssets ?? []).filter((asset) => asset.token);
  const refLine = refs.length
    ? refs.map((asset) => `${asset.token}${locale === 'en' ? ' as ' : '作为'}${roleLabel(asset, locale)}`).join(locale === 'en' ? '; ' : '；')
    : '';
  const videoUrl = options.referenceVideoUrl?.trim();

  if (locale === 'en') {
    const modeLine = options.mode === 'viral-dance'
      ? `Motion transfer: keep the subject design stable${videoUrl ? ', follow the public reference video as the motion source' : ', follow the uploaded motion reference'}, and make each action readable.`
      : options.mode === 'boss-showcase'
        ? 'Character showcase: reveal the subject through arrival, power display, and final hero pose.'
        : 'Short video: open with a clear visual hook, then show the key action and a memorable ending beat.';
    return [
      `Core idea: ${idea}`,
      refLine ? `References: ${refLine}.` : '',
      modeLine,
      `Visual direction: cinematic lighting, clean composition, stable subject identity, strong depth, no messy text overlays.`,
      `Camera: start with an attention hook, use one or two smooth camera moves, and keep the main subject readable throughout.`,
      `Output: ${duration}s, ${aspectRatio}, ready for Seedance/Kling single-video generation.`,
    ].filter(Boolean).join('\n');
  }

  const modeLine = options.mode === 'viral-dance'
    ? `动作迁移：保持主体造型稳定${videoUrl ? '，公开视频链接作为动作来源' : '，跟随动作参考素材'}，动作节奏清楚、肢体细节可读。`
    : options.mode === 'boss-showcase'
      ? '角色展示：用登场、能力展示、最终定格三个段落突出角色/Boss 的辨识度和压迫感。'
      : '短视频：开头给出明确视觉钩子，中段呈现核心动作或卖点，结尾留下可传播的记忆点。';
  return [
    `创意核心：${idea}`,
    refLine ? `参考素材：${refLine}。` : '',
    modeLine,
    '画面方向：电影感光影，构图干净，主体身份稳定，空间层次清楚，避免杂乱文字和无意义元素。',
    '镜头语言：开场先抓注意力，中段使用一到两个顺滑运镜，始终让主体和关键动作清晰可见。',
    `输出规格：${duration}s，${aspectRatio}，可直接用于 Seedance/Kling 单段视频生成。`,
  ].filter(Boolean).join('\n');
}
