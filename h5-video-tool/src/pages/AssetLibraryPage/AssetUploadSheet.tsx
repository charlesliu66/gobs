import { useEffect } from 'react';
import { AssetImportPanel } from './AssetImportPanel';

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function AssetUploadSheet({ open, onClose, onComplete }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] border-t border-[var(--color-border)] rounded-t-2xl shadow-2xl max-h-[75vh] flex flex-col">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-[var(--color-border)] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] shrink-0">
          <h3 className="text-base font-bold text-[var(--color-text)]">上传素材</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition text-xl leading-none"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 pb-8">
          <AssetImportPanel onImportComplete={onComplete} />
        </div>
      </div>
    </>
  );
}
