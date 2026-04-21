import { compassChatCompletionWithUsage } from './promptPolish.js';

const SYSTEM = `你是配乐提示词专家。用户会给出简短、模糊的中文或英文需求（如「高燃音乐」「紧张战斗 BGM」）。
用户有时还会附带"视频内容"上下文（分镜描述、场景说明等），请据此推断最合适的音乐风格和情绪。
你要将其改写为适合 **文生器乐模型（Suno / Lyria 类）** 的英文描述。

## 规则
- **prompt**：英文，2–4 句，具体写出：情绪、节奏（tempo）、主奏乐器（如 drums, brass, strings）、风格（如 epic trailer, electronic battle）、**必须强调 instrumental only, no vocals**。如果用户给出了视频内容描述，请匹配该内容的氛围和节奏。
- **negativePrompt**：英文，简短列出要避免的（如 vocals, singing, speech, calm, slow ambient），用逗号分隔即可。
- 输出 **仅** 一行合法 JSON 对象本身，**不要** markdown 代码块、不要前言/后记、不要解释。

## 输出格式（仅此一行，键名必须双引号）
{"prompt":"...","negativePrompt":"..."}`;

export type LyriaPolishResult = {
  prompt: string;
  negativePrompt: string;
};

type FallbackPromptHint = {
  mood: string;
  tempo: string;
  instruments: string;
  style: string;
  negativePrompt?: string;
};

/** 从首个 `{` 起按 JSON 字符串规则配对到匹配的 `}`，避免 prompt 文本里含 `}` 时截断错误 */
function sliceFirstBalancedJsonObject(s: string): string | null {
  const i = s.indexOf('{');
  if (i < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let p = i; p < s.length; p++) {
    const c = s[p]!;
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === '\\') {
        esc = true;
        continue;
      }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return s.slice(i, p + 1);
    }
  }
  return null;
}

/** 从模型输出中尽量抠出 JSON：代码块、平衡括号、去 BOM/杂前缀 */
function extractJsonObject(s: string): string {
  const trimmed = s.replace(/^\uFEFF/, '').trim();
  const fences = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)];
  const candidates: string[] = [];
  if (fences.length > 0) {
    for (const m of fences) {
      if (m[1]) candidates.push(m[1].trim());
    }
  }
  candidates.push(trimmed);

  for (const block of candidates) {
    const balanced = sliceFirstBalancedJsonObject(block);
    if (balanced) return balanced;
    const start = block.indexOf('{');
    const end = block.lastIndexOf('}');
    if (start >= 0 && end > start) return block.slice(start, end + 1);
  }
  return trimmed;
}

/** 模型偶发用单引号或裸 key，做一次宽松修补后再解析 */
function tryLenientParse(jsonStr: string): unknown | undefined {
  try {
    return JSON.parse(jsonStr);
  } catch {
    /* ignore */
  }
  let s = jsonStr
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/'([^']*)':/g, '"$1":')
    .replace(/:\s*'([^']*)'/g, ': "$1"');
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/** 从任意文本中用正则抽出 prompt / negativePrompt（最后一道兜底） */
function extractPromptFieldsLoose(text: string): LyriaPolishResult | null {
  const p =
    /"prompt"\s*:\s*"((?:[^"\\]|\\.)*)"/s.exec(text) ??
    /'prompt'\s*:\s*'((?:[^'\\]|\\.)*)'/s.exec(text) ??
    /prompt\s*[:=]\s*"((?:[^"\\]|\\.)*)"/is.exec(text);
  const n =
    /"negativePrompt"\s*:\s*"((?:[^"\\]|\\.)*)"/s.exec(text) ??
    /'negativePrompt'\s*:\s*'((?:[^'\\]|\\.)*)'/s.exec(text) ??
    /"negative_prompt"\s*:\s*"((?:[^"\\]|\\.)*)"/s.exec(text) ??
    /negative prompt\s*[:=]\s*"((?:[^"\\]|\\.)*)"/is.exec(text) ??
    /negativePrompt\s*[:=]\s*"((?:[^"\\]|\\.)*)"/is.exec(text);
  const prompt = p?.[1]?.replace(/\\"/g, '"').replace(/\\n/g, '\n').trim() ?? '';
  if (!prompt) return null;
  const negativePrompt =
    n?.[1]?.replace(/\\"/g, '"').trim() ?? 'vocals, singing, speech, lyrics';
  return { prompt, negativePrompt };
}

function pickFallbackHint(raw: string): FallbackPromptHint {
  const hints: Array<{ pattern: RegExp; hint: FallbackPromptHint }> = [
    {
      pattern: /战斗|高燃|热血|团战|击杀|boss|battle|combat|fight|epic/i,
      hint: {
        mood: 'epic and intense',
        tempo: 'fast tempo with a driving pulse',
        instruments: 'big drums, brass, strings and hybrid percussion',
        style: 'cinematic trailer music',
        negativePrompt: 'vocals, singing, speech, soft ambient, lo-fi',
      },
    },
    {
      pattern: /紧张|悬疑|追逐|压迫|潜行|tense|suspense|thriller/i,
      hint: {
        mood: 'tense and suspenseful',
        tempo: 'steady pulse with rising energy',
        instruments: 'low synths, pulsing bass and cinematic percussion',
        style: 'modern thriller score',
        negativePrompt: 'vocals, singing, cheerful, bright pop',
      },
    },
    {
      pattern: /温馨|治愈|感动|成长|希望|warm|uplifting|heartfelt|inspiring/i,
      hint: {
        mood: 'warm and uplifting',
        tempo: 'mid tempo with a smooth build',
        instruments: 'piano, acoustic guitar and soft strings',
        style: 'cinematic inspirational soundtrack',
        negativePrompt: 'vocals, singing, aggressive drums, dark horror',
      },
    },
    {
      pattern: /浪漫|爱情|唯美|romantic|love/i,
      hint: {
        mood: 'romantic and emotional',
        tempo: 'gentle flowing tempo',
        instruments: 'piano, strings and soft pads',
        style: 'romantic cinematic score',
        negativePrompt: 'vocals, singing, heavy metal, harsh distortion',
      },
    },
    {
      pattern: /搞笑|轻松|欢快|日常|funny|playful|happy/i,
      hint: {
        mood: 'playful and upbeat',
        tempo: 'light fast tempo',
        instruments: 'plucky strings, light drums and bright synths',
        style: 'fun commercial background music',
        negativePrompt: 'vocals, singing, dark horror, slow sad ambient',
      },
    },
  ];
  return hints.find((item) => item.pattern.test(raw))?.hint ?? {
    mood: 'cinematic and engaging',
    tempo: 'mid tempo with clear rhythmic motion',
    instruments: 'modern drums, synth textures and warm strings',
    style: 'instrumental background music for short-form video',
    negativePrompt: 'vocals, singing, speech, lyrics',
  };
}

function buildFallbackPrompt(raw: string): LyriaPolishResult {
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  const context = trimmed ? trimmed.slice(0, 160) : 'short-form video storytelling';
  const hint = pickFallbackHint(trimmed);
  return {
    prompt: [
      `Instrumental background music for a short-form video inspired by: ${context}.`,
      `${hint.mood}, ${hint.tempo}.`,
      `${hint.instruments}, ${hint.style}, instrumental only, no vocals, no spoken words.`,
    ].join(' '),
    negativePrompt: hint.negativePrompt ?? 'vocals, singing, speech, lyrics',
  };
}

export async function polishLyriaMusicPrompt(raw: string): Promise<LyriaPolishResult> {
  const userText = raw.trim();
  if (!userText) {
    throw new Error('请提供描述');
  }
  let modelText = '';
  try {
    const { text } = await compassChatCompletionWithUsage({
      systemPrompt: SYSTEM,
      userText,
      temperature: 0.25,
      maxTokens: 1024,
    });
    modelText = typeof text === 'string' ? text : '';
  } catch (e) {
    console.warn('[editorMusicPromptPolish] model call failed, using fallback prompt:', e);
    return buildFallbackPrompt(userText);
  }

  if (!modelText.trim()) {
    return buildFallbackPrompt(userText);
  }

  const jsonStr = extractJsonObject(modelText);
  let parsed: unknown = tryLenientParse(jsonStr);

  if (parsed === undefined) {
    const loose = extractPromptFieldsLoose(modelText);
    if (loose) return loose;
    return buildFallbackPrompt(userText);
  }

  if (!parsed || typeof parsed !== 'object') return buildFallbackPrompt(userText);
  const p = parsed as Record<string, unknown>;
  const prompt = typeof p.prompt === 'string' ? p.prompt.trim() : '';
  const negativePrompt =
    typeof p.negativePrompt === 'string' ? p.negativePrompt.trim() : 'vocals, singing, speech';
  if (!prompt) return buildFallbackPrompt(userText);
  return { prompt, negativePrompt };
}
