import { RunningStatus } from '../../components/RunningStatus';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
import { StoryAssetFieldsFromOutline } from '../components/StoryAssetFieldsFromOutline';
import type { StoryArcLayer } from '../productionTypes';

type L2Tab = 'characters' | 'scenes' | 'props' | 'checklist';

export function StepDesignHeader({
  story,
  patchStory,
  onSyncAssetsFromStory,
  l2Tab,
  onL2TabChange,
  characterCount,
  sceneCount,
  propCount,
  batchAssetGen,
  onGenerateMissingAssets,
  onCancelBatch,
  failedTaskCount,
  onRetryFailed,
  onAddManualCharacter,
  onToggleLibraryImport,
}: {
  story: StoryArcLayer | null;
  patchStory: (fn: (s: StoryArcLayer) => StoryArcLayer) => void;
  onSyncAssetsFromStory: () => void;
  l2Tab: L2Tab;
  onL2TabChange: (tab: L2Tab) => void;
  characterCount: number;
  sceneCount: number;
  propCount: number;
  batchAssetGen: { current: number; total: number; success: number; failed: number; currentLabel?: string } | null;
  onGenerateMissingAssets: () => void | Promise<void>;
  onCancelBatch: () => void;
  failedTaskCount: number;
  onRetryFailed: () => void;
  onAddManualCharacter: () => void;
  onToggleLibraryImport: () => void;
}) {
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);

  return (
    <>
      <details className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--color-text)] [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <span className="text-[var(--color-text-muted)]">▸</span>
            {uiText('剧本要素核对（可选）', 'Story element checklist (optional)')}
          </span>
        </summary>
        <div className="space-y-4 border-t border-[var(--color-border)] px-4 py-4">
          <div className="rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-4">
            <h4 className="text-xs font-semibold text-[var(--color-text)]">{uiText('关键物料', 'Key assets')}</h4>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
              {uiText(
                '依据剧本补全角色、拍摄空间与重要道具；再为各卡生成定妆 / 场景定帧。',
                'Fill in characters, filming spaces, and key props from the story, then generate portrait and scene keyframes for each card.',
              )}
            </p>
            <button
              type="button"
              onClick={onSyncAssetsFromStory}
              className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
            >
              {uiText('从剧本大纲同步角色与场景资产', 'Sync character and scene assets from outline')}
            </button>
            <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
              {uiText(
                '同步会尽量保留已有图片（同名角色 / 同 sceneRef）。',
                'Sync tries to preserve existing images for same-name characters and matching sceneRef values.',
              )}
            </p>
          </div>
          {story ? <StoryAssetFieldsFromOutline story={story} patchStory={patchStory} /> : null}
        </div>
      </details>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-border)] px-4 pt-2 sm:px-6">
          <div className="flex min-w-0 gap-6 sm:gap-10">
            {(
              [
                { id: 'characters' as const, label: uiText(`全部角色 ${characterCount}`, `Characters ${characterCount}`) },
                { id: 'scenes' as const, label: uiText(`全部场景 ${sceneCount}`, `Scenes ${sceneCount}`) },
                { id: 'props' as const, label: uiText(`全部道具 ${propCount}`, `Props ${propCount}`) },
                { id: 'checklist' as const, label: uiText('制作清单', 'Production checklist') },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => onL2TabChange(id)}
                className={`relative pb-3 text-sm font-semibold transition-colors ${
                  l2Tab === id
                    ? 'text-[var(--color-primary)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:rounded-t after:bg-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 pb-2">
            {l2Tab !== 'checklist' ? (
              <button
                type="button"
                disabled={batchAssetGen !== null}
                onClick={() => void onGenerateMissingAssets()}
                title={uiText(
                  '按默认 prompt（与列表「AI」相同）为缺图角色定稿节点、场景与道具主变体生图；跳过弹窗待确认项',
                  'Generate missing character, scene, and prop images with the default prompt and skip items that still need confirmation in a popup.',
                )}
                className="rounded-lg border border-[var(--color-primary)]/45 bg-[var(--color-primary)]/12 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {batchAssetGen
                  ? uiText(`一键生成中 ${batchAssetGen.current}/${batchAssetGen.total}`, `Generating ${batchAssetGen.current}/${batchAssetGen.total}`)
                  : uiText('一键补全缺图', 'Generate all missing images')}
              </button>
            ) : null}
            {batchAssetGen !== null ? (
              <span className="text-[11px] text-[var(--color-text-muted)]">
                {uiText(
                  `成功 ${batchAssetGen.success} / 失败 ${batchAssetGen.failed}`,
                  `Success ${batchAssetGen.success} / Failed ${batchAssetGen.failed}`,
                )}
                {batchAssetGen.currentLabel ? uiText(`：${batchAssetGen.currentLabel}`, `: ${batchAssetGen.currentLabel}`) : ''}
              </span>
            ) : null}
            {batchAssetGen !== null ? (
              <RunningStatus
                active={true}
                label={uiText(
                  `正在补全缺图 ${batchAssetGen.current}/${batchAssetGen.total}`,
                  `Generating missing images ${batchAssetGen.current}/${batchAssetGen.total}`,
                )}
                stallAfterSec={30}
                scene="props-room"
              />
            ) : null}
            {batchAssetGen !== null ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(
                    uiText(
                      `已完成 ${batchAssetGen.current}/${batchAssetGen.total} 项，确认取消剩余生图任务？`,
                      `${batchAssetGen.current}/${batchAssetGen.total} items are done. Cancel the remaining image jobs?`,
                    ),
                  )) {
                    onCancelBatch();
                  }
                }}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                {uiText('取消', 'Cancel')}
              </button>
            ) : null}
            {batchAssetGen === null && failedTaskCount > 0 ? (
              <button
                type="button"
                onClick={onRetryFailed}
                className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                {uiText(`重试失败项 (${failedTaskCount})`, `Retry failed items (${failedTaskCount})`)}
              </button>
            ) : null}
            {l2Tab === 'characters' ? (
              <button
                type="button"
                onClick={onAddManualCharacter}
                className="text-xs font-medium text-[var(--color-primary)] hover:underline"
              >
                {uiText('+ 添加角色', '+ Add character')}
              </button>
            ) : null}
            {l2Tab === 'characters' ? (
              <button
                type="button"
                onClick={onToggleLibraryImport}
                className="ml-3 text-xs font-medium text-[var(--color-primary)] hover:underline"
              >
                {uiText('📚 从形象库导入', '📚 Import from character library')}
              </button>
            ) : null}
          </div>
      </div>
    </>
  );
}

