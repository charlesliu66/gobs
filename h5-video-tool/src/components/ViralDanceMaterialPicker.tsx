import { useCallback, useEffect, useState } from 'react';
import type { DriveFile } from '../hooks/useGoogleDrive';
import { AuthThumbnail } from './AuthThumbnail';

type FolderCrumb = { id: string; name: string };

export interface CharacterLibraryItem {
  id: string;
  name: string;
  imageUrl: string;
}

interface ViralDanceMaterialPickerProps {
  accessToken: string | null;
  verifiedFolderId: string;
  verifiedFolderName: string | null;
  /** 从素材库根目录下列出子文件夹与文件 */
  listFolder: (folderId: string) => Promise<{ folders: DriveFile[]; files: DriveFile[] }>;
  selectedOrder: DriveFile[];
  setSelectedOrder: (v: DriveFile[] | ((prev: DriveFile[]) => DriveFile[])) => void;
  onLogin: () => void;
  /** 加载服化道形象库（可选）；返回有图的角色列表 */
  onLoadCharacterLibrary?: () => Promise<CharacterLibraryItem[]>;
  /** 选中形象库角色后的回调（imageUrl, name） */
  onCharacterSelected?: (imageUrl: string, name: string) => void;
}

/**
 * Viral 舞蹈：固定 @图片1（角色）与 @图片2（场景），支持在已验证 Drive 根下进入子文件夹手动勾选，
 * 以及从服化道形象库直接选角色。
 */
export function ViralDanceMaterialPicker({
  accessToken,
  verifiedFolderId,
  verifiedFolderName,
  listFolder,
  selectedOrder,
  setSelectedOrder,
  onLogin,
  onLoadCharacterLibrary,
  onCharacterSelected,
}: ViralDanceMaterialPickerProps) {
  const [slot1, setSlot1] = useState<DriveFile | null>(() => selectedOrder[0] ?? null);
  const [slot2, setSlot2] = useState<DriveFile | null>(() => selectedOrder[1] ?? null);

  const pushSlotsToParent = useCallback(
    (s1: DriveFile | null, s2: DriveFile | null) => {
      const next: DriveFile[] = [];
      if (s1) next.push(s1);
      if (s2) next.push(s2);
      setSelectedOrder(next);
    },
    [setSelectedOrder],
  );

  const [folderStack, setFolderStack] = useState<FolderCrumb[]>([]);
  const currentFolderId = folderStack.length ? folderStack[folderStack.length - 1].id : verifiedFolderId;

  const [folders, setFolders] = useState<DriveFile[]>([]);
  const [filesInFolder, setFilesInFolder] = useState<DriveFile[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);

  const [activeSlot, setActiveSlot] = useState<1 | 2 | null>(null);

  // 形象库
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [libraryChars, setLibraryChars] = useState<CharacterLibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  const loadCurrent = useCallback(async () => {
    if (!accessToken) return;
    setBrowseLoading(true);
    try {
      const { folders: fd, files: fl } = await listFolder(currentFolderId);
      setFolders(fd);
      setFilesInFolder(fl.filter((f) => (f.mimeType || '').startsWith('image/')));
    } finally {
      setBrowseLoading(false);
    }
  }, [accessToken, listFolder, currentFolderId]);

  useEffect(() => {
    void loadCurrent();
  }, [loadCurrent]);

  const enterFolder = useCallback((f: DriveFile) => {
    setFolderStack((s) => [...s, { id: f.id, name: f.name }]);
    setActiveSlot(null);
  }, []);

  const goUp = useCallback(() => {
    setFolderStack((s) => s.slice(0, -1));
    setActiveSlot(null);
  }, []);

  const goRoot = useCallback(() => {
    setFolderStack([]);
    setActiveSlot(null);
  }, []);

  const pickImage = useCallback(
    (file: DriveFile) => {
      if (activeSlot === 1) {
        setSlot1(file);
        pushSlotsToParent(file, slot2);
        setActiveSlot(null);
      } else if (activeSlot === 2 && slot1) {
        setSlot2(file);
        pushSlotsToParent(slot1, file);
        setActiveSlot(null);
      }
    },
    [activeSlot, slot1, slot2, pushSlotsToParent],
  );

  const clearSlot = useCallback(
    (which: 1 | 2) => {
      if (which === 1) {
        setSlot1(null);
        setSlot2(null);
        pushSlotsToParent(null, null);
      } else {
        setSlot2(null);
        pushSlotsToParent(slot1, null);
      }
    },
    [slot1, pushSlotsToParent],
  );

  /** 从形象库选角色作为 @图片1 */
  const handleLibrarySelect = useCallback(
    (char: CharacterLibraryItem) => {
      // 用一个虚拟 DriveFile（id 用形象库 id，name 用角色名，mimeType 标记为 image/jpeg）
      const virtualFile: DriveFile = {
        id: `lib:${char.id}`,
        name: char.name,
        mimeType: 'image/jpeg',
      };
      setSlot1(virtualFile);
      pushSlotsToParent(virtualFile, slot2);
      setShowLibraryPicker(false);
      setActiveSlot(null);
      // 通知父组件执行 fetch → base64 → multimodalItems[0]
      onCharacterSelected?.(char.imageUrl, char.name);
    },
    [slot2, pushSlotsToParent, onCharacterSelected],
  );

  if (!accessToken) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">连接 Google Drive 后，可在下方按文件夹浏览并指定 @图片1 / @图片2</p>
        <button
          type="button"
          onClick={onLogin}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text)] w-fit"
        >
          连接 Google Drive
        </button>
      </div>
    );
  }

  const breadcrumb =
    (verifiedFolderName || '素材库') +
    folderStack.map((c) => ` / ${c.name}`).join('');

  const pickingHint =
    activeSlot === 1
      ? '请在下图中点击一张图，设为「@图片1 · 角色」'
      : activeSlot === 2
        ? '请在下图中点击一张图，设为「@图片2 · 场景」'
        : null;

  return (
    <div className="space-y-4">
      {/* 固定槽位：与 prompt 中 @图片1 / @图片2 一一对应 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border-2 border-[var(--color-primary)]/35 bg-[var(--color-primary)]/5 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[var(--color-primary)]">@图片1</p>
              <p className="text-xs text-[var(--color-text-muted)]">角色参考（必填）</p>
            </div>
            <div className="flex items-center gap-1.5">
              {onLoadCharacterLibrary && (
                <button
                  type="button"
                  onClick={async () => {
                    setShowLibraryPicker((v) => !v);
                    if (!showLibraryPicker && libraryChars.length === 0) {
                      setLibraryLoading(true);
                      try {
                        const lib = await onLoadCharacterLibrary();
                        setLibraryChars(lib);
                      } finally {
                        setLibraryLoading(false);
                      }
                    }
                  }}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    showLibraryPicker
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  📚 形象库
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowLibraryPicker(false);
                  setActiveSlot(activeSlot === 1 ? null : 1);
                }}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeSlot === 1
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                {activeSlot === 1 ? '取消选择' : '从下方选择'}
              </button>
            </div>
          </div>

          {/* 形象库内联选择面板 */}
          {showLibraryPicker && (
            <div className="rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-surface)] p-2 space-y-2">
              <p className="text-xs font-medium text-[var(--color-text-muted)]">
                点击角色图，设为 @图片1
              </p>
              {libraryLoading ? (
                <p className="text-xs text-[var(--color-text-muted)]">加载中…</p>
              ) : libraryChars.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">形象库暂无有图的角色</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {libraryChars.map((char) => (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => handleLibrarySelect(char)}
                      className="flex flex-col items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-primary)] p-1 transition-colors"
                    >
                      <img
                        src={char.imageUrl}
                        alt={char.name}
                        className="w-full aspect-square object-cover rounded"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="text-[10px] text-[var(--color-text-muted)] truncate w-full text-center">
                        {char.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <SlotPreview
            file={slot1}
            accessToken={slot1?.id.startsWith('lib:') ? null : accessToken}
            libraryImageUrl={slot1?.id.startsWith('lib:') ? libraryChars.find((c) => `lib:${c.id}` === slot1.id)?.imageUrl : undefined}
            onClear={() => {
              clearSlot(1);
              setShowLibraryPicker(false);
            }}
            emptyHint="点击「📚 形象库」或「从下方选择」选角色图"
          />
        </div>

        <div
          className={`rounded-xl border-2 p-3 space-y-2 ${
            slot1
              ? 'border-[var(--color-border)] bg-[var(--color-surface)]'
              : 'border-[var(--color-border)] border-dashed bg-[var(--color-surface)] opacity-70'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">@图片2</p>
              <p className="text-xs text-[var(--color-text-muted)]">场景参考（可选）</p>
            </div>
            <button
              type="button"
              disabled={!slot1}
              onClick={() => slot1 && setActiveSlot(activeSlot === 2 ? null : 2)}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                activeSlot === 2
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              {activeSlot === 2 ? '取消选择' : '从下方选择'}
            </button>
          </div>
          {!slot1 && (
            <p className="text-xs text-[var(--color-text-muted)]">请先完成 @图片1，再选择场景图。</p>
          )}
          <SlotPreview
            file={slot2}
            accessToken={accessToken}
            onClear={() => clearSlot(2)}
            emptyHint={slot1 ? '可选：点击「从下方选择」' : '—'}
          />
        </div>
      </div>

      {/* 文件夹浏览 */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--color-text-muted)]">当前位置：</span>
          <span className="text-[var(--color-text)] font-mono break-all">{breadcrumb}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={goRoot}
            className="px-2 py-1 text-xs rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
          >
            回到素材根目录
          </button>
          {folderStack.length > 0 && (
            <button
              type="button"
              onClick={goUp}
              className="px-2 py-1 text-xs rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
            >
              ↑ 上级文件夹
            </button>
          )}
        </div>

        {pickingHint && (
          <p className="text-sm font-medium text-[var(--color-primary)]">{pickingHint}</p>
        )}

        {browseLoading ? (
          <p className="text-sm text-[var(--color-text-muted)]">加载中…</p>
        ) : (
          <>
            {folders.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--color-text-muted)]">子文件夹（点击进入）</p>
                <div className="flex flex-wrap gap-2">
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => enterFolder(f)}
                      className="px-3 py-1.5 rounded-lg text-xs border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-primary)]/50 text-left max-w-full truncate"
                    >
                      📁 {f.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filesInFolder.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--color-text-muted)]">图片（点击选中到当前槽位）</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto">
                  {filesInFolder.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      disabled={!activeSlot}
                      onClick={() => pickImage(f)}
                      className={`relative aspect-square rounded-lg border-2 overflow-hidden transition text-left ${
                        activeSlot
                          ? 'border-[var(--color-border)] hover:border-[var(--color-primary)] cursor-pointer'
                          : 'border-[var(--color-border)] opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <AuthThumbnail
                        fileId={f.id}
                        accessToken={accessToken}
                        name={f.name}
                        mimeType={f.mimeType}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] truncate px-0.5">
                        {f.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              !browseLoading &&
              folders.length === 0 && (
                <p className="text-sm text-[var(--color-text-muted)]">当前文件夹内暂无图片，请进入子文件夹或换目录。</p>
              )
            )}
          </>
        )}
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">
        提交生成时：第一张参考图对应 prompt 中的 <strong className="text-[var(--color-text)]">【图片1】</strong>，第二张对应{' '}
        <strong className="text-[var(--color-text)]">【图片2】</strong>。
      </p>
    </div>
  );
}

function SlotPreview({
  file,
  accessToken,
  libraryImageUrl,
  onClear,
  emptyHint,
}: {
  file: DriveFile | null;
  accessToken: string | null;
  /** 若选自形象库，直接用 URL 渲染而不走 AuthThumbnail */
  libraryImageUrl?: string;
  onClear: () => void;
  emptyHint: string;
}) {
  return (
    <div className="relative aspect-video max-h-56 rounded-lg border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface-elevated)]">
      {file ? (
        <>
          {libraryImageUrl ? (
            <img
              src={libraryImageUrl}
              alt={file.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <AuthThumbnail
              fileId={file.id}
              accessToken={accessToken}
              name={file.name}
              mimeType={file.mimeType}
              className="w-full h-full object-contain"
            />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center hover:bg-[var(--color-error)]"
            aria-label="清除"
          >
            ×
          </button>
          <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs truncate px-2 py-1">{file.name}</span>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--color-text-muted)] px-2 text-center">
          {emptyHint}
        </div>
      )}
    </div>
  );
}
