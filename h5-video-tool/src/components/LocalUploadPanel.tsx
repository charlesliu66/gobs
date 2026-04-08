import { useState, useCallback, useRef, useEffect } from 'react';
import { listUploadedFiles, deleteUploadedFile, resolveUploadUrl, type UploadedFile } from '../api/localUpload';

/** 后端配置的最大上传文件大小（500 MB） */
const MAX_FILE_SIZE_MB = 500;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface Props {
  onSelect?: (file: UploadedFile) => void;
}

export function LocalUploadPanel({ onSelect }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState<{ name: string; progress: number }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 加载已有文件列表
  const loadFiles = useCallback(async () => {
    try {
      const { items } = await listUploadedFiles();
      setFiles(items);
      setLoaded(true);
    } catch { /* ignore */ }
  }, []);

  // 组件挂载时加载
  useEffect(() => { void loadFiles(); }, [loadFiles]);

  // 上传文件（XMLHttpRequest 获取进度）
  const uploadFile = useCallback((file: File) => {
    // 客户端文件大小预检
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSizeError(`文件「${file.name}」超出大小限制（${(file.size / 1024 / 1024).toFixed(1)} MB > ${MAX_FILE_SIZE_MB} MB），请压缩后再上传`);
      return;
    }
    setSizeError(null);
    setUploading((prev) => [...prev, { name: file.name, progress: 0 }]);
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
    xhr.open('POST', `${BASE}/api/upload/local`);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      setUploading((prev) => prev.map((u) => u.name === file.name ? { ...u, progress: pct } : u));
    };

    xhr.onload = () => {
      setUploading((prev) => prev.filter((u) => u.name !== file.name));
      if (xhr.status < 300) {
        const result = JSON.parse(xhr.responseText) as UploadedFile;
        setFiles((prev) => [{ ...result, url: resolveUploadUrl(result.url) }, ...prev]);
      }
    };

    xhr.onerror = () => {
      setUploading((prev) => prev.filter((u) => u.name !== file.name));
    };

    xhr.send(formData);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setSizeError(null);
    Array.from(e.dataTransfer.files).forEach(uploadFile);
  }, [uploadFile]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteUploadedFile(id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return (
    <div className="space-y-4">
      {/* 上传区 */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-hover)] transition-all cursor-pointer"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-muted)]">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--color-text)]">拖拽文件到这里，或点击选择</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">支持 JPG / PNG / WebP / MP4 / MOV / WebM</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">单文件最大 <strong>{MAX_FILE_SIZE_MB} MB</strong></p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={(e) => {
            setSizeError(null);
            Array.from(e.target.files ?? []).forEach(uploadFile);
          }}
        />
      </div>

      {/* 文件大小超限提示 */}
      {sizeError && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {sizeError}
        </div>
      )}

      {/* 上传进度 */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((u) => (
            <div key={u.name} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-surface-elevated)]">
              <div className="flex-1">
                <p className="text-xs text-[var(--color-text)] truncate">{u.name}</p>
                <div className="mt-1 h-1.5 rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">{u.progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* 文件列表 */}
      {!loaded ? (
        <p className="text-xs text-[var(--color-text-muted)] text-center py-4">加载中…</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)] text-center py-4">暂无上传文件</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {files.map((f) => (
            <div key={f.id} className="group relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] overflow-hidden">
              {/* 缩略图 */}
              <div className="aspect-video bg-[var(--color-surface-hover)] flex items-center justify-center overflow-hidden">
                {f.kind === 'image' ? (
                  <img src={resolveUploadUrl(f.url)} alt={f.originalName} className="w-full h-full object-cover" />
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-muted)]">
                    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                )}
              </div>
              {/* 文件名 */}
              <div className="p-2">
                <p className="text-[10px] text-[var(--color-text-muted)] truncate">{f.originalName}</p>
              </div>
              {/* 悬浮操作 */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {onSelect && (
                  <button
                    type="button"
                    onClick={() => onSelect(f)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
                  >
                    使用
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleDelete(f.id)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


interface Props {
  onSelect?: (file: UploadedFile) => void;
}
