import * as React from 'react';

import type { LibraryAsset } from '../../api/assetLibraryApi';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
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
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);

  const getTemplateLabel = (value: StructureTemplate, fallback: string) => {
    switch (value) {
      case 'three_act':
        return uiText('三幕式', 'Three-act');
      case 'five_act':
        return uiText('五幕式', 'Five-act');
      case 'save_the_cat':
        return uiText('Save the Cat 节拍', 'Save the Cat beats');
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
      setAssetPickerError(error instanceof Error ? error.message : uiText('加载素材库失败', 'Failed to load the asset library'));
    } finally {
      setLoadingAssets(false);
    }
  }, [uiLocale]);

  const handleSelectAsset = useCallback(async (asset: LibraryAsset) => {
    setSelectingAssetId(asset.id);
    setAssetPickerError(null);
    try {
      const { buildAssetFileUrl, recordUsage } = await import('../../api/assetLibraryApi');
      const fileUrl = asset.file_url ?? buildAssetFileUrl(asset.id);
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(uiText('获取素材图片失败', 'Failed to fetch the asset image'));
      }
      const blob = await response.blob();
      const mime = blob.type || asset.mimetype || asset.mime_type || 'image/jpeg';
      if (!mime.startsWith('image/')) {
        throw new Error(uiText('只能选择图片素材作为参考图', 'Only image assets can be used as style references'));
      }
      const fallbackExt = mime.split('/')[1] || 'jpg';
      const filename = asset.filename?.trim() || `${asset.id}.${fallbackExt}`;
      const file = new File([blob], filename, { type: mime });
      onStyleRefFileChange(file);
      setShowAssetPicker(false);
      void recordUsage(asset.id, 'production');
    } catch (error) {
      setAssetPickerError(error instanceof Error ? error.message : uiText('获取素材图片失败', 'Failed to fetch the asset image'));
    } finally {
      setSelectingAssetId(null);
    }
  }, [onStyleRefFileChange, uiLocale]);

  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">{uiText('立项与梗概', 'Concept & Synopsis')}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs text-[var(--color-text-muted)] sm:col-span-2">
          {uiText('视频风格（摘要）', 'Visual style summary')}
          <textarea
            value={styleRefSummary}
            onChange={(e) => onStyleRefSummaryChange(e.target.value)}
            rows={3}
            placeholder={uiText('可手写；或上传参考图反解析', 'Write it manually or upload a reference image to reverse-analyze')}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </label>
        <label className="text-xs text-[var(--color-text-muted)]">
          {uiText('画面比例', 'Aspect ratio')}
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
          {uiText('故事类型（可选）', 'Genre (optional)')}
          <input
            value={storyGenre}
            onChange={(e) => onStoryGenreChange(e.target.value)}
            placeholder={uiText('如：女频、悬疑、都市', 'Examples: romance, mystery, urban drama')}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">{uiText('参考图反解析', 'Style reference analysis')}</span>
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
          {loadingAssets && showAssetPicker ? uiText('加载素材中…', 'Loading assets…') : uiText('从素材库选择', 'Pick from asset library')}
        </button>
        {selectingAssetId && <span className="text-xs text-[var(--color-text-muted)]">{uiText('导入素材中…', 'Importing asset…')}</span>}
        {busyStyle && <span className="text-xs text-[var(--color-text-muted)]">{uiText('分析中…', 'Analyzing…')}</span>}
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        {uiText(
          '上传的参考图将作为全片画风基准；后续各镜分镜图会按该图与上方风格摘要做多模态画风锁定。',
          'The uploaded reference image becomes the visual anchor for the whole project. Later storyboard frames will lock style against both this image and the summary above.',
        )}
      </p>
      {styleRefPreview && (
        <img
          src={styleRefPreview}
          alt=""
          className="h-20 rounded-lg border border-[var(--color-border)] object-cover"
        />
      )}
      <label className="block text-xs text-[var(--color-text-muted)]">
        {uiText('角色设定 / 背景', 'Character setup / world background')}
        <textarea
          value={characterBible}
          onChange={(e) => onCharacterBibleChange(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs text-[var(--color-text-muted)]">
        {uiText('故事梗概', 'Synopsis')}
        <textarea
          value={synopsis}
          onChange={(e) => onSynopsisChange(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs text-[var(--color-text-muted)]">
        {uiText('结构模板', 'Structure template')}
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
        {busyL1 ? uiText('生成中…', 'Generating…') : uiText('生成剧本大纲', 'Generate story outline')}
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
                <h3 className="text-sm font-semibold text-[var(--color-text)]">{uiText('从素材库选择参考图', 'Choose a style reference from the asset library')}</h3>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {uiText(
                    '选择后会自动走当前的风格反解析链路，更新预览和摘要。',
                    'After selection, the current style-analysis flow will run automatically and refresh the preview and summary.',
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssetPicker(false)}
                disabled={selectingAssetId !== null}
                className="text-lg text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-40"
                aria-label={uiText('关闭素材库选择', 'Close asset picker')}
              >
                ×
              </button>
            </div>

            {assetPickerError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {assetPickerError}
              </div>
            )}

            {loadingAssets ? (
              <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">{uiText('正在加载素材库图片…', 'Loading asset library images…')}</div>
            ) : assetList.length === 0 ? (
              <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                {uiText('素材库里还没有图片素材，请先到“素材库”导入图片。', 'There are no image assets yet. Import some images in Asset Library first.')}
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
                            {uiText('无预览', 'No preview')}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-[var(--color-text)]">{displayName}</div>
                        <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                          {isSelecting ? uiText('导入中…', 'Importing…') : asset.ai_category || uiText('图片素材', 'Image asset')}
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

