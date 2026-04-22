import * as React from 'react';

import type { LibraryAsset } from '../../api/assetLibraryApi';
import type { StructureTemplate } from '../productionTypes';

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
      setAssetPickerError(error instanceof Error ? error.message : '加载素材库失败');
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  const handleSelectAsset = useCallback(async (asset: LibraryAsset) => {
    setSelectingAssetId(asset.id);
    setAssetPickerError(null);
    try {
      const { buildAssetFileUrl, recordUsage } = await import('../../api/assetLibraryApi');
      const fileUrl = asset.file_url ?? buildAssetFileUrl(asset.id);
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('获取素材图片失败');
      }
      const blob = await response.blob();
      const mime = blob.type || asset.mimetype || asset.mime_type || 'image/jpeg';
      if (!mime.startsWith('image/')) {
        throw new Error('只能选择图片素材作为参考图');
      }
      const fallbackExt = mime.split('/')[1] || 'jpg';
      const filename = asset.filename?.trim() || `${asset.id}.${fallbackExt}`;
      const file = new File([blob], filename, { type: mime });
      onStyleRefFileChange(file);
      setShowAssetPicker(false);
      void recordUsage(asset.id, 'production');
    } catch (error) {
      setAssetPickerError(error instanceof Error ? error.message : '获取素材图片失败');
    } finally {
      setSelectingAssetId(null);
    }
  }, [onStyleRefFileChange]);

  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">立项与梗概</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs text-[var(--color-text-muted)] sm:col-span-2">
          视频风格（摘要）
          <textarea
            value={styleRefSummary}
            onChange={(e) => onStyleRefSummaryChange(e.target.value)}
            rows={3}
            placeholder="可手写；或上传参考图反解析"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </label>
        <label className="text-xs text-[var(--color-text-muted)]">
          画面比例
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
          故事类型（可选）
          <input
            value={storyGenre}
            onChange={(e) => onStoryGenreChange(e.target.value)}
            placeholder="如：女频、悬疑、都市"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">参考图反解析</span>
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
          {loadingAssets && showAssetPicker ? '加载素材中…' : '从素材库选择'}
        </button>
        {selectingAssetId && <span className="text-xs text-[var(--color-text-muted)]">导入素材中…</span>}
        {busyStyle && <span className="text-xs text-[var(--color-text-muted)]">分析中…</span>}
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        上传的参考图将作为全片画风基准；后续各镜分镜图会按该图与上方风格摘要做多模态画风锁定。
      </p>
      {styleRefPreview && (
        <img
          src={styleRefPreview}
          alt=""
          className="h-20 rounded-lg border border-[var(--color-border)] object-cover"
        />
      )}
      <label className="block text-xs text-[var(--color-text-muted)]">
        角色设定 / 背景
        <textarea
          value={characterBible}
          onChange={(e) => onCharacterBibleChange(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs text-[var(--color-text-muted)]">
        故事梗概
        <textarea
          value={synopsis}
          onChange={(e) => onSynopsisChange(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs text-[var(--color-text-muted)]">
        结构模板
        <select
          value={structureTemplate}
          onChange={(e) => onStructureTemplateChange(e.target.value as StructureTemplate)}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        >
          {templateOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
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
        {busyL1 ? '生成中…' : '生成剧本大纲'}
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
                <h3 className="text-sm font-semibold text-[var(--color-text)]">从素材库选择参考图</h3>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  选择后会自动走当前的风格反解析链路，更新预览和摘要。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssetPicker(false)}
                disabled={selectingAssetId !== null}
                className="text-lg text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-40"
                aria-label="关闭素材库选择"
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
              <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">正在加载素材库图片…</div>
            ) : assetList.length === 0 ? (
              <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                素材库里还没有图片素材，请先到“素材库”导入图片。
              </div>
            ) : (
              <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
                {assetList.map((asset) => {
                  const thumbUrl = asset.thumbnail_url ?? asset.file_url;
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
                            无预览
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-[var(--color-text)]">{displayName}</div>
                        <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                          {isSelecting ? '导入中…' : asset.ai_category || '图片素材'}
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

