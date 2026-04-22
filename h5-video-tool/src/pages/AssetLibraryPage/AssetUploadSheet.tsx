import { useEffect } from 'react';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { AssetImportPanel } from './AssetImportPanel';

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function AssetUploadSheet({ open, onClose, onComplete }: Props) {
  const { uiLocale } = useLocale();
  const text =
    uiLocale === 'en'
      ? { title: 'Upload Assets', close: 'Close' }
      : { title: '上传素材', close: '关闭' };

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[75vh] flex-col rounded-t-2xl border-t border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="flex shrink-0 justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-[var(--color-border)]" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-6 py-3">
          <h3 className="text-base font-bold text-[var(--color-text)]">{text.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xl leading-none text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            aria-label={text.close}
          >
            x
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-8">
          <AssetImportPanel onImportComplete={onComplete} />
        </div>
      </div>
    </>
  );
}
