import { useState, useEffect, useCallback } from 'react';
import { batchUpdateTags, getPendingTags } from '../../api/assetLibraryApi';
import type { PendingTagItem } from '../../api/assetLibraryApi';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { localizeAssetTagKey } from './localize.ts';
import { toast } from '../../components/Toast';

const PAGE_SIZE = 20;

export function AssetReviewQueue() {
  const { uiLocale } = useLocale();
  const isEnglish = uiLocale === 'en';
  const text = isEnglish
    ? {
        loadFailed: 'Load failed',
        selectFirst: 'Select at least one item first',
        confirmed: (count: number) => `Confirmed ${count} tags`,
        rejected: (count: number) => `Rejected ${count} tags`,
        actionFailed: 'Action failed',
        editSaved: 'Updated and confirmed',
        editFailed: 'Edit failed',
        singleConfirmed: 'Confirmed',
        singleRejected: 'Rejected',
        loading: 'Loading...',
        title: 'Pending Tags',
        batchConfirm: 'Confirm Selected',
        batchReject: 'Reject Selected',
        refresh: 'Refresh',
        emptyTitle: 'No pending tags',
        emptyHint: 'All AI tags have already been processed',
        asset: 'Asset',
        tagKey: 'Tag',
        tagValue: 'Value',
        source: 'Source',
        actions: 'Actions',
        save: 'Save',
        cancel: 'Cancel',
        manual: 'Manual',
        confirm: 'Confirm',
        reject: 'Reject',
        edit: 'Edit',
        pageSummary: (page: number, totalPages: number, total: number) => `Page ${page}/${totalPages}, ${total} total`,
        previous: 'Previous',
        next: 'Next',
      }
    : {
        loadFailed: '加载失败',
        selectFirst: '请先勾选至少一项',
        confirmed: (count: number) => `已确认 ${count} 个标签`,
        rejected: (count: number) => `已拒绝 ${count} 个标签`,
        actionFailed: '操作失败',
        editSaved: '已更新并确认',
        editFailed: '修改失败',
        singleConfirmed: '已确认',
        singleRejected: '已拒绝',
        loading: '加载中...',
        title: '待确认标签',
        batchConfirm: '批量确认',
        batchReject: '批量拒绝',
        refresh: '刷新',
        emptyTitle: '没有待确认标签',
        emptyHint: '所有 AI 标签都已经处理完毕',
        asset: '素材',
        tagKey: '标签键',
        tagValue: '标签值',
        source: '来源',
        actions: '操作',
        save: '保存',
        cancel: '取消',
        manual: '人工',
        confirm: '确认',
        reject: '拒绝',
        edit: '编辑',
        pageSummary: (page: number, totalPages: number, total: number) => `第 ${page}/${totalPages} 页，共 ${total} 条`,
        previous: '上一页',
        next: '下一页',
      };

  const [items, setItems] = useState<(PendingTagItem & { selected: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editMode, setEditMode] = useState<{ assetId: string; key: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(
    async (nextPage = page) => {
      setLoading(true);
      try {
        const result = await getPendingTags(nextPage, PAGE_SIZE);
        setItems(result.items.map((item) => ({ ...item, selected: false })));
        setTotal(result.total);
        setPage(result.page);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : text.loadFailed);
      } finally {
        setLoading(false);
      }
    },
    [page, text.loadFailed],
  );

  useEffect(() => {
    void load(page);
  }, [page, load]);

  const allSelected = items.length > 0 && items.every((item) => item.selected);
  const selectedCount = items.filter((item) => item.selected).length;

  function toggleAll() {
    setItems((previous) => previous.map((item) => ({ ...item, selected: !allSelected })));
  }

  function toggleItem(index: number) {
    setItems((previous) =>
      previous.map((item, current) => (current === index ? { ...item, selected: !item.selected } : item)),
    );
  }

  async function handleBatch(action: 'confirm' | 'reject') {
    const selected = items.filter((item) => item.selected);
    if (selected.length === 0) {
      toast.error(text.selectFirst);
      return;
    }

    setSubmitting(true);
    try {
      await batchUpdateTags(
        selected.map((item) => ({
          assetId: item.asset_id,
          key: item.tag.key,
          value: item.tag.value,
          status: action === 'confirm' ? 'confirmed' : 'rejected',
          action: 'upsert',
        })),
      );
      toast.success(action === 'confirm' ? text.confirmed(selected.length) : text.rejected(selected.length));
      await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : text.actionFailed);
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(item: PendingTagItem) {
    setEditMode({ assetId: item.asset_id, key: item.tag.key });
    setEditValue(item.tag.value);
  }

  async function handleEditSubmit(item: PendingTagItem) {
    if (!editValue.trim()) return;
    setSubmitting(true);
    try {
      await batchUpdateTags([
        {
          assetId: item.asset_id,
          key: item.tag.key,
          value: editValue.trim(),
          status: 'confirmed',
          action: 'upsert',
        },
      ]);
      toast.success(text.editSaved);
      setEditMode(null);
      await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : text.editFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSingleAction(item: PendingTagItem, action: 'confirm' | 'reject') {
    try {
      await batchUpdateTags([
        {
          assetId: item.asset_id,
          key: item.tag.key,
          value: item.tag.value,
          status: action === 'confirm' ? 'confirmed' : 'rejected',
          action: 'upsert',
        },
      ]);
      toast.success(action === 'confirm' ? text.singleConfirmed : text.singleRejected);
      await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : text.actionFailed);
    }
  }

  if (loading) {
    return (
      <div className="py-10 text-center text-[var(--color-text-subtle)]">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <p className="mt-2 text-sm">{text.loading}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-[var(--color-text)]">
          {text.title}
          {total > 0 && <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({total})</span>}
        </h2>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            disabled={submitting || selectedCount === 0}
            onClick={() => void handleBatch('confirm')}
            className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 disabled:opacity-60"
          >
            {text.batchConfirm} {selectedCount > 0 ? `(${selectedCount})` : ''}
          </button>
          <button
            type="button"
            disabled={submitting || selectedCount === 0}
            onClick={() => void handleBatch('reject')}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            {text.batchReject} {selectedCount > 0 ? `(${selectedCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => void load(page)}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
          >
            {text.refresh}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-20 text-center">
          <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">{text.emptyTitle}</h3>
          <p className="text-sm text-[var(--color-text-muted)]">{text.emptyHint}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]" />
            <span className="flex-1 text-xs font-medium text-[var(--color-text-muted)]">{text.asset}</span>
            <span className="w-24 text-xs font-medium text-[var(--color-text-muted)]">{text.tagKey}</span>
            <span className="flex-1 text-xs font-medium text-[var(--color-text-muted)]">{text.tagValue}</span>
            <span className="w-28 text-xs font-medium text-[var(--color-text-muted)]">{text.source}</span>
            <span className="w-32 text-right text-xs font-medium text-[var(--color-text-muted)]">{text.actions}</span>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {items.map((item, index) => {
              const isEditing = editMode?.assetId === item.asset_id && editMode?.key === item.tag.key;
              return (
                <div
                  key={`${item.asset_id}-${item.tag.key}-${item.tag.value}`}
                  className={`flex items-center gap-3 px-4 py-3 transition ${
                    item.selected ? 'bg-[var(--color-primary)]/6' : 'hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleItem(index)}
                    className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
                  />
                  <span className="flex-1 truncate text-sm text-[var(--color-text)]" title={item.filename}>
                    {item.filename}
                  </span>
                  <span className="w-24 truncate text-xs text-[var(--color-text-subtle)]">
                    {localizeAssetTagKey(uiLocale, item.tag.key)}
                  </span>
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(event) => setEditValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') void handleEditSubmit(item);
                          }}
                          className="flex-1 rounded border border-[var(--color-primary)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => void handleEditSubmit(item)}
                          disabled={submitting}
                          className="rounded bg-[var(--color-primary)] px-2 py-1 text-xs text-white disabled:opacity-60"
                        >
                          {text.save}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditMode(null)}
                          className="rounded border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-muted)]"
                        >
                          {text.cancel}
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-[var(--color-text)]">{item.tag.value}</span>
                    )}
                  </div>
                  <span
                    className={`w-28 rounded-full px-2 py-0.5 text-center text-xs ${
                      item.tag.source === 'ai' ? 'bg-blue-500/15 text-blue-400' : 'bg-green-500/15 text-green-400'
                    }`}
                  >
                    {item.tag.source === 'ai' ? 'AI' : text.manual}
                    {item.tag.confidence < 1 ? ` ${Math.round(item.tag.confidence * 100)}%` : ''}
                  </span>
                  {!isEditing && (
                    <div className="flex w-32 justify-end gap-1">
                      <button
                        type="button"
                        title={text.confirm}
                        onClick={() => void handleSingleAction(item, 'confirm')}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/15 text-xs text-green-500 transition hover:bg-green-500/30"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        title={text.reject}
                        onClick={() => void handleSingleAction(item, 'reject')}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/15 text-xs text-red-500 transition hover:bg-red-500/30"
                      >
                        X
                      </button>
                      <button
                        type="button"
                        title={text.edit}
                        onClick={() => handleEdit(item)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
              <span className="text-xs text-[var(--color-text-muted)]">{text.pageSummary(page, totalPages, total)}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="rounded border border-[var(--color-border)] px-3 py-1 text-xs transition hover:bg-[var(--color-surface-hover)] disabled:opacity-40"
                >
                  {text.previous}
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  className="rounded border border-[var(--color-border)] px-3 py-1 text-xs transition hover:bg-[var(--color-surface-hover)] disabled:opacity-40"
                >
                  {text.next}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
