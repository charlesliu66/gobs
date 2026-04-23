import { useNavigate } from 'react-router-dom';

import { GalleryView } from '../components/GalleryView';
import { useLocale } from '../i18n/LocaleContext.tsx';

export function Gallery() {
  const navigate = useNavigate();
  const { t } = useLocale();

  return (
    <div className="min-h-screen">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <div className="max-w-6xl px-6 pt-5 pb-4">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[var(--color-text)]">{t('gallery.pageTitle')}</h1>
              <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{t('gallery.pageSubtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="mb-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              {t('gallery.batchHistoryCta')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl px-6 pt-6">
        <GalleryView />
      </div>
    </div>
  );
}
