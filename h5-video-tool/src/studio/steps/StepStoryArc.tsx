import type { StoryArcLayer, StoryBeat } from '../productionTypes';

export function StepStoryArc({
  styleRefSummary,
  onStyleRefSummaryChange,
  aspectRatioText,
  storyGenre,
  onStoryGenreChange,
  story,
  patchStory,
  busyL2,
  onGenerateL2,
}: {
  styleRefSummary: string;
  onStyleRefSummaryChange: (next: string) => void;
  aspectRatioText: string;
  storyGenre: string;
  onStoryGenreChange: (next: string) => void;
  story: StoryArcLayer;
  patchStory: (fn: (s: StoryArcLayer) => StoryArcLayer) => void;
  busyL2: boolean;
  onGenerateL2: () => void | Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 sm:grid-cols-2">
        <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2">
          视频风格摘要（可与「输入」页一致）
          <textarea
            value={styleRefSummary}
            onChange={(e) => onStyleRefSummaryChange(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          />
        </label>
        <div>
          <div className="text-xs font-medium text-[var(--color-text-muted)]">画面比例</div>
          <p className="mt-1 text-sm text-[var(--color-text)]">{aspectRatioText}（在「输入」页修改）</p>
        </div>
        <div>
          <div className="text-xs font-medium text-[var(--color-text-muted)]">故事类型</div>
          <input
            value={storyGenre}
            onChange={(e) => onStoryGenreChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            placeholder="如：悬疑、都市"
          />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">剧本摘要（可编辑）</h3>
        <div className="mt-3 space-y-4 text-sm">
          <label className="block text-xs text-[var(--color-text-muted)]">
            一句话故事（logline）
            <textarea
              value={story.logline}
              onChange={(e) => patchStory((s) => ({ ...s, logline: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
            />
          </label>
          <label className="block text-xs text-[var(--color-text-muted)]">
            故事梗概
            <textarea
              value={story.synopsis}
              onChange={(e) => patchStory((s) => ({ ...s, synopsis: e.target.value }))}
              rows={5}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
            />
          </label>
          <label className="block text-xs text-[var(--color-text-muted)]">
            节奏说明（可选）
            <textarea
              value={story.pacingNotes ?? ''}
              onChange={(e) => patchStory((s) => ({ ...s, pacingNotes: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">剧本节拍</h3>
          <button
            type="button"
            onClick={() =>
              patchStory((s) => ({
                ...s,
                beats: [
                  ...s.beats,
                  {
                    id: `b-${Date.now()}`,
                    label: `节拍 ${s.beats.length + 1}`,
                    storyPercent: Math.min(1, (s.beats.length + 1) * 0.1),
                    description: '',
                  } satisfies StoryBeat,
                ],
              }))
            }
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            + 添加节拍
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {story.beats.map((b, bi) => (
            <div
              key={b.id}
              className="rounded-lg border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[var(--color-text-muted)]">#{bi + 1}</span>
                <input
                  value={b.label}
                  onChange={(e) =>
                    patchStory((s) => ({
                      ...s,
                      beats: s.beats.map((x, i) => (i === bi ? { ...x, label: e.target.value } : x)),
                    }))
                  }
                  className="min-w-[6rem] flex-1 rounded border border-[var(--color-border)] px-2 py-1 text-sm font-medium"
                />
                <label className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                  位置 %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round(b.storyPercent * 100)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      const pct = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) / 100 : 0;
                      patchStory((s) => ({
                        ...s,
                        beats: s.beats.map((x, i) => (i === bi ? { ...x, storyPercent: pct } : x)),
                      }));
                    }}
                    className="w-14 rounded border border-[var(--color-border)] px-1 py-0.5 text-xs"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    patchStory((s) => ({
                      ...s,
                      beats: s.beats.filter((_, i) => i !== bi),
                    }))
                  }
                  className="text-xs text-red-400 hover:underline"
                >
                  删除
                </button>
              </div>
              <textarea
                value={b.description}
                onChange={(e) =>
                  patchStory((s) => ({
                    ...s,
                    beats: s.beats.map((x, i) =>
                      i === bi ? { ...x, description: e.target.value } : x,
                    ),
                  }))
                }
                rows={2}
                placeholder="本节拍发生什么"
                className="mt-2 w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={busyL2}
        onClick={() => void onGenerateL2()}
        className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {busyL2 ? '生成中…' : '生成服化道并进入角色与场景'}
      </button>
    </div>
  );
}

