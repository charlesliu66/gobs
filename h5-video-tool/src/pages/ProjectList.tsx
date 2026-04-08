import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listProjects, createProject, deleteProject, type ProjectMeta } from '../api/projectsStorage';

export function ProjectList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchProjects() {
    setLoading(true);
    setError(null);
    try {
      const list = await listProjects();
      setProjects(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchProjects(); }, []);

  async function handleCreate() {
    const name = newName.trim() || '未命名项目';
    setCreating(true);
    try {
      const meta = await createProject(name);
      setShowCreate(false);
      setNewName('');
      navigate(`/projects/${meta.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确认删除该项目？此操作不可撤销。')) return;
    setDeletingId(id);
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(iso: string) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">我的项目</h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
            管理您的制片项目，点击进入高级制片向导
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新建项目
        </button>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-2xl">
            <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">新建项目</h2>
            <input
              autoFocus
              type="text"
              placeholder="项目名称（可留空）"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !creating && handleCreate()}
              className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-border-focus)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewName(''); }}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >取消</button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >{creating ? '创建中…' : '创建'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-sm text-[var(--color-text-muted)]">
          加载中…
        </div>
      )}

      {/* Empty */}
      {!loading && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] py-20 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 text-[var(--color-text-subtle)]">
            <rect x="2" y="4" width="20" height="14" rx="2" />
            <line x1="6" y1="4" x2="6" y2="22" />
            <line x1="12" y1="4" x2="12" y2="22" />
            <line x1="2" y1="11" x2="22" y2="11" />
          </svg>
          <p className="text-sm font-medium text-[var(--color-text-muted)]">还没有项目</p>
          <p className="mt-1 text-xs text-[var(--color-text-subtle)]">点击右上角「新建项目」开始</p>
        </div>
      )}

      {/* Project cards */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="group relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 transition hover:border-[var(--color-primary)]/40 hover:shadow-lg"
            >
              {/* Card body — clickable */}
              <button
                type="button"
                onClick={() => navigate(`/studio/production?projectId=${p.id}`)}
                className="block w-full text-left"
              >
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/15">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="14" rx="2" />
                      <line x1="6" y1="4" x2="6" y2="22" />
                      <line x1="12" y1="4" x2="12" y2="22" />
                      <line x1="2" y1="11" x2="22" y2="11" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">{p.name}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-subtle)]">
                      更新于 {formatDate(p.updatedAt)}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-[var(--color-text-subtle)]">
                  创建于 {formatDate(p.createdAt)}
                </p>
              </button>

              {/* Delete btn */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); void handleDelete(p.id); }}
                disabled={deletingId === p.id}
                className="absolute right-3 top-3 hidden rounded-md p-1.5 text-[var(--color-text-subtle)] hover:bg-red-500/10 hover:text-red-400 group-hover:flex disabled:opacity-50"
                title="删除项目"
              >
                {deletingId === p.id
                  ? <span className="text-xs">删除中</span>
                  : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  )
                }
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
