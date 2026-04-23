import { useMemo, useState } from 'react';
import type { EditorProjectRecord } from '../../api/editor';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
import { isUnnamedEditorProjectName } from '../../utils/projectLifecycle.ts';

type ProjectListItem = Pick<EditorProjectRecord, 'id' | 'name' | 'createdAt' | 'updatedAt' | 'aspectRatio'>;

function relativeTime(iso: string, uiLocale: 'zh-CN' | 'en'): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return uiLocale === 'en' ? 'just now' : '刚刚';
  if (diff < 3_600_000) return uiLocale === 'en' ? `${Math.floor(diff / 60_000)} min ago` : `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return uiLocale === 'en' ? `${Math.floor(diff / 3_600_000)} hr ago` : `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 7 * 86_400_000) return uiLocale === 'en' ? `${Math.floor(diff / 86_400_000)} days ago` : `${Math.floor(diff / 86_400_000)} 天前`;
  return new Date(iso).toLocaleDateString(uiLocale === 'en' ? 'en-US' : 'zh-CN');
}

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
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);
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
              {uiText('我的剪辑项目', 'My editing projects')}
            </h2>
            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              {unnamedCount > 0
                ? uiText(`还有 ${unnamedCount} 个未命名项目可治理`, `${unnamedCount} unnamed projects can be cleaned up`)
                : uiText('项目列表已整洁', 'Project list is already clean')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={governanceBusy || unnamedCount === 0}
              onClick={() => void onGovernUnnamed()}
              className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {governanceBusy
                ? uiText('治理中...', 'Cleaning...')
                : uiText('治理未命名项目', 'Clean unnamed projects')}
            </button>
            <button
              type="button"
              onClick={() => {
                onNew();
                onClose();
              }}
              className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white"
            >
              {uiText('+ 新建剪辑', '+ New edit')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              {uiText('关闭', 'Close')}
            </button>
          </div>
        </div>

        <div className="border-b border-[var(--color-border)] px-5 py-2.5">
          <input
            type="text"
            placeholder={uiText('搜索项目名称...', 'Search project name...')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
              {search
                ? uiText('没有匹配的项目', 'No matching projects')
                : uiText('暂时还没有剪辑项目', 'No editing projects yet')}
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
                        {projectItem.name || uiText('未命名剪辑项目', 'Untitled edit')}
                        {isCurrent && (
                          <span className="ml-1.5 rounded bg-[var(--color-primary)]/10 px-1.5 py-0.5 text-[10px] text-[var(--color-primary)]">
                            {uiText('当前', 'Current')}
                          </span>
                        )}
                        {isUnnamed && (
                          <span className="ml-1.5 rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                            {uiText('待治理', 'Needs cleanup')}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                      {relativeTime(projectItem.updatedAt, uiLocale)}
                    </div>
                  </div>

                  {isConfirmDelete ? (
                    <div className="flex shrink-0 items-center gap-1.5 text-xs">
                      <span className="text-[var(--color-text-muted)]">
                        {uiText('确认删除这个项目？', 'Delete this project?')}
                      </span>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleDeleteConfirm(projectItem.id)}
                        className="rounded bg-red-500/10 px-2 py-0.5 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {isBusy ? uiText('删除中...', 'Deleting...') : uiText('删除', 'Delete')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      >
                        {uiText('取消', 'Cancel')}
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
                        {isBusy ? uiText('保存中...', 'Saving...') : uiText('保存', 'Save')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      >
                        {uiText('取消', 'Cancel')}
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
                          {uiText('打开', 'Open')}
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
                        {uiText('重命名', 'Rename')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteId(projectItem.id);
                          setRenamingId(null);
                        }}
                        className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)] hover:text-red-400"
                      >
                        {uiText('删除', 'Delete')}
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
