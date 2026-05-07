import { useMemo, useState } from 'react';
import type { EditorProjectRecord } from '../../api/editor';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { formatMessage, formatRelativeTime } from '../../i18n/locale.ts';
import { isUnnamedEditorProjectName } from '../../utils/projectLifecycle.ts';

type ProjectListItem = Pick<EditorProjectRecord, 'id' | 'name' | 'createdAt' | 'updatedAt' | 'aspectRatio'>;

interface EditorProjectManagerProps {
  projectList: ProjectListItem[];
  currentProjectId: string;
  onOpen: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onGovernUnnamed: () => Promise<void>;
  governanceBusy: boolean;
  onClose: () => void;
}

export function EditorProjectManager({
  projectList,
  currentProjectId,
  onOpen,
  onNew,
  onRename,
  onDelete,
  onGovernUnnamed,
  governanceBusy,
  onClose,
}: EditorProjectManagerProps) {
  const { uiLocale, t } = useLocale();
  const [search, setSearch] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const unnamedCount = useMemo(
    () => projectList.filter((projectItem) => isUnnamedEditorProjectName(projectItem.name)).length,
    [projectList],
  );

  const filtered = projectList.filter((projectItem) =>
    !search.trim() || (projectItem.name || '').toLowerCase().includes(search.trim().toLowerCase()),
  );

  async function handleRenameConfirm(id: string) {
    const name = renameValue.trim();
    if (!name) {
      setRenamingId(null);
      return;
    }
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
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-[560px] w-[640px] max-w-[96vw] flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text)]">
              {t('editorProjectManager.title')}
            </h2>
            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              {unnamedCount > 0
                ? formatMessage(t('editorProjectManager.unnamedCleanable'), { count: unnamedCount })
                : t('editorProjectManager.listClean')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={governanceBusy || unnamedCount === 0}
              onClick={() => void onGovernUnnamed()}
              className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {governanceBusy ? t('editorProjectManager.cleaning') : t('editorProjectManager.cleanUnnamed')}
            </button>
            <button
              type="button"
              onClick={() => {
                onNew();
                onClose();
              }}
              className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white"
            >
              {t('editorProjectManager.newEdit')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              {t('common.close')}
            </button>
          </div>
        </div>

        <div className="border-b border-[var(--color-border)] px-5 py-2.5">
          <input
            type="text"
            placeholder={t('editorProjectManager.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
              {search ? t('editorProjectManager.noMatching') : t('editorProjectManager.noProjects')}
            </div>
          ) : (
            filtered.map((projectItem) => {
              const isCurrent = projectItem.id === currentProjectId;
              const isRenaming = renamingId === projectItem.id;
              const isConfirmDelete = confirmDeleteId === projectItem.id;
              const isBusy = busyId === projectItem.id;
              const isUnnamed = isUnnamedEditorProjectName(projectItem.name);

              return (
                <div
                  key={projectItem.id}
                  className={`flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-3 transition-colors ${
                    isCurrent ? 'bg-[var(--color-primary)]/5' : 'hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') void handleRenameConfirm(projectItem.id);
                          if (event.key === 'Escape') setRenamingId(null);
                        }}
                        className="w-full rounded border border-[var(--color-primary)] bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-text)] outline-none"
                      />
                    ) : (
                      <div className="truncate text-xs font-medium text-[var(--color-text)]">
                        {projectItem.name || t('editorProjectManager.untitledEdit')}
                        {isCurrent && (
                          <span className="ml-1.5 rounded bg-[var(--color-primary)]/10 px-1.5 py-0.5 text-[10px] text-[var(--color-primary)]">
                            {t('editorProjectManager.current')}
                          </span>
                        )}
                        {isUnnamed && (
                          <span className="ml-1.5 rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                            {t('editorProjectManager.needsCleanup')}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                      {projectItem.updatedAt ? formatRelativeTime(projectItem.updatedAt, uiLocale) : ''}
                    </div>
                  </div>

                  {isConfirmDelete ? (
                    <div className="flex shrink-0 items-center gap-1.5 text-xs">
                      <span className="text-[var(--color-text-muted)]">
                        {t('editorProjectManager.deleteConfirm')}
                      </span>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleDeleteConfirm(projectItem.id)}
                        className="rounded bg-red-500/10 px-2 py-0.5 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {isBusy ? t('editorProjectManager.deleting') : t('common.delete')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : isRenaming ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleRenameConfirm(projectItem.id)}
                        className="rounded bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 disabled:opacity-50"
                      >
                        {isBusy ? t('projectListPage.savingAction') : t('common.save')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1.5">
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpen(projectItem.id);
                            onClose();
                          }}
                          className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        >
                          {t('editorProjectManager.open')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingId(projectItem.id);
                          setRenameValue(projectItem.name || '');
                        }}
                        className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      >
                        {t('editorProjectManager.rename')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteId(projectItem.id);
                          setRenamingId(null);
                        }}
                        className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)] hover:text-red-400"
                      >
                        {t('common.delete')}
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
