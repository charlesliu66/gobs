import { useMemo, useState } from 'react';
import type { ProjectListItem } from '../../api/production';
import { isUnnamedProductionProjectTitle } from '../../utils/projectLifecycle.ts';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { formatDateTime } from '../../i18n/locale.ts';

export function ProductionProjectListModal({
  visible,
  projects,
  governanceBusy,
  onClose,
  onLoadProject,
  onRenameProject,
  onDeleteProject,
  onGovernUnnamed,
}: {
  visible: boolean;
  projects: ProjectListItem[];
  governanceBusy: boolean;
  onClose: () => void;
  onLoadProject: (id: string, title?: string) => void | Promise<void>;
  onRenameProject: (id: string, title: string) => void | Promise<void>;
  onDeleteProject: (id: string) => void | Promise<void>;
  onGovernUnnamed: () => void | Promise<void>;
}) {
  const { uiLocale, t } = useLocale();
  const [search, setSearch] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const unnamedCount = useMemo(
    () => projects.filter((projectItem) => isUnnamedProductionProjectTitle(projectItem.title)).length,
    [projects],
  );

  const filtered = projects.filter((projectItem) =>
    !search.trim() || (projectItem.title || '').toLowerCase().includes(search.trim().toLowerCase()),
  );
  const formatText = (path: string, values?: Record<string, string | number>) => {
    let message = t(path);
    if (!values) return message;
    for (const [key, value] of Object.entries(values)) {
      message = message.replaceAll(`{${key}}`, String(value));
    }
    return message;
  };
  const formatProjectTime = (iso: string): string => {
    if (!iso) return '';
    return formatDateTime(iso, uiLocale);
  };

  if (!visible) return null;

  async function handleRename(id: string) {
    const nextTitle = renameValue.trim();
    if (!nextTitle) {
      setRenamingId(null);
      return;
    }
    setBusyId(id);
    try {
      await onRenameProject(id, nextTitle);
      setRenamingId(null);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      await onDeleteProject(id);
      setConfirmDeleteId(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex h-[620px] w-full max-w-3xl flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text)]">{t('productionWizard.projectListTitle')}</h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {unnamedCount > 0
                ? formatText('productionWizard.unnamedProjectCount', { count: unnamedCount })
                : t('productionWizard.projectListClean')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={governanceBusy || unnamedCount === 0}
              onClick={() => void onGovernUnnamed()}
              className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {governanceBusy ? t('productionWizard.governingProjects') : t('productionWizard.governUnnamedProjects')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              ×
            </button>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('productionWizard.searchProjectsPlaceholder')}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-[var(--color-text-muted)]">
            {search ? t('productionWizard.noMatchedProjects') : t('productionWizard.noSavedProjects')}
          </p>
        ) : (
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {filtered.map((projectItem) => {
              const isRenaming = renamingId === projectItem.id;
              const isDeleting = confirmDeleteId === projectItem.id;
              const isBusy = busyId === projectItem.id;
              const isUnnamed = isUnnamedProductionProjectTitle(projectItem.title);

              return (
                <div
                  key={projectItem.id}
                  className="rounded-xl border border-[var(--color-border)] p-3 transition-colors hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-hover)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {isRenaming ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') void handleRename(projectItem.id);
                            if (event.key === 'Escape') setRenamingId(null);
                          }}
                          className="w-full rounded-lg border border-[var(--color-primary)] bg-[var(--color-surface)] px-2 py-1 text-sm text-[var(--color-text)] outline-none"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-[var(--color-text)]">
                            {projectItem.title || t('productionWizard.untitledProject')}
                          </p>
                          {isUnnamed && (
                            <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                              {t('productionWizard.needsGovernance')}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {formatText('productionWizard.projectStepMeta', {
                          step: projectItem.step + 1,
                          time: formatProjectTime(projectItem.updatedAt),
                        })}
                      </p>
                    </div>

                    {isDeleting ? (
                      <div className="flex shrink-0 items-center gap-2 text-xs">
                        <span className="text-[var(--color-text-muted)]">{t('productionWizard.confirmDeleteProject')}</span>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDelete(projectItem.id)}
                          className="rounded bg-red-500/10 px-2 py-1 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          {isBusy ? t('productionWizard.deleting') : t('common.delete')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded border border-[var(--color-border)] px-2 py-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void onLoadProject(projectItem.id, projectItem.title)}
                          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-primary)] hover:border-[var(--color-primary)]/40"
                        >
                          {t('productionWizard.openProject')}
                        </button>
                        {isRenaming ? (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleRename(projectItem.id)}
                              className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                            >
                              {isBusy ? t('productionWizard.saving') : t('common.save')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setRenamingId(null)}
                              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]"
                            >
                              {t('common.cancel')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingId(projectItem.id);
                                setRenameValue(projectItem.title || '');
                              }}
                              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                            >
                              {t('productionWizard.renameProject')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(projectItem.id)}
                              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-red-400"
                            >
                              {t('common.delete')}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
