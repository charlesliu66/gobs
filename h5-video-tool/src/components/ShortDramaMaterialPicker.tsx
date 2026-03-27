import { useCallback, useState } from 'react';
import type { DriveFile } from '../hooks/useGoogleDrive';
import { AuthThumbnail } from './AuthThumbnail';

const PLACEHOLDER_PREFIX = 'empty-';

function isPlaceholder(f: DriveFile): boolean {
  return f.id.startsWith(PLACEHOLDER_PREFIX);
}

function createPlaceholder(index: number): DriveFile {
  return { id: `${PLACEHOLDER_PREFIX}${index}`, name: '未选择', mimeType: 'image/placeholder' };
}

interface ShortDramaMaterialPickerProps {
  characters: string[];
  selectedOrder: DriveFile[];
  setSelectedOrder: (v: DriveFile[] | ((prev: DriveFile[]) => DriveFile[])) => void;
  accessToken: string | null;
  verifiedFolderId: string | null | undefined;
  verifiedFolderName?: string | null;
  /** 浏览素材：加载文件夹内图片（含子文件夹） */
  files: DriveFile[];
  filesLoading: boolean;
  onBrowseFiles: () => void;
  onLogin: () => void;
}

/** 短剧模式：人物图必填 + 参考场景可选，从素材库选择 */
export function ShortDramaMaterialPicker({
  characters,
  selectedOrder,
  setSelectedOrder,
  accessToken,
  verifiedFolderId,
  verifiedFolderName,
  files,
  filesLoading,
  onBrowseFiles,
  onLogin,
}: ShortDramaMaterialPickerProps) {
  const [activeSlot, setActiveSlot] = useState<number | 'scene' | null>(null);
  const imageFiles = files.filter((f) => (f.mimeType || '').startsWith('image/'));

  /** 从 selectedOrder 解析：前 N 个为人物槽（可含 placeholder），其余为场景 */
  const characterSlots = characters.map((_, i) => {
    const f = selectedOrder[i];
    return f && !isPlaceholder(f) ? f : null;
  });
  const sceneSlots = selectedOrder.slice(characters.length).filter((f) => !isPlaceholder(f));

  /** 同步到 selectedOrder：人物槽（空位用 placeholder）+ 场景 */
  const syncToSelectedOrder = useCallback(
    (charSlots: (DriveFile | null)[], scenes: DriveFile[]) => {
      const charPart = charSlots.map((f, i) => f ?? createPlaceholder(i));
      setSelectedOrder([...charPart, ...scenes]);
    },
    [setSelectedOrder]
  );

  const handleSelectForCharacter = useCallback(
    (slotIndex: number, file: DriveFile) => {
      const newCharSlots = [...characterSlots];
      newCharSlots[slotIndex] = file;
      syncToSelectedOrder(newCharSlots, sceneSlots);
      setActiveSlot(null);
    },
    [characterSlots, sceneSlots, syncToSelectedOrder]
  );

  const handleAddScene = useCallback(
    (file: DriveFile) => {
      syncToSelectedOrder(characterSlots, [...sceneSlots, file]);
      setActiveSlot(null);
    },
    [characterSlots, sceneSlots, syncToSelectedOrder]
  );

  const handleRemoveCharacter = useCallback(
    (slotIndex: number) => {
      const newCharSlots = [...characterSlots];
      newCharSlots[slotIndex] = null;
      syncToSelectedOrder(newCharSlots, sceneSlots);
    },
    [characterSlots, sceneSlots, syncToSelectedOrder]
  );

  const handleRemoveScene = useCallback(
    (file: DriveFile) => {
      syncToSelectedOrder(characterSlots, sceneSlots.filter((f) => f.id !== file.id));
    },
    [characterSlots, sceneSlots, syncToSelectedOrder]
  );

  if (!accessToken) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">
          连接 Google Drive 后，从素材库选择人物图片（必填）和参考场景（可选）
        </p>
        <button
          type="button"
          onClick={onLogin}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text)]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M7.635 10.909v2.619h4.335c-.175 1.032-.675 1.893-1.453 2.488a4.5 4.5 0 01-2.882.968 4.575 4.575 0 01-4.509-4.509 4.575 4.575 0 014.509-4.509c1.288 0 2.449.493 3.361 1.275l1.829-1.828a7.566 7.566 0 00-5.19-2.037 7.635 7.635 0 000 15.27 7.618 7.618 0 005.189-2.069 7.574 7.574 0 002.393-5.627h-7.577z" />
            <path fill="currentColor" d="M24 12.571c0-.214-.009-.428-.025-.639H12.75v2.694h6.32a2.89 2.89 0 01-1.27 1.9v1.604h2.048c1.198-1.104 1.89-2.73 1.89-4.659z" />
          </svg>
          连接 Google Drive
        </button>
      </div>
    );
  }

  if (!verifiedFolderId) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        请先在「素材管理」中设置 Drive 文件夹，再将人物图片放入该文件夹
      </p>
    );
  }

  const allCharactersFilled = characterSlots.every(Boolean);
  const pickingFor = activeSlot;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-muted)]">
        检测到 <strong className="text-[var(--color-text)]">{characters.length}</strong> 个人物，请为每个角色选择 1 张图片（必填）。可选：添加参考场景图。
      </p>

      {/* 人物槽 */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--color-text)]">人物图片（必填）</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {characters.map((name, i) => (
            <div key={i} className="space-y-1">
              <p className="text-xs text-[var(--color-text-muted)] truncate">
                人物{i + 1}（{name}）
              </p>
              <SlotCard
                file={characterSlots[i]}
                accessToken={accessToken}
                isActive={pickingFor === i}
                onSelect={() => setActiveSlot(i)}
                onClear={() => handleRemoveCharacter(i)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 参考场景（可选） */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--color-text)]">参考场景（可选）</p>
        <div className="flex flex-wrap gap-2 items-center">
          {sceneSlots.map((f) => (
            <div key={f.id} className="relative">
              <SlotCard
                file={f}
                accessToken={accessToken}
                isActive={false}
                onSelect={() => {}}
                onClear={() => handleRemoveScene(f)}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setActiveSlot('scene')}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/50 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
          >
            + 添加
          </button>
        </div>
      </div>

      {/* 浏览素材 */}
      <div className="pt-4 border-t border-[var(--color-border)]">
        <button
          type="button"
          onClick={onBrowseFiles}
          disabled={filesLoading}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {filesLoading ? '加载中…' : `浏览「${verifiedFolderName || '素材库'}」中的图片`}
        </button>

        {pickingFor !== null && imageFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-[var(--color-text-muted)]">
              {pickingFor === 'scene' ? '点击图片添加为参考场景' : `点击图片设为人物${pickingFor + 1}（${characters[pickingFor]}）`}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
              {imageFiles.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    if (pickingFor === 'scene') handleAddScene(f);
                    else handleSelectForCharacter(pickingFor, f);
                  }}
                  className="block w-full aspect-square rounded-lg border-2 border-[var(--color-border)] hover:border-[var(--color-primary)] overflow-hidden transition-colors"
                >
                  <AuthThumbnail
                    fileId={f.id}
                    accessToken={accessToken}
                    name={f.name}
                    mimeType={f.mimeType}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {pickingFor !== null && !filesLoading && imageFiles.length === 0 && (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            该文件夹内暂无图片，请将人物图片放入「{verifiedFolderName}」后重新浏览
          </p>
        )}
      </div>

      {allCharactersFilled && (
        <p className="text-sm text-[var(--color-success)]">
          已选 {characters.length} 个人物图
          {sceneSlots.length > 0 && ` + ${sceneSlots.length} 个参考场景`}，顺序映射 @图片1、@图片2…
        </p>
      )}
    </div>
  );
}

function SlotCard({
  file,
  accessToken,
  isActive,
  onSelect,
  onClear,
}: {
  file: DriveFile | null;
  accessToken: string | null;
  isActive: boolean;
  onSelect: () => void;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative block w-full aspect-square rounded-lg border-2 overflow-hidden transition text-left ${
        isActive ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30' : 'border-[var(--color-border)] hover:border-[var(--color-text-subtle)]'
      } ${!file ? 'bg-[var(--color-surface)]' : ''}`}
    >
      {file && !isPlaceholder(file) ? (
        <>
          <div className="absolute inset-0">
            <AuthThumbnail
              fileId={file.id}
              accessToken={accessToken}
              name={file.name}
              mimeType={file.mimeType}
              className="w-full h-full object-cover"
            />
          </div>
          <span
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-[var(--color-error)]"
          >
            ×
          </span>
        </>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-xs text-[var(--color-text-muted)]">
          点击选择
        </span>
      )}
    </button>
  );
}

/** 过滤 placeholder，供 StepVideo 调用 */
export function filterPlaceholders(order: DriveFile[]): DriveFile[] {
  return order.filter((f) => !isPlaceholder(f));
}
