import * as React from 'react';

import type { LibraryAsset } from '../../api/assetLibraryApi';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import type { StructureTemplate } from '../productionTypes';

export function resolveStyleRefPickerPreviewUrl(
  asset: Pick<LibraryAsset, 'id'>,
  buildAssetFileUrl: (assetId: string) => string,
): string {
  return buildAssetFileUrl(asset.id);
}

export function StepInput({
  styleRefSummary,
  onStyleRefSummaryChange,
  aspectRatio,
  aspectOptions,
  onAspectRatioChange,
  storyGenre,
  onStoryGenreChange,
  busyStyle,
  onStyleRefFileChange,
  styleRefPreview,
  characterBible,
  onCharacterBibleChange,
  synopsis,
  onSynopsisChange,
  structureTemplate,
  templateOptions,
  onStructureTemplateChange,
  busyL1,
  onGenerateStoryArc,
}: {
  styleRefSummary: string;
  onStyleRefSummaryChange: (next: string) => void;
  aspectRatio: string;
  aspectOptions: readonly string[];
  onAspectRatioChange: (next: string) => void;
  storyGenre: string;
  onStoryGenreChange: (next: string) => void;
  busyStyle: boolean;
  onStyleRefFileChange: (file: File | null) => void;
  styleRefPreview: string | null;
  characterBible: string;
  onCharacterBibleChange: (next: string) => void;
  synopsis: string;
  onSynopsisChange: (next: string) => void;
  structureTemplate: StructureTemplate;
  templateOptions: readonly { value: StructureTemplate; label: string }[];
  onStructureTemplateChange: (next: StructureTemplate) => void;
  busyL1: boolean;
  onGenerateStoryArc: () => void | Promise<void>;
}) {
  const { useCallback, useState } = React;
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetPickerError, setAssetPickerError] = useState<string | null>(null);
  const [assetList, setAssetList] = useState<LibraryAsset[]>([]);
  const [selectingAssetId, setSelectingAssetId] = useState<string | null>(null);
  const { t } = useLocale();

  const getTemplateLabel = (value: StructureTemplate, fallback: string) => {
    switch (value) {
      case 'three_act':
        return t('productionWizard.templateThreeAct');
      case 'five_act':
        return t('productionWizard.templateFiveAct');
      case 'save_the_cat':
        return t('productionWizard.templateSaveTheCat');
      default:
        return fallback;
    }
  };

  const handleOpenAssetPicker = useCallback(async () => {
    setShowAssetPicker(true);
    setLoadingAssets(true);
    setAssetPickerError(null);
    try {
      const { listAssets } = await import('../../api/assetLibraryApi');
      const result = await listAssets({ type: 'image', pageSize: '100' });
      const images = result.assets.filter((asset) => {
        const mime = asset.mimetype ?? asset.mime_type ?? '';
        return mime.startsWith('image/');
      });
      setAssetList(images);
    } catch (error) {
      setAssetPickerError(
        error instanceof Error ? error.message : t('productionWizard.input.assetLibraryLoadFailed'),
      );
    } finally {
      setLoadingAssets(false);
    }
  }, [t]);

  const handleSelectAsset = useCallback(async (asset: LibraryAsset) => {
    setSelectingAssetId(asset.id);
    setAssetPickerError(null);
    try {
      const { buildAssetFileUrl, recordUsage } = await import('../../api/assetLibraryApi');
      const fileUrl = asset.file_url ?? buildAssetFileUrl(asset.id);
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(t('productionWizard.input.assetImageFetchFailed'));
      }
      const blob = await response.blob();
      const mime = blob.type || asset.mimetype || asset.mime_type || 'image/jpeg';
      if (!mime.startsWith('image/')) {
        throw new Error(t('productionWizard.input.imageOnlyStyleReference'));
      }
      const fallbackExt = mime.split('/')[1] || 'jpg';
      const filename = asset.filename?.trim() || `${asset.id}.${fallbackExt}`;
      const file = new File([blob], filename, { type: mime });
      onStyleRefFileChange(file);
      setShowAssetPicker(false);
      void recordUsage(asset.id, 'production');
    } catch (error) {
      setAssetPickerError(
        error instanceof Error ? error.message : t('productionWizard.input.assetImageFetchFailed'),
      );
    } finally {
      setSelectingAssetId(null);
    }
  }, [onStyleRefFileChange, t]);

  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">{t('productionWizard.input.title')}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs text-[var(--color-text-muted)] sm:col-span-2">
          {t('productionWizard.input.visualStyleSummary')}
          <textarea
            value={styleRefSummary}
            onChange={(e) => onStyleRefSummaryChange(e.target.value)}
            rows={3}
            placeholder={t('productionWizard.input.visualStyleSummaryPlaceholder')}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </label>
        <label className="text-xs text-[var(--color-text-muted)]">
          {t('productionWizard.input.aspectRatio')}
          <select
            value={aspectRatio}
            onChange={(e) => onAspectRatioChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          >
            {aspectOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--color-text-muted)]">
          {t('productionWizard.input.genreOptional')}
          <input
            value={storyGenre}
            onChange={(e) => onStoryGenreChange(e.target.value)}
            placeholder={t('productionWizard.input.genrePlaceholder')}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">{t('productionWizard.input.styleReferenceAnalysis')}</span>
        <input
          type="file"
          accept="image/*"
          disabled={busyStyle || selectingAssetId !== null}
          onChange={(e) => onStyleRefFileChange(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <button
          type="button"
          disabled={busyStyle || loadingAssets || selectingAssetId !== null}
          onClick={() => void handleOpenAssetPicker()}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)]/40 hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingAssets && showAssetPicker
            ? t('productionWizard.input.loadingAssets')
            : t('productionWizard.input.pickFromAssetLibrary')}
        </button>
        {selectingAssetId && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {t('productionWizard.input.importingAsset')}
          </span>
        )}
        {busyStyle && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {t('productionWizard.input.analyzing')}
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        {t('productionWizard.input.styleReferenceDescription')}
      </p>
      {styleRefPreview && (
        <img
          src={styleRefPreview}
          alt=""
          className="h-20 rounded-lg border border-[var(--color-border)] object-cover"
        />
      )}
      <label className="block text-xs text-[var(--color-text-muted)]">
        {t('productionWizard.input.characterSetup')}
        <textarea
          value={characterBible}
          onChange={(e) => onCharacterBibleChange(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs text-[var(--color-text-muted)]">
        {t('productionWizard.input.synopsis')}
        <textarea
          value={synopsis}
          onChange={(e) => onSynopsisChange(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs text-[var(--color-text-muted)]">
        {t('productionWizard.input.structureTemplate')}
        <select
          value={structureTemplate}
          onChange={(e) => onStructureTemplateChange(e.target.value as StructureTemplate)}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        >
          {templateOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {getTemplateLabel(o.value, o.label)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={busyL1}
        onClick={() => void onGenerateStoryArc()}
        className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {busyL1 ? t('productionWizard.input.generating') : t('productionWizard.input.generateStoryOutline')}
      </button>

      {showAssetPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            if (selectingAssetId) return;
            setShowAssetPicker(false);
          }}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text)]">{t('productionWizard.input.chooseStyleReference')}</h3>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {t('productionWizard.input.assetPickerDescription')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssetPicker(false)}
                disabled={selectingAssetId !== null}
                className="text-lg text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-40"
                aria-label={t('productionWizard.input.closeAssetPicker')}
              >
                x
              </button>
            </div>

            {assetPickerError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {assetPickerError}
              </div>
            )}

            {loadingAssets ? (
              <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                {t('productionWizard.input.loadingAssetLibraryImages')}
              </div>
            ) : assetList.length === 0 ? (
              <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                {t('productionWizard.input.noImageAssets')}
              </div>
            ) : (
              <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
                {assetList.map((asset) => {
                  const thumbUrl = resolveStyleRefPickerPreviewUrl(
                    asset,
                    (assetId) => `/api/asset-library/assets/${encodeURIComponent(assetId)}/file?token=${encodeURIComponent(localStorage.getItem('gobs_token') ?? '')}`,
                  );
                  const displayName = asset.filename?.replace(/\.[^.]+$/, '') || asset.id;
                  const isSelecting = selectingAssetId === asset.id;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => void handleSelectAsset(asset)}
                      disabled={selectingAssetId !== null}
                      className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] p-2 text-left transition hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="aspect-square overflow-hidden rounded-lg bg-[var(--color-surface)]">
                        {thumbUrl ? (
                          <img src={thumbUrl} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-text-muted)]">
                            {t('productionWizard.input.noPreview')}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-[var(--color-text)]">{displayName}</div>
                        <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                          {isSelecting
                            ? t('productionWizard.input.importingAsset')
                            : asset.ai_category || t('productionWizard.input.imageAsset')}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
