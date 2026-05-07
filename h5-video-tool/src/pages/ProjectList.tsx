import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  createProject,
  deleteProject,
  listProjects,
  renameProject,
  type ProjectListItem,
} from '../api/projectsStorage';
import { RunningStatus } from '../components/RunningStatus';
import { useLocale } from '../i18n/LocaleContext.tsx';
import { formatDateTime, formatMessage } from '../i18n/locale.ts';

function getStepLabel(
  step: number,
  t: (path: string) => string,
  text: (path: string, values?: Record<string, string | number>) => string,
): string {
  switch (step) {
    case 0:
      return t('projectListPage.stepScript');
    case 1:
      return t('projectListPage.stepDesign');
    case 2:
      return t('projectListPage.stepStoryboard');
    case 3:
      return t('projectListPage.stepDone');
    default:
      return text('projectListPage.stepFallback', { step });
  }
}

export function ProjectList() {
  const navigate = useNavigate();
  const { uiLocale, t } = useLocale();
  const text = (path: string, values?: Record<string, string | number>) =>
    formatMessage(t(path), values);

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [enteringProjectId, setEnteringProjectId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<ProjectListItem | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  async function fetchProjects() {
    setLoading(true);
    setError(null);
    try {
      setProjects(await listProjects());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('projectListPage.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchProjects();
  }, []);

  async function handleCreate() {
    const name = newName.trim() || t('projectListPage.untitledProject');
    setCreating(true);
    try {
      const meta = await createProject(name);
      setShowCreate(false);
      setNewName('');
      navigate(`/studio/production?projectId=${encodeURIComponent(meta.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('projectListPage.createFailed'));
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeletingId(id);
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((project) => project.id !== id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('projectListPage.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRenameConfirm() {
    if (!renameTarget) return;
    const trimmed = renameName.trim();
    if (!trimmed) return;
    setRenaming(true);
    try {
      await renameProject(renameTarget.id, trimmed);
      setProjects((prev) =>
        prev.map((project) =>
          project.id === renameTarget.id ? { ...project, title: trimmed } : project,
        ),
      );
      setRenameTarget(null);
      setRenameName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('projectListPage.renameFailed'));
    } finally {
      setRenaming(false);
    }
  }

  function formatProjectDate(iso: string): string {
    if (!iso) return '-';
    try {
      return formatDateTime(iso, uiLocale);
    } catch {
      return iso;
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      {enteringProjectId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="gobs-card rounded-2xl px-6 py-5 text-center">
            <div className="mx-auto mb-2 h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
            <p className="text-sm text-[var(--color-text)]">{t('projectListPage.loadingProject')}</p>
          </div>
        </div>
      )}

      <div className="gobs-card mb-6 flex items-center justify-between rounded-2xl px-5 py-4">
        <div>
          <span className="chip">{t('layout.studio')}</span>
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">
            {t('projectListPage.title')}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
            {t('projectListPage.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:bg-[var(--color-primary-hover)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('projectListPage.newProject')}
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="gobs-card w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
              {t('projectListPage.createTitle')}
            </h2>
            <input
              autoFocus
              type="text"
              placeholder={t('projectListPage.projectNamePlaceholder')}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && !creating && handleCreate()}
              className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-border-focus)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewName('');
                }}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {creating ? t('projectListPage.creatingAction') : t('projectListPage.createAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <RunningStatus
            active={true}
            label={t('projectListPage.loadingList')}
            stallAfterSec={10}
            scene="lobby"
          />
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] py-20 text-center">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mb-3 text-[var(--color-text-subtle)]"
          >
            <rect x="2" y="4" width="20" height="14" rx="2" />
            <line x1="6" y1="4" x2="6" y2="22" />
            <line x1="12" y1="4" x2="12" y2="22" />
            <line x1="2" y1="11" x2="22" y2="11" />
          </svg>
          <p className="text-sm font-medium text-[var(--color-text-muted)]">
            {t('projectListPage.emptyTitle')}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
            {t('projectListPage.emptyHint')}
          </p>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="gobs-card group relative rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-2xl"
            >
              <button
                type="button"
                onClick={() => {
                  setEnteringProjectId(project.id);
                  navigate(
                    `/studio/production?projectId=${encodeURIComponent(project.id)}`,
                  );
                }}
                className="block w-full text-left"
              >
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/15">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="14" rx="2" />
                      <line x1="6" y1="4" x2="6" y2="22" />
                      <line x1="12" y1="4" x2="12" y2="22" />
                      <line x1="2" y1="11" x2="22" y2="11" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                      {project.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-subtle)]">
                      {text('projectListPage.updatedAt', {
                        time: formatProjectDate(project.updatedAt),
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--color-primary)]">
                    {getStepLabel(project.step, t, text)}
                  </span>
                </div>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)]/60 bg-[var(--color-surface-elevated)] px-3 py-1 text-[11px] font-medium text-[var(--color-text-muted)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                  {t('projectListPage.reviewBeforePublish')}
                </div>
              </button>

              <div className="absolute right-3 top-3 hidden group-hover:block">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpenId(menuOpenId === project.id ? null : project.id);
                  }}
                  className="rounded-md p-1.5 text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                  title={t('projectListPage.moreActions')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>
                {menuOpenId === project.id && (
                  <div className="gobs-glass absolute right-0 top-8 z-10 w-32 rounded-xl border border-[var(--color-border)] py-1 shadow-xl">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuOpenId(null);
                        setRenameTarget(project);
                        setRenameName(project.title);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                    >
                      {t('projectListPage.renameAction')}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuOpenId(null);
                        setDeleteTarget(project);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10"
                    >
                      {t('projectListPage.deleteAction')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="gobs-card w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
              {t('projectListPage.renameTitle')}
            </h2>
            <input
              autoFocus
              type="text"
              placeholder={t('projectListPage.projectNamePlaceholder')}
              value={renameName}
              onChange={(event) => setRenameName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && !renaming && handleRenameConfirm()}
              className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-border-focus)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRenameTarget(null);
                  setRenameName('');
                }}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleRenameConfirm}
                disabled={renaming || !renameName.trim()}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {renaming ? t('projectListPage.savingAction') : t('projectListPage.saveAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="gobs-card w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <h2 className="mb-2 text-base font-semibold text-[var(--color-text)]">
              {t('projectListPage.deleteTitle')}
            </h2>
            <p className="mb-6 text-sm text-[var(--color-text-muted)]">
              {text('projectListPage.deleteConfirm', { title: deleteTarget.title })}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deletingId === deleteTarget.id}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deletingId === deleteTarget.id
                  ? t('projectListPage.deletingAction')
                  : t('projectListPage.confirmDeleteAction')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
