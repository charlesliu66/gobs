import { useState, useCallback, useEffect } from 'react';
import {
  listCharacterLibrary,
  getCharacterFromLibrary,
  deleteCharacterFromLibrary,
  shareCharacter,
  type LibraryCharacterSummary,
  type LibraryCharacter,
} from '../api/characterLibrary';
import { toast } from './Toast';

interface Props {
  /** 点击「使用到项目」时的回调 */
  onImportToProject?: (char: LibraryCharacter) => void;
}

export function CharacterLibraryPanel({ onImportToProject }: Props) {
  const [chars, setChars] = useState<LibraryCharacterSummary[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LibraryCharacter | null>(null);
  const [shareInfo, setShareInfo] = useState<{ url: string; expiresAt: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const { characters } = await listCharacterLibrary();
      setChars(characters);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadList(); }, [loadList]);

  const handleSelect = useCallback(async (id: string) => {
    try {
      const char = await getCharacterFromLibrary(id);
      setSelected(char);
      setShareInfo(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '加载失败');
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      return;
    }
    setDeleteConfirmId(null);
    await deleteCharacterFromLibrary(id);
    setChars((prev) => prev.filter((c) => c.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success('角色已删除');
  }, [selected, deleteConfirmId]);

  const handleShare = useCallback(async (id: string) => {
    try {
      const info = await shareCharacter(id);
      setShareInfo({ url: info.shareUrl, expiresAt: info.expiresAt });
    } catch (e) {
      setErr(e instanceof Error ? e.message : '生成分享链接失败');
    }
  }, []);

  return (
    <div className="flex gap-4 h-full">
      {/* 左侧列表 */}
      <div className="w-56 flex-shrink-0 space-y-2 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">形象库</h3>
          <button type="button" onClick={loadList} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]">刷新</button>
        </div>
        {loading ? (
          <p className="text-xs text-[var(--color-text-muted)]">加载中…</p>
        ) : chars.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-[var(--color-text-muted)]">暂无角色</p>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-3 text-[10px] text-[var(--color-text-muted)] leading-relaxed">
              💡 在<strong className="text-[var(--color-text)]">高级制片</strong>的角色卡里，点击「保存到形象库」可将角色及所有状态保存到这里，方便跨项目复用。
            </div>
          </div>
        ) : chars.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => void handleSelect(c.id)}
            className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
              selected?.id === c.id
                ? 'bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40'
                : 'hover:bg-[var(--color-surface-hover)] border border-transparent'
            }`}
          >
            {c.baseImageDataUrl ? (
              <img src={c.baseImageDataUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-hover)] flex items-center justify-center flex-shrink-0 text-[var(--color-text-muted)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--color-text)] truncate">{c.name}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">{c.stateCount} 个状态</p>
            </div>
          </button>
        ))}
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 min-w-0">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-sm text-[var(--color-text-muted)]">
            选择一个角色查看详情
          </div>
        ) : (
          <div className="space-y-4">
            {err && <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">{err}</div>}

            {/* 操作栏 */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[var(--color-text)]">{selected.name}</h3>
                {selected.sourceProject && (
                  <p className="text-xs text-[var(--color-text-muted)]">来自：{selected.sourceProject}</p>
                )}
              </div>
              <div className="flex gap-2">
                {onImportToProject && (
                  <button
                    type="button"
                    onClick={() => onImportToProject(selected)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
                  >
                    使用到当前项目
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleShare(selected.id)}
                  className="px-3 py-1.5 rounded-lg text-xs border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  分享
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(selected.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                    deleteConfirmId === selected.id
                      ? 'border-red-500/60 bg-red-500/15 text-red-400'
                      : 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                  }`}
                >
                  {deleteConfirmId === selected.id ? '再次点击确认删除' : '删除'}
                </button>
              </div>
            </div>

            {/* 分享链接 */}
            {shareInfo && (
              <div className="rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-3">
                <p className="text-xs font-medium text-[var(--color-primary)] mb-1">分享链接（7天有效）</p>
                <div className="flex items-center gap-2">
                  <input readOnly value={shareInfo.url} className="flex-1 text-xs bg-transparent text-[var(--color-text-muted)] truncate" />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(shareInfo.url)}
                    className="text-xs text-[var(--color-primary)] hover:underline flex-shrink-0"
                  >
                    复制
                  </button>
                </div>
              </div>
            )}

            {/* 基础形象 */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
              {selected.baseImageDataUrl ? (
                <img src={selected.baseImageDataUrl} alt="基础形象" className="w-16 h-16 rounded-lg object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-[var(--color-surface-hover)] flex items-center justify-center text-[var(--color-text-muted)]">无</div>
              )}
              <div>
                <p className="text-xs font-medium text-[var(--color-text)]">基础形象</p>
                {selected.baseConfirmed && <p className="text-[10px] text-[var(--color-success)] mt-0.5">✓ 已确认</p>}
              </div>
            </div>

            {/* 状态衣橱 */}
            {selected.states?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[var(--color-text)] mb-2">状态衣橱</p>
                <div className="flex flex-wrap gap-3">
                  {selected.states.map((s) => (
                    <div key={s.id} className="flex flex-col items-center gap-1 w-16">
                      <div className="w-16 h-16 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] overflow-hidden">
                        {s.imageDataUrl ? (
                          <img src={s.imageDataUrl} alt={s.label} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--color-text-subtle)]">?</div>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--color-text-muted)] text-center">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
