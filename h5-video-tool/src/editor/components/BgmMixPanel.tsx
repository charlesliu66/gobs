import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { generateEditorMusic, polishEditorMusicPrompt } from '../../api/editor';
import type { MediaAsset, TimelineProject, VideoClip } from '../types/timeline';
import { setBgmClipOnProject, computeDurationSec } from '../types/timeline';
import { RunningStatus } from '../../components/RunningStatus';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function mixAudioUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE) return p;
  return `${API_BASE.replace(/\/$/, '')}${p}`;
}

const LYRIA_CLIP_SEC = 32.8;

/** 从时间轴视频轨提取内容摘要，供配乐 prompt 参考 */
function extractVideoContentSummary(project: TimelineProject): string {
  const videoTracks = project.tracks.filter((t) => t.type === 'video');
  const notes: string[] = [];
  for (const track of videoTracks) {
    for (const clip of track.clips as VideoClip[]) {
      if (clip.note?.trim()) notes.push(clip.note.trim());
    }
  }
  if (notes.length === 0) return '';
  const unique = [...new Set(notes)];
  return unique.slice(0, 10).join('；');
}

function isLikelyQuotaOrRateLimitError(msg: string): boolean {
  return /RESOURCE_EXHAUSTED|quota|rate.?limit|429|too many requests/i.test(msg);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type MusicProvider = 'suno' | 'lyria';

const PROVIDER_LABEL: Record<MusicProvider, string> = {
  suno: 'Suno',
  lyria: 'Lyria',
};

/** 根据时间轴时长和风格，自动生成并拼接多段 BGM，返回实际使用的引擎 */
async function generateAndTileMusic(
  prompt: string,
  negativePrompt: string,
  totalSec: number,
  setAssets: Dispatch<SetStateAction<Record<string, MediaAsset>>>,
  setProject: Dispatch<SetStateAction<TimelineProject>>,
  onPushLog?: (s: string) => void,
): Promise<MusicProvider> {
  const segmentsNeeded = Math.max(1, Math.ceil(totalSec / LYRIA_CLIP_SEC));
  onPushLog?.(`正在生成配乐，请稍候…`);

  const res = await generateEditorMusic({
    prompt,
    negativePrompt: negativePrompt.trim() || undefined,
    sampleCount: Math.min(segmentsNeeded, 3),
  });

  const provider: MusicProvider = (res.provider === 'suno' || res.provider === 'lyria') ? res.provider : 'lyria';
  const providerLabel = PROVIDER_LABEL[provider];

  let tileStart = 0;
  for (let i = 0; i < segmentsNeeded; i++) {
    const item = res.items[i % res.items.length];
    if (!item) continue;
    const url = mixAudioUrl(item.url);
    const assetId = i === 0 ? item.id : `${item.id}_tile${i}`;
    setAssets((prev) => ({
      ...prev,
      [assetId]: { id: assetId, url, kind: 'audio' as const, durationSec: item.durationSec, meta: { bgm: true } },
    }));
    if (i === 0) {
      setProject((p) => setBgmClipOnProject(p, assetId, item.durationSec));
    }
    tileStart += item.durationSec;
  }

  const totalGenSec = Math.round(res.items.reduce((s, it) => s + it.durationSec, 0));
  onPushLog?.(`✅ 配乐完成（引擎：${providerLabel} · 时长：${totalGenSec}s · ${res.items.length} 首）`);
  return provider;
}

interface BgmMixPanelProps {
  project: TimelineProject;
  setProject: Dispatch<SetStateAction<TimelineProject>>;
  setAssets: Dispatch<SetStateAction<Record<string, MediaAsset>>>;
  onPushLog?: (line: string) => void;
  promptSync?: { prompt: string; negativePrompt: string; key: number } | null;
}

const MOOD_CATEGORIES = [
  {
    group: '情绪',
    items: [
      { label: '欢快', prompt: '轻快活泼，现代流行，积极向上，明亮的旋律' },
      { label: '温馨', prompt: '温暖柔和，原声吉他，钢琴，治愈温馨' },
      { label: '感动', prompt: '情感深沉，钢琴，弦乐，催泪' },
      { label: '紧张', prompt: '紧张悬疑，低音脉冲，电子，暗色调氛围' },
      { label: '史诗', prompt: '史诗磅礴，管弦乐队，鼓点，宏大壮阔' },
      { label: '浪漫', prompt: '浪漫唯美，钢琴，弦乐四重奏，柔和' },
    ],
  },
  {
    group: '场景',
    items: [
      { label: '游戏战斗', prompt: '高燃电影战斗配乐，器乐，强节奏' },
      { label: '游戏冒险', prompt: '游戏冒险背景音乐，史诗感，器乐' },
      { label: '都市夜景', prompt: '都市悬疑，电子，低沉，紧张氛围' },
      { label: '自然风光', prompt: '大自然纪录片，清新，环境音，木管乐器' },
      { label: '科技未来', prompt: '科技感，合成器，电子脉冲，未来主义' },
      { label: '复古怀旧', prompt: '复古爵士，萨克斯，温暖的模拟音色' },
    ],
  },
] as const;

const _QUICK_STYLES = MOOD_CATEGORIES.flatMap((c) =>
  c.items.map((item) => ({ ...item, group: c.group })),
);
void _QUICK_STYLES;

export function BgmMixPanel({ project, setProject, setAssets, onPushLog, promptSync }: BgmMixPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('vocals, lyrics');
  const [busy, setBusy] = useState(false);
  const [polishBusy, setPolishBusy] = useState(false);
  const [lastProvider, setLastProvider] = useState<MusicProvider | null>(null);

  const totalSec = computeDurationSec(project);

  useEffect(() => {
    const hint = project.mix?.bgmPromptHint;
    if (hint && !prompt) setPrompt(hint);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- 仅首次挂载预填

  useEffect(() => {
    if (!promptSync) return;
    setPrompt(promptSync.prompt);
    setNegativePrompt(promptSync.negativePrompt);
  }, [promptSync?.key]);

  const runPolish = useCallback(async () => {
    const raw = prompt.trim() || '高燃游戏战斗配乐，器乐，节奏快';
    setPolishBusy(true);
    try {
      const out = await withTimeout(
        polishEditorMusicPrompt(raw),
        45_000,
        '配乐提示词润色超时（45s）',
      );
      setPrompt(out.prompt);
      if (out.negativePrompt) setNegativePrompt(out.negativePrompt);
      onPushLog?.('已优化配乐 prompt（英文）');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const hint = isLikelyQuotaOrRateLimitError(msg) ? '（疑似模型限流/配额不足）' : '';
      onPushLog?.(`优化失败：${msg}${hint}`);
    } finally {
      setPolishBusy(false);
    }
  }, [prompt, onPushLog]);

  /** 一键智能配乐：润色 prompt + 按时间轴长度自动生成多段并拼接 */
  const runSmartBgm = useCallback(async () => {
    if (busy) return;
    const userDesc = prompt.trim() || '适合视频内容的背景音乐，器乐';
    const contentSummary = extractVideoContentSummary(project);
    const raw = contentSummary
      ? `视频内容：${contentSummary}\n\n配乐要求：${userDesc}`
      : userDesc;
    setBusy(true);
    try {
      let finalPrompt = raw;
      let finalNegative = negativePrompt;
      onPushLog?.(`正在优化配乐风格…${contentSummary ? '（已读取视频内容）' : ''}`);
      try {
        const out = await withTimeout(
          polishEditorMusicPrompt(raw),
          45_000,
          '配乐提示词润色超时（45s）',
        );
        finalPrompt = out.prompt;
        finalNegative = out.negativePrompt ?? finalNegative;
        setPrompt(finalPrompt);
        if (out.negativePrompt) setNegativePrompt(out.negativePrompt);
      } catch (e) {
        onPushLog?.(
          `配乐润色失败，已降级为原始描述继续生成：${e instanceof Error ? e.message : String(e)}`,
        );
      }
      const provider = await withTimeout(
        generateAndTileMusic(finalPrompt, finalNegative, totalSec, setAssets, setProject, onPushLog),
        210_000,
        '配乐生成超时（3.5分钟），请重试',
      );
      setLastProvider(provider);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const hint = isLikelyQuotaOrRateLimitError(msg) ? '（疑似模型限流/配额不足）' : '';
      onPushLog?.(`配乐失败：${msg}${hint}`);
    } finally {
      setBusy(false);
    }
  }, [prompt, negativePrompt, busy, totalSec, setAssets, setProject, onPushLog]);

  const runGenerate = useCallback(async () => {
    const t = prompt.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      const provider = await withTimeout(
        generateAndTileMusic(t, negativePrompt, totalSec, setAssets, setProject, onPushLog),
        210_000,
        '配乐生成超时（3.5分钟），请重试',
      );
      setLastProvider(provider);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const hint = isLikelyQuotaOrRateLimitError(msg) ? '（疑似模型限流/配额不足）' : '';
      onPushLog?.(`配乐失败：${msg}${hint}`);
    } finally {
      setBusy(false);
    }
  }, [prompt, negativePrompt, busy, totalSec, setAssets, setProject, onPushLog]);

  const disabled = polishBusy || busy;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-shrink-0 border-b border-[var(--color-border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-semibold text-[var(--color-text)]">AI 配乐</h3>
          {lastProvider && !busy && (
            <span
              title={lastProvider === 'suno' ? 'Suno API（主引擎）' : 'Compass Lyria（备用引擎）'}
              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium ${
                lastProvider === 'suno'
                  ? 'bg-purple-500/15 text-purple-400'
                  : 'bg-blue-500/15 text-blue-400'
              }`}
            >
              {lastProvider === 'suno' ? '🎵 Suno' : '🎵 Lyria'}
            </span>
          )}
        </div>
        <p className="text-[9px] leading-snug text-[var(--color-text-muted)]">
          选择风格或输入描述，自动按视频时长生成并铺满 BGM 轨
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {/* 情绪/场景选择器 */}
        {MOOD_CATEGORIES.map((cat) => (
          <div key={cat.group}>
            <p className="text-[10px] text-[var(--color-text-muted)] mb-1.5">{cat.group === '情绪' ? '选择情绪' : '选择场景'}</p>
            <div className="flex flex-wrap gap-1.5">
              {cat.items.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPrompt(s.prompt)}
                  className={`px-2 py-1 rounded-lg text-[10px] border transition-colors disabled:opacity-50 ${
                    prompt === s.prompt
                      ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* 自定义描述 */}
        <div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-[var(--color-text-muted)]">自定义描述（中文即可）</label>
            {project.mix?.bgmPromptHint && prompt === project.mix.bgmPromptHint && (
              <span className="text-[9px] italic text-purple-400">来自制片规划</span>
            )}
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            disabled={disabled}
            className="mt-1 w-full resize-none rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] text-[var(--color-text)]"
            placeholder="例如：紧张战斗 / 浪漫温馨 / 搞笑轻快…"
          />
        </div>

        {/* 时长信息 */}
        <p className="text-[9px] text-[var(--color-text-muted)]">
          当前时间轴：{totalSec > 0 ? `${Math.round(totalSec)}s` : '空'}
          {totalSec > 0 && ` · 约需 ${Math.max(1, Math.ceil(totalSec / LYRIA_CLIP_SEC))} 首配乐`}
        </p>

        {/* BGM 淡出时长 */}
        <div>
          <p className="text-[10px] text-[var(--color-text-muted)] mb-1.5">BGM 淡出时长（导出生效）</p>
          <div className="flex gap-1.5">
            {([0, 1, 2, 3] as const).map((s) => {
              const cur = project.mix?.bgmFadeOut ?? 2;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setProject((p) => ({
                      ...p,
                      mix: { sourceAudio: p.mix?.sourceAudio ?? 1, bgm: p.mix?.bgm ?? 0.4, ...p.mix, bgmFadeOut: s },
                    }))
                  }
                  className={`flex-1 rounded py-1 text-[10px] border transition-colors ${
                    cur === s
                      ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30'
                  }`}
                >
                  {s === 0 ? '无' : `${s}s`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-[var(--color-border)] px-3 py-2 space-y-2">
        {/* 一键智能配乐（主按钮） */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runSmartBgm()}
          className="w-full rounded-lg bg-[var(--color-primary)] px-3 py-2 text-[11px] font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
        >
          {busy ? '生成中…' : '✨ 一键智能配乐'}
        </button>

        {/* 辅助按钮 */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => void runPolish()}
            className="rounded-lg bg-[var(--color-primary)]/10 px-2 py-1.5 text-[10px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 disabled:opacity-50 transition-colors"
          >
            {polishBusy ? '优化中…' : '优化 Prompt'}
          </button>
          <button
            type="button"
            disabled={busy || !prompt.trim() || polishBusy}
            onClick={() => void runGenerate()}
            className="rounded-lg bg-[var(--color-surface-elevated)] px-2 py-1.5 text-[10px] font-medium text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] hover:text-[var(--color-text)] disabled:opacity-50 transition-colors"
          >
            {busy ? '…' : '仅生成'}
          </button>
        </div>
        <RunningStatus
          active={busy || polishBusy}
          label={polishBusy ? '正在优化配乐提示词' : '正在生成配乐'}
          stallAfterSec={30}
          scene="fine-cut"
        />
      </div>
    </div>
  );
}
