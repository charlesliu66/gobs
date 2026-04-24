import { RunningStatus } from '../../components/RunningStatus';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
import { StoryAssetFieldsFromOutline } from '../components/StoryAssetFieldsFromOutline';
import type { DesignAssetStatusCounts } from '../designAssetStatus';
import type { StoryArcLayer } from '../productionTypes';

type L2Tab = 'characters' | 'scenes' | 'props' | 'checklist';

type BatchAssetGenState = {
  current: number;
  total: number;
  success: number;
  failed: number;
  startedAt: number;
  currentLabel?: string;
};

type BatchAssetSummary = {
  total: number;
  success: number;
  failed: number;
  cancelled?: boolean;
};

type ReadinessSummary = {
  characters: DesignAssetStatusCounts;
  scenes: DesignAssetStatusCounts;
  props: DesignAssetStatusCounts;
  missingTotal: number;
};

function estimateBatchMinutes(total: number): number {
  return Math.max(1, Math.round((total * 25) / 60));
}

function readinessTone(counts: DesignAssetStatusCounts): string {
  if (counts.missing > 0 || counts.failed > 0) return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  if (counts.review > 0 || counts.generating > 0) return 'border-sky-500/30 bg-sky-500/10 text-sky-100';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
}

function readinessDetail(
  counts: DesignAssetStatusCounts,
  readyLabel: string,
  attentionLabel: string,
  progressLabel: string,
): string {
  if (counts.total === 0) return `0/0 ${readyLabel}`;
  if (counts.missing > 0 || counts.failed > 0) {
    const pending = counts.missing + counts.failed;
    return `${counts.ready}/${counts.total} ${readyLabel} · ${pending} ${attentionLabel}`;
  }
  if (counts.review > 0 || counts.generating > 0) {
    const inFlight = counts.review + counts.generating;
    return `${counts.ready}/${counts.total} ${readyLabel} · ${inFlight} ${progressLabel}`;
  }
  return `${counts.ready}/${counts.total} ${readyLabel}`;
}

export function StepDesignHeader({
  story,
  patchStory,
  onSyncAssetsFromStory,
  l2Tab,
  onL2TabChange,
  characterCount,
  sceneCount,
  propCount,
  readinessSummary,
  batchAssetGen,
  batchAssetSummary,
  onGenerateMissingAssets,
  onCancelBatch,
  failedTaskCount,
  onRetryFailed,
  onDismissBatchSummary,
  onAddManualCharacter,
  onToggleLibraryImport,
  styleRefSummary,
  styleRefImageDataUrl,
}: {
  story: StoryArcLayer | null;
  patchStory: (fn: (s: StoryArcLayer) => StoryArcLayer) => void;
  onSyncAssetsFromStory: () => void;
  l2Tab: L2Tab;
  onL2TabChange: (tab: L2Tab) => void;
  characterCount: number;
  sceneCount: number;
  propCount: number;
  readinessSummary: ReadinessSummary;
  batchAssetGen: BatchAssetGenState | null;
  batchAssetSummary: BatchAssetSummary | null;
  onGenerateMissingAssets: () => void | Promise<void>;
  onCancelBatch: () => void;
  failedTaskCount: number;
  onRetryFailed: () => void;
  onDismissBatchSummary: () => void;
  onAddManualCharacter: () => void;
  onToggleLibraryImport: () => void;
  styleRefSummary: string;
  styleRefImageDataUrl?: string;
}) {
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);
  const styleHint = styleRefSummary.trim();

  return (
    <>
      <details className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--color-text)] [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <span className="text-[var(--color-text-muted)]">+</span>
            {uiText('剧本要素核对（可选）', 'Story element checklist (optional)')}
          </span>
        </summary>
        <div className="space-y-4 border-t border-[var(--color-border)] px-4 py-4">
          <div className="rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-4">
            <h4 className="text-xs font-semibold text-[var(--color-text)]">{uiText('关键物料', 'Key assets')}</h4>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
              {uiText(
                '根据故事先补齐角色、场景与关键道具，再为每张卡片生成主图，后面进入分镜会顺很多。',
                'Fill in characters, scenes, and key props from the story first, then generate a primary image for each card before moving into storyboard work.',
              )}
            </p>
            <button
              type="button"
              onClick={onSyncAssetsFromStory}
              className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
            >
              {uiText('从故事大纲同步角色与场景资产', 'Sync character and scene assets from outline')}
            </button>
            <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
              {uiText(
                '同步时会尽量保留同名角色与同 sceneRef 的已有图片。',
                'Sync tries to preserve existing images for same-name characters and matching sceneRef values.',
              )}
            </p>
          </div>
          {story ? <StoryAssetFieldsFromOutline story={story} patchStory={patchStory} /> : null}
        </div>
      </details>

      <div className="border-b border-[var(--color-border)] px-4 pt-2 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
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
            {l2Tab === 'characters' ? (
              <>
                <button
                  type="button"
                  onClick={onAddManualCharacter}
                  className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                >
                  {uiText('+ 添加角色', '+ Add character')}
                </button>
                <button
                  type="button"
                  onClick={onToggleLibraryImport}
                  className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                >
                  {uiText('从形象库导入', 'Import from character library')}
                </button>
              </>
            ) : null}

            {batchAssetGen ? (
              <>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {uiText(
                    `成功 ${batchAssetGen.success} / 失败 ${batchAssetGen.failed}`,
                    `Success ${batchAssetGen.success} / Failed ${batchAssetGen.failed}`,
                  )}
                  {batchAssetGen.currentLabel ? ` · ${batchAssetGen.currentLabel}` : ''}
                </span>
                <RunningStatus
                  active={true}
                  label={uiText(
                    `正在补全缺图 ${batchAssetGen.current}/${batchAssetGen.total}`,
                    `Generating missing images ${batchAssetGen.current}/${batchAssetGen.total}`,
                  )}
                  stallAfterSec={30}
                  scene="props-room"
                />
                <button
                  type="button"
                  onClick={onCancelBatch}
                  className="text-xs text-red-400 transition-colors hover:text-red-300"
                >
                  {uiText('取消', 'Cancel')}
                </button>
              </>
            ) : batchAssetSummary?.failed ? (
              <button
                type="button"
                onClick={onRetryFailed}
                className="text-xs text-yellow-400 transition-colors hover:text-yellow-300"
              >
                {uiText(`重试失败项（${batchAssetSummary.failed}）`, `Retry failed items (${batchAssetSummary.failed})`)}
              </button>
            ) : batchAssetSummary === null && failedTaskCount > 0 ? (
              <button
                type="button"
                onClick={onRetryFailed}
                className="text-xs text-yellow-400 transition-colors hover:text-yellow-300"
              >
                {uiText(`重试失败项（${failedTaskCount}）`, `Retry failed items (${failedTaskCount})`)}
              </button>
            ) : null}
          </div>
        </div>

        {(styleHint || styleRefImageDataUrl) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)]/70 py-3">
            <span className="rounded-full border border-[var(--color-border)]/70 px-2 py-1 text-[10px] font-medium text-[var(--color-text-muted)]">
              {uiText('风格锚定', 'Style anchor')}
            </span>
            {styleRefImageDataUrl ? (
              <img
                src={styleRefImageDataUrl}
                alt=""
                className="h-8 w-8 rounded-md border border-[var(--color-border)] object-cover"
              />
            ) : null}
            <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-text-muted)]">
              {styleHint || uiText('已上传风格参考图', 'Style reference uploaded')}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)]/70 py-3">
          {[
            {
              label: uiText('角色', 'Characters'),
              counts: readinessSummary.characters,
              readyLabel: uiText('已定妆', 'ready'),
              attentionLabel: uiText('待补图', 'need images'),
              progressLabel: uiText('处理中', 'in progress'),
            },
            {
              label: uiText('场景', 'Scenes'),
              counts: readinessSummary.scenes,
              readyLabel: uiText('已出图', 'ready'),
              attentionLabel: uiText('待补图', 'need images'),
              progressLabel: uiText('处理中', 'in progress'),
            },
            {
              label: uiText('道具', 'Props'),
              counts: readinessSummary.props,
              readyLabel: uiText('已出图', 'ready'),
              attentionLabel: uiText('待补图', 'need images'),
              progressLabel: uiText('处理中', 'in progress'),
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${readinessTone(item.counts)}`}
            >
              <span className="font-semibold text-white/95">{item.label}</span>
              <span className="text-white/80">
                {readinessDetail(item.counts, item.readyLabel, item.attentionLabel, item.progressLabel)}
              </span>
            </div>
          ))}

          {l2Tab !== 'checklist' && readinessSummary.missingTotal > 0 ? (
            <button
              type="button"
              disabled={batchAssetGen !== null}
              onClick={() => void onGenerateMissingAssets()}
              className="ml-auto rounded-lg border border-[var(--color-primary)]/50 bg-[var(--color-primary)]/15 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/25 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {batchAssetGen
                ? uiText(`补图中 ${batchAssetGen.current}/${batchAssetGen.total}`, `Generating ${batchAssetGen.current}/${batchAssetGen.total}`)
                : uiText(`一键补全缺图（还差 ${readinessSummary.missingTotal} 张）`, `Generate missing images (${readinessSummary.missingTotal} left)`)}
            </button>
          ) : null}
        </div>

        {batchAssetGen && (
          <div className="pb-3 text-[11px] text-[var(--color-text-muted)]">
            {uiText(
              `预计约 ${estimateBatchMinutes(batchAssetGen.total)} 分钟生成 ${batchAssetGen.total} 张图`,
              `Estimated ${estimateBatchMinutes(batchAssetGen.total)} min for ${batchAssetGen.total} images`,
            )}
          </div>
        )}

        {batchAssetSummary && (
          <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-[var(--color-text)]">
                  {batchAssetSummary.failed > 0
                    ? uiText('缺图补全已完成，但仍有失败项', 'Missing-image batch finished with failures')
                    : batchAssetSummary.cancelled
                      ? uiText('缺图补全已取消', 'Missing-image batch cancelled')
                      : uiText('缺图补全已完成', 'Missing-image batch finished')}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {uiText(
                    `共 ${batchAssetSummary.total} 张，成功 ${batchAssetSummary.success} 张，失败 ${batchAssetSummary.failed} 张`,
                    `${batchAssetSummary.total} total, ${batchAssetSummary.success} succeeded, ${batchAssetSummary.failed} failed`,
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {batchAssetSummary.failed > 0 ? (
                  <button
                    type="button"
                    onClick={onRetryFailed}
                    className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-200 hover:bg-yellow-500/20"
                  >
                    {uiText('重试失败项', 'Retry failed items')}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onDismissBatchSummary}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                >
                  {uiText('收起', 'Dismiss')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
