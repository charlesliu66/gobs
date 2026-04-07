import { useCallback, useRef } from 'react';
import type { DreaminaMultimodalItem } from '../context/CreateFlowContext';

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

function kindFromFile(file: File): 'image' | 'video' | 'audio' | null {
  const t = file.type || '';
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  return null;
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

  const imageCount = items.filter((x) => x.kind === 'image').length;
  const videoCount = items.filter((x) => x.kind === 'video').length;
  const audioCount = items.filter((x) => x.kind === 'audio').length;

  const addFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) return;
      const next = [...items];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const kind = kindFromFile(file);
        if (!kind) continue;
        const ic = next.filter((x) => x.kind === 'image').length;
        const vc = next.filter((x) => x.kind === 'video').length;
        const ac = next.filter((x) => x.kind === 'audio').length;
        if (kind === 'image' && ic >= 9) continue;
        if (kind === 'video' && vc >= 3) continue;
        if (kind === 'audio' && ac >= 3) continue;
        if (next.length >= 12) break;
        const base64 = await fileToBase64(file);
        next.push({
          id: `${Date.now()}_${i}_${file.name}`,
          kind,
          base64,
          mimeType: file.type || (kind === 'image' ? 'image/png' : kind === 'video' ? 'video/mp4' : 'audio/mpeg'),
          fileName: file.name,
        });
      }
      onChange(next);
    },
    [items, onChange],
  );

  const remove = (id: string) => {
    onChange(items.filter((x) => x.id !== id));
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
        支持 1–12 个素材（图最多 9、视频最多 3、音频最多 3）。在上方「故事/分镜」里用&nbsp;
        <strong>@图片1</strong>、<strong>@视频1</strong>、<strong>@音频1</strong>
        等引用，编号按下方各类型上传顺序分别计数（与即梦 Seedance 全能参考一致）。
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
        onChange={(e) => void addFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
      >
        添加参考文件…
      </button>
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
