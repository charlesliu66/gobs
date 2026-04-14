import { useState } from 'react';
import type { EditorProjectRecord } from '../../api/editor';

type ProjectListItem = Pick<EditorProjectRecord, 'id' | 'name' | 'createdAt' | 'updatedAt' | 'aspectRatio'>;

function relativeTime(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

interface EditorProjectManagerProps {
  projectList: ProjectListItem[];
  currentProjectId: string;
  onOpen: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export function EditorProjectManager({
  projectList,
  currentProjectId,
  onOpen,
  onNew,
  onRename,
  onDelete,
  onClose,
}: EditorProjectManagerProps) {
  const [search, setSearch] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = projectList.filter((p) =>
    !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  async function handleRenameConfirm(id: string) {
    const name = renameValue.trim();
    if (!name) { setRenamingId(null); return; }
    setBusyId(id);
    try {
      await onRename(id, name);
    } finally {
      setBusyId(null);
      setRenamingId(null);
    }
  }

  async function handleDeleteConfirm(id: string) {
    setBusyId(id);
    try {
      await onDelete(id);
    } finally {
      setBusyId(null);
      setConfirmDeleteId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex h-[560px] w-[600px] max-w-[96vw] flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">我的剪辑项目</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { onNew(); onClose(); }}
              className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white"
            >
              + 新建剪辑
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              关闭
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-[var(--color-border)] px-5 py-2.5">
          <input
            type="text"
            placeholder="搜索项目名称…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
          />
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
              {search ? '没有匹配的项目' : '暂无剪辑项目'}
            </div>
          ) : (
            filtered.map((p) => {
              const isCurrent = p.id === currentProjectId;
              const isRenaming = renamingId === p.id;
              const isConfirmDelete = confirmDeleteId === p.id;
              const isBusy = busyId === p.id;

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-3 transition-colors ${
                    isCurrent ? 'bg-[var(--color-primary)]/5' : 'hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  {/* Name / rename input */}
                  <div className="min-w-0 flex-1">
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleRenameConfirm(p.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="w-full rounded border border-[var(--color-primary)] bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-text)] outline-none"
                      />
                    ) : (
                      <div className="truncate text-xs font-medium text-[var(--color-text)]">
                        {p.name}
                        {isCurrent && (
                          <span className="ml-1.5 rounded bg-[var(--color-primary)]/10 px-1.5 py-0.5 text-[10px] text-[var(--color-primary)]">当前</span>
                        )}
                      </div>
                    )}
                    <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                      {relativeTime(p.updatedAt)}
                    </div>
                  </div>

                  {/* Actions */}
                  {isConfirmDelete ? (
                    <div className="flex shrink-0 items-center gap-1.5 text-xs">
                      <span className="text-[var(--color-text-muted)]">确认删除？</span>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleDeleteConfirm(p.id)}
                        className="rounded bg-red-500/10 px-2 py-0.5 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {isBusy ? '删除中…' : '删除'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      >
                        取消
                      </button>
                    </div>
                  ) : isRenaming ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleRenameConfirm(p.id)}
                        className="rounded bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 disabled:opacity-50"
                      >
                        {isBusy ? '保存…' : '保存'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1.5">
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => { onOpen(p.id); onClose(); }}
                          className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        >
                          打开
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { setRenamingId(p.id); setRenameValue(p.name); }}
                        className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      >
                        重命名
                      </button>
                      <button
                        type="button"
                        onClick={() => { setConfirmDeleteId(p.id); setRenamingId(null); }}
                        className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)] hover:text-red-400"
                      >
                        删除
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
