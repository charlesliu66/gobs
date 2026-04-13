import { Link } from 'react-router-dom';

type AssembledShot = {
  shotIndex: number;
  seedanceBlock: string;
};

export function StepExportPromptConsistency({
  busyVis,
  busyAsm,
  hasShots,
  consistencySnippet,
  assembledShots,
  onPickReferenceImage,
  onAssemblePrompts,
  onCopyAllSeedance,
}: {
  busyVis: boolean;
  busyAsm: boolean;
  hasShots: boolean;
  consistencySnippet: string | null;
  assembledShots: AssembledShot[] | null;
  onPickReferenceImage: (file: File | null) => void;
  onAssemblePrompts: () => void;
  onCopyAllSeedance: () => void;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
      <h2 className="text-sm font-semibold">Prompt 与一致性</h2>
      <p className="text-xs text-[var(--color-text-muted)]">
        可选：上传一张主角参考图提取视觉特征；再组装各镜 Seedance 块。
      </p>
      <input
        type="file"
        accept="image/*"
        disabled={busyVis}
        onChange={(e) => onPickReferenceImage(e.target.files?.[0] ?? null)}
        className="text-sm"
      />
      {busyVis && <p className="text-xs text-[var(--color-text-muted)]">分析中…</p>}
      {consistencySnippet && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs">
          <strong>一致性：</strong>
          {consistencySnippet}
        </div>
      )}
      <button
        type="button"
        disabled={busyAsm || !hasShots}
        onClick={onAssemblePrompts}
        className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {busyAsm ? '组装中…' : '组装各镜 Prompt'}
      </button>
      {assembledShots && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={onCopyAllSeedance}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm"
          >
            复制全部 Seedance 块
          </button>
          <div className="max-h-96 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs">
            {assembledShots.map((s) => (
              <div key={s.shotIndex} className="mb-4 border-b border-[var(--color-border)]/50 pb-4 last:border-0">
                <div className="font-semibold text-[var(--color-text)]">镜 {s.shotIndex}</div>
                <div className="mt-1 whitespace-pre-wrap text-[var(--color-text-muted)]">{s.seedanceBlock}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/studio" className="inline-block text-sm text-[var(--color-primary)] hover:underline">
              去 Studio 创作 →
            </Link>
            <Link to="/studio?tab=gallery" className="inline-block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:underline">
              历史内容
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

