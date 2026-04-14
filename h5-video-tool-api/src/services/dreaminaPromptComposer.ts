import { compassChatCompletion } from './promptPolish.js';

export interface DreaminaPromptHints {
  roleImageIndex?: number;
  sceneImageIndex?: number;
  roleName?: string;
  sceneName?: string;
}

export interface ComposeDreaminaPromptOptions {
  rawPrompt: string;
  imageCount: number;
  videoCount: number;
  audioCount: number;
  hints?: DreaminaPromptHints;
}

const STRUCTURED_KEYS = [
  '运镜', '镜头', '节奏', '对白', '声音', '环境', '动作',
  '推轨', '跟拍', '摇镜', '固定镜头', '慢速', '快速', '中速',
  '主体', '氛围', '场景', '情绪', '光影', '特写', '全景',
];

function normalizedName(raw: string | undefined, fallback: string): string {
  const s = (raw || '').trim().replace(/[@#\n\r\t]/g, '');
  if (!s) return fallback;
  return s.slice(0, 16);
}

function roleToken(hints: DreaminaPromptHints | undefined): string {
  const idx = Number.isInteger(hints?.roleImageIndex) ? (hints?.roleImageIndex as number) : 0;
  const n = Math.max(0, idx) + 1;
  const roleName = normalizedName(hints?.roleName, '主角');
  return `${roleName}@图片${n}`;
}

function sceneToken(
  hints: DreaminaPromptHints | undefined,
  imageCount: number,
  roleImageIndex: number,
): string | null {
  if (imageCount <= 0) return null;
  const hinted = Number.isInteger(hints?.sceneImageIndex) ? (hints?.sceneImageIndex as number) : -1;
  const fallback = imageCount >= 2 ? (roleImageIndex === 0 ? 1 : 0) : roleImageIndex;
  const idx = hinted >= 0 ? hinted : fallback;
  const n = Math.max(0, Math.min(imageCount - 1, idx)) + 1;
  const sceneName = normalizedName(hints?.sceneName, '场景');
  return `${sceneName}@图片${n}`;
}

function looksAlreadyStructured(rawPrompt: string): boolean {
  const text = rawPrompt.trim();
  if (!text) return false;
  // 如果已包含 @图片N 引用且超过 3 行，视为已组装好的 prompt，不需要 LLM 重写
  const hasAtRef = /@图片\d|@视频\d|@音频\d/.test(text);
  if (hasAtRef && text.split('\n').filter(l => l.trim()).length >= 3) return true;
  const keyHits = STRUCTURED_KEYS.reduce((acc, k) => (text.includes(k) ? acc + 1 : acc), 0);
  return keyHits >= 3 && hasAtRef;
}

function fallbackCompose(rawPrompt: string, imageCount: number, hints?: DreaminaPromptHints): string {
  const cleaned = rawPrompt.replace(/\s+/g, ' ').trim();
  const rIdx = Number.isInteger(hints?.roleImageIndex) ? (hints?.roleImageIndex as number) : 0;
  const role = roleToken(hints);
  const scene = sceneToken(hints, imageCount, Math.max(0, rIdx));
  const sceneLinePrefix = scene ? `${scene}，` : '';
  const sceneAction = scene ? `在${scene}所示环境中` : '在环境中';

  return [
    `${role}，${cleaned}`,
    `${sceneLinePrefix}整体环境氛围统一，主体与背景关系清晰，细节层次分明。`,
    `${role}${sceneAction}推进关键动作，与目标产生清晰互动并形成情绪变化。`,
    `摄影机以中近景跟随${role}的动作，关键节点进行轻微推近并短暂停留。`,
    '节奏：前半段紧凑推进，后半段放缓并强调关键道具或情绪点。',
    `对白：${role}（简短、克制、与当前情绪一致）。`,
    `声音：环境底噪、动作音效、${role}呼吸声与情绪化氛围音层层叠加。`,
  ].join('\n');
}

function parseComposedPrompt(raw: string): string {
  const t = raw.trim();
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = m ? m[1].trim() : t;
  try {
    const p = JSON.parse(body) as { composedPrompt?: string };
    const s = typeof p.composedPrompt === 'string' ? p.composedPrompt.trim() : '';
    if (s) return s;
  } catch {
    // ignore JSON parse failure; fall back to raw text
  }
  return body;
}

export async function composeDreaminaPrompt(options: ComposeDreaminaPromptOptions): Promise<string> {
  const rawPrompt = options.rawPrompt.trim();
  if (!rawPrompt) return rawPrompt;
  if (looksAlreadyStructured(rawPrompt)) return rawPrompt;

  const imageCount = Math.max(0, options.imageCount || 0);
  const videoCount = Math.max(0, options.videoCount || 0);
  const audioCount = Math.max(0, options.audioCount || 0);
  const hints = options.hints;
  const role = roleToken(hints);
  const scene = sceneToken(
    hints,
    imageCount,
    Number.isInteger(hints?.roleImageIndex) ? (hints?.roleImageIndex as number) : 0,
  );

  const refLines: string[] = [];
  if (imageCount > 0) {
    refLines.push(`图片引用可用：${Array.from({ length: imageCount }, (_, i) => `@图片${i + 1}`).join('、')}`);
  }
  if (videoCount > 0) {
    refLines.push(`视频引用可用：${Array.from({ length: videoCount }, (_, i) => `@视频${i + 1}`).join('、')}`);
  }
  if (audioCount > 0) {
    refLines.push(`音频引用可用：${Array.from({ length: audioCount }, (_, i) => `@音频${i + 1}`).join('、')}`);
  }
  if (!refLines.length) refLines.push('无可用引用素材');

  const systemPrompt = `你是“即梦 Seedance 提示词重写器”。
任务：将用户原始创意改写成适合即梦全能参考的结构化中文 Prompt。

硬性要求：
1) 输出为 7 行纯文本，不要 Markdown，不要编号：
   - 第1行：主体与关键动作（必须出现角色引用）
   - 第2行：环境与氛围
   - 第3行：动作编排
   - 第4行：运镜
   - 第5行：节奏
   - 第6行：对白
   - 第7行：声音
2) 角色引用必须在相关句子中多次出现，而不是只放最后。
3) 严格使用可用引用标记（@图片n/@视频n/@音频n），不要虚构不存在的编号。
4) 语气具体、可执行，避免空泛描述。
5) 输出 JSON：{"composedPrompt":"7行文本"}。`;

  const userText = [
    `原始创意：${rawPrompt}`,
    `建议主角引用：${role}`,
    `建议场景引用：${scene ?? '无'}`,
    ...refLines,
  ].join('\n');

  try {
    const llmText = await compassChatCompletion({
      systemPrompt,
      userText,
      temperature: 0.2,
      maxTokens: 700,
    });
    const composed = parseComposedPrompt(llmText).trim();
    if (!composed) return fallbackCompose(rawPrompt, imageCount, hints);
    return composed;
  } catch {
    return fallbackCompose(rawPrompt, imageCount, hints);
  }
}
