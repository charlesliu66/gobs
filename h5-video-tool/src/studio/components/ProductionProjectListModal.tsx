import type { ProjectListItem } from '../../api/production';

export function ProductionProjectListModal({
  visible,
  projects,
  onClose,
  onLoadProject,
}: {
  visible: boolean;
  projects: ProjectListItem[];
  onClose: () => void;
  onLoadProject: (id: string, title?: string) => void | Promise<void>;
}) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-text)]">已保存的项目</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            ✕
          </button>
        </div>
        {projects.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">暂无已保存项目</p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void onLoadProject(p.id, p.title)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-hover)] transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{p.title || '未命名项目'}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    步骤 {p.step + 1} · {p.updatedAt ? new Date(p.updatedAt).toLocaleString('zh-CN') : ''}
                  </p>
                </div>
                <span className="text-xs text-[var(--color-primary)]">加载 →</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

