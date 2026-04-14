import { RunningStatus } from '../../components/RunningStatus';
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
  return (
    <>
      <details className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--color-text)] [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <span className="text-[var(--color-text-muted)]">▸</span>
            剧本要素核对（可选）
          </span>
        </summary>
        <div className="space-y-4 border-t border-[var(--color-border)] px-4 py-4">
          <div className="rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-4">
            <h4 className="text-xs font-semibold text-[var(--color-text)]">关键物料</h4>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
              依据剧本补全角色、拍摄空间与重要道具；再为各卡生成定妆 / 场景定帧。
            </p>
            <button
              type="button"
              onClick={onSyncAssetsFromStory}
              className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
            >
              从剧本大纲同步角色与场景资产
            </button>
            <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
              同步会尽量保留已有图片（同名角色 / 同 sceneRef）。
            </p>
          </div>
          {story ? <StoryAssetFieldsFromOutline story={story} patchStory={patchStory} /> : null}
        </div>
      </details>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-border)] px-4 pt-2 sm:px-6">
          <div className="flex min-w-0 gap-6 sm:gap-10">
            {(
              [
                { id: 'characters' as const, label: `全部角色 ${characterCount}` },
                { id: 'scenes' as const, label: `全部场景 ${sceneCount}` },
                { id: 'props' as const, label: `全部道具 ${propCount}` },
                { id: 'checklist' as const, label: '制作清单' },
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
                title="按默认 prompt（与列表「AI」相同）为缺图角色定稿节点、场景与道具主变体生图；跳过弹窗待确认项"
                className="rounded-lg border border-[var(--color-primary)]/45 bg-[var(--color-primary)]/12 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {batchAssetGen ? `一键生成中 ${batchAssetGen.current}/${batchAssetGen.total}` : '一键补全缺图'}
              </button>
            ) : null}
            {batchAssetGen !== null ? (
              <span className="text-[11px] text-[var(--color-text-muted)]">
                成功 {batchAssetGen.success} / 失败 {batchAssetGen.failed}
                {batchAssetGen.currentLabel ? `：${batchAssetGen.currentLabel}` : ''}
              </span>
            ) : null}
            {batchAssetGen !== null ? (
              <RunningStatus
                active={true}
                label={`正在补全缺图 ${batchAssetGen.current}/${batchAssetGen.total}`}
                stallAfterSec={30}
              />
            ) : null}
            {batchAssetGen !== null ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`已完成 ${batchAssetGen.current}/${batchAssetGen.total} 项，确认取消剩余生图任务？`)) {
                    onCancelBatch();
                  }
                }}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                取消
              </button>
            ) : null}
            {batchAssetGen === null && failedTaskCount > 0 ? (
              <button
                type="button"
                onClick={onRetryFailed}
                className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                重试失败项 ({failedTaskCount})
              </button>
            ) : null}
            {l2Tab === 'characters' ? (
              <button
                type="button"
                onClick={onAddManualCharacter}
                className="text-xs font-medium text-[var(--color-primary)] hover:underline"
              >
                + 添加角色
              </button>
            ) : null}
            {l2Tab === 'characters' ? (
              <button
                type="button"
                onClick={onToggleLibraryImport}
                className="ml-3 text-xs font-medium text-[var(--color-primary)] hover:underline"
              >
                📚 从形象库导入
              </button>
            ) : null}
          </div>
      </div>
    </>
  );
}

