import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { generateEditorMusic, polishEditorMusicPrompt } from '../../api/editor';
import type { MediaAsset, TimelineProject } from '../types/timeline';
import { setBgmClipOnProject, computeDurationSec } from '../types/timeline';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function mixAudioUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE) return p;
  return `${API_BASE.replace(/\/$/, '')}${p}`;
}

const LYRIA_CLIP_SEC = 32.8;

/** 根据时间轴时长和风格，自动生成并拼接多段 BGM */
async function generateAndTileMusic(
  prompt: string,
  negativePrompt: string,
  totalSec: number,
  setAssets: Dispatch<SetStateAction<Record<string, MediaAsset>>>,
  setProject: Dispatch<SetStateAction<TimelineProject>>,
  onPushLog?: (s: string) => void,
) {
  const segmentsNeeded = Math.max(1, Math.ceil(totalSec / LYRIA_CLIP_SEC));
  onPushLog?.(`生成 ${segmentsNeeded} 段配乐（共约 ${Math.round(segmentsNeeded * LYRIA_CLIP_SEC)}s）…`);

  const res = await generateEditorMusic({
    prompt,
    negativePrompt: negativePrompt.trim() || undefined,
    sampleCount: Math.min(segmentsNeeded, 3), // Lyria 最多 3 段
  });

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
  onPushLog?.(`配乐已铺满（${segmentsNeeded} 段），可在 BGM 轨调音量`);
}

interface BgmMixPanelProps {
  project: TimelineProject;
  setProject: Dispatch<SetStateAction<TimelineProject>>;
  setAssets: Dispatch<SetStateAction<Record<string, MediaAsset>>>;
  onPushLog?: (line: string) => void;
  promptSync?: { prompt: string; negativePrompt: string; key: number } | null;
}

const QUICK_STYLES = [
  { label: '🔥 高燃战斗', prompt: '高燃电影战斗配乐，器乐，强节奏' },
  { label: '😢 情感催泪', prompt: '情感深沉，钢琴，弦乐，催泪' },
  { label: '🎮 游戏冒险', prompt: '游戏冒险背景音乐，史诗感，器乐' },
  { label: '✨ 轻快活泼', prompt: '轻快活泼，现代流行，积极向上' },
  { label: '🌆 都市悬疑', prompt: '都市悬疑，电子，低沉，紧张氛围' },
] as const;

export function BgmMixPanel({ project, setProject, setAssets, onPushLog, promptSync }: BgmMixPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('vocals, lyrics');
  const [busy, setBusy] = useState(false);
  const [polishBusy, setPolishBusy] = useState(false);

  const totalSec = computeDurationSec(project);

  useEffect(() => {
    if (!promptSync) return;
    setPrompt(promptSync.prompt);
    setNegativePrompt(promptSync.negativePrompt);
  }, [promptSync?.key]);

  const runPolish = useCallback(async () => {
    const raw = prompt.trim() || '高燃游戏战斗配乐，器乐，节奏快';
    setPolishBusy(true);
    try {
      const out = await polishEditorMusicPrompt(raw);
      setPrompt(out.prompt);
      if (out.negativePrompt) setNegativePrompt(out.negativePrompt);
      onPushLog?.('已优化配乐 prompt（英文）');
    } catch (e) {
      onPushLog?.(`优化失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPolishBusy(false);
    }
  }, [prompt, onPushLog]);

  /** 一键智能配乐：润色 prompt + 按时间轴长度自动生成多段并拼接 */
  const runSmartBgm = useCallback(async () => {
    if (busy) return;
    const raw = prompt.trim() || '适合视频内容的背景音乐，器乐';
    setBusy(true);
    try {
      let finalPrompt = raw;
      let finalNegative = negativePrompt;
      onPushLog?.('正在优化配乐风格…');
      try {
        const out = await polishEditorMusicPrompt(raw);
        finalPrompt = out.prompt;
        finalNegative = out.negativePrompt ?? finalNegative;
        setPrompt(finalPrompt);
        if (out.negativePrompt) setNegativePrompt(out.negativePrompt);
      } catch (e) {
        onPushLog?.(
          `配乐润色失败，已降级为原始描述继续生成：${e instanceof Error ? e.message : String(e)}`,
        );
      }
      await generateAndTileMusic(finalPrompt, finalNegative, totalSec, setAssets, setProject, onPushLog);
    } catch (e) {
      onPushLog?.(`配乐失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [prompt, negativePrompt, busy, totalSec, setAssets, setProject, onPushLog]);

  const runGenerate = useCallback(async () => {
    const t = prompt.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      await generateAndTileMusic(t, negativePrompt, totalSec, setAssets, setProject, onPushLog);
    } catch (e) {
      onPushLog?.(`配乐失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [prompt, negativePrompt, busy, totalSec, setAssets, setProject, onPushLog]);

  const disabled = polishBusy || busy;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-shrink-0 border-b border-[var(--color-border)] px-3 py-2">
        <h3 className="text-[11px] font-semibold text-[var(--color-text)]">AI 配乐</h3>
        <p className="text-[9px] leading-snug text-[var(--color-text-muted)]">
          选择风格或输入描述，自动按视频时长生成并铺满 BGM 轨
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {/* 快速风格选择 */}
        <div>
          <p className="text-[10px] text-[var(--color-text-muted)] mb-1.5">快速选择风格</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_STYLES.map((s) => (
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

        {/* 自定义描述 */}
        <div>
          <label className="text-[10px] text-[var(--color-text-muted)]">自定义描述（中文即可）</label>
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
          {totalSec > 0 && ` · 需 ${Math.max(1, Math.ceil(totalSec / LYRIA_CLIP_SEC))} 段 Lyria 配乐`}
        </p>
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
      </div>
    </div>
  );
}
