import { useCallback, useRef, useState } from 'react';
import type { DreaminaMultimodalItem } from '../context/CreateFlowContext';
import { AssetPicker } from './AssetPicker';
import { buildAssetFileUrl, recordUsage } from '../api/assetLibraryApi';
import type { LibraryAsset } from '../api/assetLibraryApi';
import {
  getSeedanceAcceptString,
  inferSeedanceMediaKind,
  isSeedanceReferenceFileSupported,
  validateSeedanceReferenceSet,
} from '../config/seedanceSourceConstraints';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = typeof r.result === 'string' ? r.result : '';
      const b64 = s.includes(',') ? s.split(',')[1] ?? '' : s;
      resolve(b64);
    };
    r.onerror = () => reject(new Error('读取文件失败'));
    r.readAsDataURL(file);
  });
}

function labelForItem(
  kind: 'image' | 'video' | 'audio',
  indexAmongKind: number,
): { tag: string; hint: string } {
  if (kind === 'image') return { tag: `图${indexAmongKind + 1}`, hint: '@图片' + (indexAmongKind + 1) };
  if (kind === 'video') return { tag: `视频${indexAmongKind + 1}`, hint: '@视频' + (indexAmongKind + 1) };
  return { tag: `音${indexAmongKind + 1}`, hint: '@音频' + (indexAmongKind + 1) };
}

export interface DreaminaMultimodalRefsProps {
  items: DreaminaMultimodalItem[];
  onChange: (items: DreaminaMultimodalItem[]) => void;
}

/**
 * 全能参考：上传图/视频/音频，顺序与 @图片1、@视频1、@音频1 对应（各类型独立编号）。
 */
export function DreaminaMultimodalRefs({ items, onChange }: DreaminaMultimodalRefsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const imageCount = items.filter((x) => x.kind === 'image').length;
  const videoCount = items.filter((x) => x.kind === 'video').length;
  const audioCount = items.filter((x) => x.kind === 'audio').length;

  const addFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) return;
      const next = [...items];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const kind = inferSeedanceMediaKind(file);
        if (!kind || !isSeedanceReferenceFileSupported(file, kind)) continue;
        const validation = validateSeedanceReferenceSet([...next.map((x) => ({ kind: x.kind })), { kind }]);
        if (!validation.ok) continue;
        const base64 = await fileToBase64(file);
        next.push({
          id: `${Date.now()}_${i}_${file.name}`,
          kind,
          base64,
          mimeType: file.type || (kind === 'image' ? 'image/png' : kind === 'video' ? 'video/mp4' : 'audio/mpeg'),
          fileName: file.name,
          semanticRole: undefined,
        });
      }
      onChange(next);
    },
    [items, onChange],
  );

  const handleLibrarySelect = useCallback(
    async (assets: LibraryAsset[]) => {
      const next = [...items];
      for (const asset of assets) {
        const mime = asset.mimetype ?? asset.mime_type ?? '';
        const kind = inferSeedanceMediaKind({ filename: asset.filename, mimeType: mime });
        if (!kind || !isSeedanceReferenceFileSupported({ filename: asset.filename, mimeType: mime }, kind)) continue;
        const validation = validateSeedanceReferenceSet([...next.map((x) => ({ kind: x.kind })), { kind }]);
        if (!validation.ok) continue;
        try {
          const url = asset.file_url ?? buildAssetFileUrl(asset.id);
          const resp = await fetch(url);
          const blob = await resp.blob();
          const base64 = await new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onloadend = () => {
              const s = typeof r.result === 'string' ? r.result : '';
              resolve(s.includes(',') ? s.split(',')[1] ?? '' : s);
            };
            r.readAsDataURL(blob);
          });
          next.push({
            id: `lib-${asset.id}-${Date.now()}`,
            kind,
            base64,
            mimeType: blob.type || mime,
            fileName: asset.filename,
          });
          void recordUsage(asset.id, 'multimodal-ref');
        } catch { /* skip failed asset */ }
      }
      onChange(next);
      setPickerOpen(false);
    },
    [items, onChange],
  );

  const remove = (id: string) => {
    onChange(items.filter((x) => x.id !== id));
  };

  const markRole = (id: string, role: 'role' | 'scene') => {
    onChange(
      items.map((x) => {
        if (x.kind !== 'image') return x;
        if (x.id === id) return { ...x, semanticRole: role };
        if (x.semanticRole === role) return { ...x, semanticRole: undefined };
        return x;
      }),
    );
  };

  const imageIdx = (() => {
    let n = 0;
    return items.map((it) => {
      if (it.kind !== 'image') return -1;
      const idx = n;
      n += 1;
      return idx;
    });
  })();
  const videoIdx = (() => {
    let n = 0;
    return items.map((it) => {
      if (it.kind !== 'video') return -1;
      const idx = n;
      n += 1;
      return idx;
    });
  })();
  const audioIdx = (() => {
    let n = 0;
    return items.map((it) => {
      if (it.kind !== 'audio') return -1;
      const idx = n;
      n += 1;
      return idx;
    });
  })();

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2">
      <p className="text-sm font-medium text-[var(--color-text)]">全能参考素材</p>
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
        可选补充参考：图最多 9、视频最多 3、音频最多 3，总数最多 12。音频不能单独生成。在上方「故事/分镜」里用&nbsp;
        <strong>@图片1</strong>、<strong>@视频1</strong>、<strong>@音频1</strong>
        等引用。
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={[getSeedanceAcceptString('image'), getSeedanceAcceptString('video'), getSeedanceAcceptString('audio')].join(',')}
        multiple
        className="hidden"
        onChange={(e) => void addFiles(e.target.files)}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
        >
          上传文件…
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="text-sm px-3 py-1.5 rounded-lg border border-[var(--color-primary)]/50 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
        >
          从素材库选择
        </button>
      </div>
      {pickerOpen && (
        <AssetPicker
          onSelect={(assets) => void handleLibrarySelect(assets)}
          onClose={() => setPickerOpen(false)}
        />
      )}
      <p className="text-xs text-[var(--color-text-muted)]">
        当前：图 {imageCount}/9 · 视频 {videoCount}/3 · 音频 {audioCount}/3 · 共 {items.length}/12
      </p>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((it, i) => {
            let idx = 0;
            let tag = '';
            let hint = '';
            if (it.kind === 'image') {
              idx = imageIdx[i];
              ({ tag, hint } = labelForItem('image', idx));
            } else if (it.kind === 'video') {
              idx = videoIdx[i];
              ({ tag, hint } = labelForItem('video', idx));
            } else {
              idx = audioIdx[i];
              ({ tag, hint } = labelForItem('audio', idx));
            }
            return (
              <li
                key={it.id}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text)]"
                title={`文案中用 ${hint}`}
              >
                <span className="text-[var(--color-primary)]">{tag}</span>
                <span className="truncate max-w-[120px]">{it.fileName ?? it.kind}</span>
                {it.kind === 'image' && (
                  <>
                    <button
                      type="button"
                      className={`px-1.5 py-0.5 rounded border ${
                        it.semanticRole === 'role'
                          ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                          : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                      }`}
                      onClick={() => markRole(it.id, 'role')}
                      title="设为主角参考"
                    >
                      主角
                    </button>
                    <button
                      type="button"
                      className={`px-1.5 py-0.5 rounded border ${
                        it.semanticRole === 'scene'
                          ? 'border-[var(--color-success)] text-[var(--color-success)]'
                          : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                      }`}
                      onClick={() => markRole(it.id, 'scene')}
                      title="设为场景参考"
                    >
                      场景
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="text-[var(--color-error)] hover:underline"
                  onClick={() => remove(it.id)}
                  aria-label="移除"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
