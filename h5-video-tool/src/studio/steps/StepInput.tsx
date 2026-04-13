import type { StructureTemplate } from '../productionTypes';

export function StepInput({
  styleRefSummary,
  onStyleRefSummaryChange,
  aspectRatio,
  aspectOptions,
  onAspectRatioChange,
  storyGenre,
  onStoryGenreChange,
  busyStyle,
  onStyleRefFileChange,
  styleRefPreview,
  characterBible,
  onCharacterBibleChange,
  synopsis,
  onSynopsisChange,
  structureTemplate,
  templateOptions,
  onStructureTemplateChange,
  busyL1,
  onGenerateStoryArc,
}: {
  styleRefSummary: string;
  onStyleRefSummaryChange: (next: string) => void;
  aspectRatio: string;
  aspectOptions: readonly string[];
  onAspectRatioChange: (next: string) => void;
  storyGenre: string;
  onStoryGenreChange: (next: string) => void;
  busyStyle: boolean;
  onStyleRefFileChange: (file: File | null) => void;
  styleRefPreview: string | null;
  characterBible: string;
  onCharacterBibleChange: (next: string) => void;
  synopsis: string;
  onSynopsisChange: (next: string) => void;
  structureTemplate: StructureTemplate;
  templateOptions: readonly { value: StructureTemplate; label: string }[];
  onStructureTemplateChange: (next: StructureTemplate) => void;
  busyL1: boolean;
  onGenerateStoryArc: () => void | Promise<void>;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">立项与梗概</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs text-[var(--color-text-muted)] sm:col-span-2">
          视频风格（摘要）
          <textarea
            value={styleRefSummary}
            onChange={(e) => onStyleRefSummaryChange(e.target.value)}
            rows={3}
            placeholder="可手写；或上传参考图反解析"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </label>
        <label className="text-xs text-[var(--color-text-muted)]">
          画面比例
          <select
            value={aspectRatio}
            onChange={(e) => onAspectRatioChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          >
            {aspectOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--color-text-muted)]">
          故事类型（可选）
          <input
            value={storyGenre}
            onChange={(e) => onStoryGenreChange(e.target.value)}
            placeholder="如：女频、悬疑、都市"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">参考图反解析</span>
        <input
          type="file"
          accept="image/*"
          disabled={busyStyle}
          onChange={(e) => onStyleRefFileChange(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        {busyStyle && <span className="text-xs text-[var(--color-text-muted)]">分析中…</span>}
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        上传的参考图将作为全片画风基准；后续各镜分镜图会按该图与上方风格摘要做多模态画风锁定。
      </p>
      {styleRefPreview && (
        <img
          src={styleRefPreview}
          alt=""
          className="h-20 rounded-lg border border-[var(--color-border)] object-cover"
        />
      )}
      <label className="block text-xs text-[var(--color-text-muted)]">
        角色设定 / 背景
        <textarea
          value={characterBible}
          onChange={(e) => onCharacterBibleChange(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs text-[var(--color-text-muted)]">
        故事梗概
        <textarea
          value={synopsis}
          onChange={(e) => onSynopsisChange(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs text-[var(--color-text-muted)]">
        结构模板
        <select
          value={structureTemplate}
          onChange={(e) => onStructureTemplateChange(e.target.value as StructureTemplate)}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        >
          {templateOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={busyL1}
        onClick={() => void onGenerateStoryArc()}
        className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {busyL1 ? '生成中…' : '生成剧本大纲'}
      </button>
    </section>
  );
}

