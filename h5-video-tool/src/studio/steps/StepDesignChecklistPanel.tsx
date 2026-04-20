import type { ProductionDesignLayer } from '../productionTypes';

export function StepDesignChecklistPanel({
  checklistSubTab,
  onChecklistSubTabChange,
  productionDesign,
}: {
  checklistSubTab: 'wardrobe' | 'props' | 'raw';
  onChecklistSubTabChange: (tab: 'wardrobe' | 'props' | 'raw') => void;
  productionDesign: ProductionDesignLayer | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'wardrobe' as const, label: '角色造型·服装' },
            { id: 'props' as const, label: '道具 (props)' },
            { id: 'raw' as const, label: '完整 JSON' },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChecklistSubTabChange(id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              checklistSubTab === id
                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {checklistSubTab === 'raw' ? (
        <pre className="max-h-[420px] overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xs">
          {JSON.stringify(productionDesign, null, 2)}
        </pre>
      ) : (
        <pre className="max-h-[420px] overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xs">
          {JSON.stringify(
            checklistSubTab === 'wardrobe'
              ? productionDesign?.wardrobe ?? []
              : productionDesign?.props ?? [],
            null,
            2,
          )}
        </pre>
      )}
      <p className="text-[11px] text-[var(--color-text-muted)]">
        默认展示角色造型服装清单；道具清单与「全部道具」卡一致，可在道具页上传/生图以保证成片一致。
      </p>
    </div>
  );
}

