export function StepStoryboardMainHeader({
  styleRefSummary,
  storySceneCoverage,
  shotIndex,
  shotRefTagsText,
  shotVideoDreaminaModel,
  dreaminaModelVersion,
  onShotVideoDreaminaModelChange,
  onDreaminaModelVersionChange,
}: {
  styleRefSummary: string;
  storySceneCoverage: { hit: number; total: number; missingLabels: string[] } | null;
  shotIndex: number;
  shotRefTagsText: string;
  shotVideoDreaminaModel?: string;
  dreaminaModelVersion?: string;
  onShotVideoDreaminaModelChange: (next: string) => void;
  onDreaminaModelVersionChange: (next: string) => void;
}) {
  return (
    <>
      <div className="text-xs text-[var(--color-text-muted)]">
        全局风格：{styleRefSummary.slice(0, 120)}
        {styleRefSummary.length > 120 ? '…' : ''}
      </div>
      {storySceneCoverage && storySceneCoverage.total > 0 ? (
        <div
          className={`rounded-lg border px-3 py-2 text-[11px] leading-snug ${
            storySceneCoverage.hit < storySceneCoverage.total
              ? 'border-amber-500/45 bg-amber-500/10 text-amber-950 dark:text-amber-100'
              : 'border-[var(--color-border)]/80 bg-[var(--color-surface)] text-[var(--color-text-muted)]'
          }`}
        >
          <span className="font-medium text-[var(--color-text)]">L1 场景覆盖：</span>
          {storySceneCoverage.hit}/{storySceneCoverage.total} 个地点已在分镜中出现（sceneRef）。
          {storySceneCoverage.hit < storySceneCoverage.total && storySceneCoverage.missingLabels.length > 0 ? (
            <span>
              {' '}
              尚未安排镜头：
              {storySceneCoverage.missingLabels.join('、')}。请回到上一步重新点击「生成分镜表」以拉齐（服务端已要求模型全覆盖）。
            </span>
          ) : (
            <span> 与故事里的场景规划一致。</span>
          )}
        </div>
      ) : null}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            分镜 {shotIndex}
          </h3>
          <span className="text-xs text-[var(--color-text-muted)]">{shotRefTagsText}</span>
        </div>
        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
          修改后需重新「组装各镜 Prompt」导出才会更新。
        </p>
        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
          分镜静帧：服务端 Compass / Gemini 图像（Imagen）；分镜视频：默认即梦 CLI。「全能参考」按本镜文案匹配角色名并附带当前场景卡参考图，prompt 内 @图片1… 与上传顺序一致（最多 9 张）。
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-3 text-[10px]">
          <label className="flex flex-col gap-0.5 text-[var(--color-text-muted)]">
            分镜视频（即梦）
            <select
              value={shotVideoDreaminaModel ?? ''}
              onChange={(e) => onShotVideoDreaminaModelChange(e.target.value)}
              className="mt-0.5 max-w-[240px] rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] text-[var(--color-text)]"
            >
              <option value="">自动（有静帧→图生，无→文生）</option>
              <option value="dreamina-multimodal">即梦·全能参考（角色/场景图 + @图片1…）</option>
              <option value="dreamina-image2video">即梦·图生视频</option>
              <option value="dreamina-text2video">即梦·文生视频</option>
            </select>
          </label>
          <label className="flex flex-col gap-0.5 text-[var(--color-text-muted)]">
            Seedance 版本（--model-version）
            <select
              value={dreaminaModelVersion ?? ''}
              onChange={(e) => onDreaminaModelVersionChange(e.target.value)}
              className="mt-0.5 max-w-[260px] rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] text-[var(--color-text)]"
            >
              <option value="">默认（读服务端 DREAMINA_*_MODEL）</option>
              <option value="seedance2.0">seedance2.0（全模态）</option>
              <option value="seedance2.0fast">seedance2.0fast（极速）</option>
            </select>
          </label>
        </div>
      </div>
    </>
  );
}

