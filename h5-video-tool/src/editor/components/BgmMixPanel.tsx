import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { generateEditorMusic, polishEditorMusicPrompt } from '../../api/editor';
import type { MediaAsset, TimelineProject } from '../types/timeline';
import { setBgmClipOnProject } from '../types/timeline';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function mixAudioUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE) return p;
  return `${API_BASE.replace(/\/$/, '')}${p}`;
}

interface BgmMixPanelProps {
  setProject: Dispatch<SetStateAction<TimelineProject>>;
  setAssets: Dispatch<SetStateAction<Record<string, MediaAsset>>>;
  onPushLog?: (line: string) => void;
  /** 剪辑 Agent 自动配乐成功后同步英文 prompt（按 key 更新） */
  promptSync?: { prompt: string; negativePrompt: string; key: number } | null;
}

/** 左下栏：Lyria 配乐；音量在时间轴「原声 / BGM」轨展开 */
export function BgmMixPanel({ setProject, setAssets, onPushLog, promptSync }: BgmMixPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('calm, slow, ambient, vocals');
  const [busy, setBusy] = useState(false);
  const [polishBusy, setPolishBusy] = useState(false);

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
      onPushLog?.('已一键优化配乐 prompt（英文）');
    } catch (e) {
      onPushLog?.(`优化失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPolishBusy(false);
    }
  }, [prompt, onPushLog]);

  const runGenerate = useCallback(async () => {
    const t = prompt.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      const res = await generateEditorMusic({
        prompt: t,
        negativePrompt: negativePrompt.trim() || undefined,
        sampleCount: 1,
      });
      const item = res.items[0];
      if (!item) throw new Error('未返回音频');
      const url = mixAudioUrl(item.url);
      setAssets((prev) => ({
        ...prev,
        [item.id]: {
          id: item.id,
          url,
          kind: 'audio' as const,
          durationSec: item.durationSec,
          meta: { bgm: true },
        },
      }));
      setProject((p) => setBgmClipOnProject(p, item.id, item.durationSec));
      onPushLog?.('已更新配乐（BGM 轨）');
    } catch (e) {
      onPushLog?.(`配乐失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [prompt, negativePrompt, busy, setAssets, setProject, onPushLog]);

  const disabled = polishBusy || busy;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-shrink-0 border-b border-[var(--color-border)] px-3 py-2">
        <h3 className="text-[11px] font-semibold text-[var(--color-text)]">配乐生成</h3>
        <p className="text-[9px] leading-snug text-[var(--color-text-muted)]">
          若在右侧 Agent 里提到配乐，会自动润色并生成；不满意可在此改文案再点「生成」。音量在时间轴 BGM 轨调节。
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <label className="text-[10px] text-[var(--color-text-muted)]">说明（润色后为英文，送 Lyria）</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          disabled={disabled}
          className="mt-1 w-full resize-none rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] text-[var(--color-text)]"
          placeholder="例如：高燃音乐 / 紧张战斗 BGM… 或先点「一键 prompt」"
        />
        <label className="mt-2 block text-[10px] text-[var(--color-text-muted)]">negative（可选）</label>
        <input
          type="text"
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          disabled={disabled}
          placeholder="vocals, calm…"
          className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] text-[var(--color-text)]"
        />
        <p className="mt-2 text-[9px] leading-snug text-[var(--color-text-muted)]">
          Compass Lyria，单段约 32.8s，会替换时间轴 BGM 轨。
        </p>
      </div>

      <div className="flex-shrink-0 border-t border-[var(--color-border)] px-3 py-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => void runPolish()}
            className="rounded-lg bg-[var(--color-primary)]/15 px-2 py-2 text-[11px] font-medium text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/35 hover:bg-[var(--color-primary)]/25 disabled:opacity-50"
            title="将上方模糊描述转为专业英文 prompt"
          >
            {polishBusy ? '优化中…' : '一键 prompt'}
          </button>
          <button
            type="button"
            disabled={busy || !prompt.trim() || polishBusy}
            onClick={() => void runGenerate()}
            className="rounded-lg bg-[var(--color-surface-elevated)] px-2 py-2 text-[11px] font-medium text-[var(--color-text)] ring-1 ring-[var(--color-border)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          >
            {busy ? '生成中…' : '生成'}
          </button>
        </div>
      </div>
    </div>
  );
}
