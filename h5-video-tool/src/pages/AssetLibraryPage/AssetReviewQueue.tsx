/**
 * AssetReviewQueue — 待确认标签批量审核（分页版本）
 */
import { useState, useEffect, useCallback } from 'react';
import { getPendingTags, batchUpdateTags } from '../../api/assetLibraryApi';
import type { PendingTagItem } from '../../api/assetLibraryApi';
import { toast } from '../../components/Toast';

const PAGE_SIZE = 20;

export function AssetReviewQueue() {
  const [items, setItems] = useState<(PendingTagItem & { selected: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editMode, setEditMode] = useState<{ assetId: string; key: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const result = await getPendingTags(p, PAGE_SIZE);
      setItems(result.items.map((i) => ({ ...i, selected: false })));
      setTotal(result.total);
      setPage(result.page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(page); }, [page, load]);

  const allSelected = items.length > 0 && items.every((i) => i.selected);
  const selectedCount = items.filter((i) => i.selected).length;

  function toggleAll() {
    setItems((prev) => prev.map((i) => ({ ...i, selected: !allSelected })));
  }

  function toggleItem(idx: number) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item));
  }

  async function handleBatch(action: 'confirm' | 'reject') {
    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) { toast.error('请先勾选项目'); return; }
    setSubmitting(true);
    try {
      await batchUpdateTags(
        selected.map((i) => ({
          assetId: i.asset_id,
          key: i.tag.key,
          value: i.tag.value,
          status: action === 'confirm' ? 'confirmed' : 'rejected',
          action: 'upsert',
        }))
      );
      toast.success(`已${action === 'confirm' ? '确认' : '拒绝'} ${selected.length} 个标签`);
      await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
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
      await batchUpdateTags([{
        assetId: item.asset_id,
        key: item.tag.key,
        value: editValue.trim(),
        status: 'confirmed',
        action: 'upsert',
      }]);
      toast.success('已修改并确认');
      setEditMode(null);
      await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '修改失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSingleAction(item: PendingTagItem, action: 'confirm' | 'reject') {
    await batchUpdateTags([{
      assetId: item.asset_id,
      key: item.tag.key,
      value: item.tag.value,
      status: action === 'confirm' ? 'confirmed' : 'rejected',
      action: 'upsert',
    }]);
    toast.success(action === 'confirm' ? '已确认' : '已拒绝');
    await load(page);
  }

  if (loading) {
    return (
      <div className="py-10 text-center text-[var(--color-text-subtle)]">
        <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <p className="mt-2 text-sm">加载中…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-[var(--color-text)]">
          待确认标签
          {total > 0 && (
            <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({total} 项)</span>
          )}
        </h2>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            disabled={submitting || selectedCount === 0}
            onClick={() => handleBatch('confirm')}
            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-60 transition"
          >
            批量确认 {selectedCount > 0 ? `(${selectedCount})` : ''}
          </button>
          <button
            type="button"
            disabled={submitting || selectedCount === 0}
            onClick={() => handleBatch('reject')}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-60 transition"
          >
            批量拒绝 {selectedCount > 0 ? `(${selectedCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => void load(page)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
          >
            刷新
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">没有待确认项</h3>
          <p className="text-sm text-[var(--color-text-muted)]">所有标签已处理完毕</p>
        </div>
      ) : (
        <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          {/* 表头 */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="w-4 h-4 cursor-pointer accent-[var(--color-primary)]"
            />
            <span className="text-xs font-medium text-[var(--color-text-muted)] flex-1">素材</span>
            <span className="text-xs font-medium text-[var(--color-text-muted)] w-24">标签键</span>
            <span className="text-xs font-medium text-[var(--color-text-muted)] flex-1">标签值</span>
            <span className="text-xs font-medium text-[var(--color-text-muted)] w-28">来源</span>
            <span className="text-xs font-medium text-[var(--color-text-muted)] w-32 text-right">操作</span>
          </div>

          {/* 列表 */}
          <div className="divide-y divide-[var(--color-border)]">
            {items.map((item, idx) => {
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
                    onChange={() => toggleItem(idx)}
                    className="w-4 h-4 cursor-pointer accent-[var(--color-primary)]"
                  />
                  <span className="flex-1 text-sm text-[var(--color-text)] truncate" title={item.filename}>
                    {item.filename}
                  </span>
                  <span className="w-24 text-xs text-[var(--color-text-subtle)] truncate">{item.tag.key}</span>
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') void handleEditSubmit(item); }}
                          className="flex-1 bg-[var(--color-surface)] border border-[var(--color-primary)] rounded px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => void handleEditSubmit(item)}
                          disabled={submitting}
                          className="px-2 py-1 bg-[var(--color-primary)] text-white rounded text-xs disabled:opacity-60"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditMode(null)}
                          className="px-2 py-1 border border-[var(--color-border)] rounded text-xs text-[var(--color-text-muted)]"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-[var(--color-text)]">{item.tag.value}</span>
                    )}
                  </div>
                  <span className={`w-28 text-xs px-2 py-0.5 rounded-full text-center ${
                    item.tag.source === 'ai'
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'bg-green-500/15 text-green-400'
                  }`}>
                    {item.tag.source === 'ai' ? 'AI' : '人工'}
                    {item.tag.confidence < 1 ? ` ${Math.round(item.tag.confidence * 100)}%` : ''}
                  </span>
                  {!isEditing && (
                    <div className="w-32 flex justify-end gap-1">
                      <button
                        type="button"
                        title="确认"
                        onClick={() => void handleSingleAction(item, 'confirm')}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-500/15 text-green-500 hover:bg-green-500/30 transition text-sm"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        title="拒绝"
                        onClick={() => void handleSingleAction(item, 'reject')}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/15 text-red-500 hover:bg-red-500/30 transition text-sm"
                      >
                        ✗
                      </button>
                      <button
                        type="button"
                        title="修改"
                        onClick={() => handleEdit(item)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition text-sm"
                      >
                        ✎
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-muted)]">
                第 {page}/{totalPages} 页，共 {total} 项
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 text-xs border border-[var(--color-border)] rounded hover:bg-[var(--color-surface-hover)] disabled:opacity-40 transition"
                >
                  上一页
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 text-xs border border-[var(--color-border)] rounded hover:bg-[var(--color-surface-hover)] disabled:opacity-40 transition"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
