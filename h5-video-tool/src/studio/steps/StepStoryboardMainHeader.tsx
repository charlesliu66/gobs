import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';

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
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);

  return (
    <>
      <div className="text-xs text-[var(--color-text-muted)]">
        {uiText('全局风格：', 'Global style: ')}
        {styleRefSummary.slice(0, 120)}
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
          <span className="font-medium text-[var(--color-text)]">
            {uiText('L1 场景覆盖：', 'L1 scene coverage: ')}
          </span>
          {uiText(
            `${storySceneCoverage.hit}/${storySceneCoverage.total} 个地点已在分镜中出现（sceneRef）。`,
            `${storySceneCoverage.hit}/${storySceneCoverage.total} locations already appear in the storyboard (sceneRef).`,
          )}
          {storySceneCoverage.hit < storySceneCoverage.total && storySceneCoverage.missingLabels.length > 0 ? (
            <span>
              {' '}
              {uiText('尚未安排镜头：', 'Still missing shots for: ')}
              {storySceneCoverage.missingLabels.join(uiText('、', ', '))}
              {uiText(
                '。请回到上一步重新点击「生成分镜表」以拉齐（服务端已要求模型全覆盖）。',
                '. Go back one step and regenerate the storyboard to restore full coverage.',
              )}
            </span>
          ) : (
            <span>{uiText(' 与故事里的场景规划一致。', ' Coverage matches the story scene plan.')}</span>
          )}
        </div>
      ) : null}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            {uiText(`分镜 ${shotIndex}`, `Shot ${shotIndex}`)}
          </h3>
          <span className="text-xs text-[var(--color-text-muted)]">{shotRefTagsText}</span>
        </div>
        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
          {uiText(
            '修改后需重新「组装各镜 Prompt」导出才会更新。',
            'After editing, re-run prompt assembly before export so the latest changes are included.',
          )}
        </p>
        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
          {uiText(
            '分镜静帧：服务端 Compass / Gemini 图像（Imagen）；分镜视频：默认即梦 CLI。「全能参考」按本镜文案匹配角色名并附带当前场景卡参考图，prompt 内 @图片1… 与上传顺序一致（最多 9 张）。',
            'Storyboard stills use Compass / Gemini image generation (Imagen), and storyboard videos use Dreamina CLI by default. Multimodal mode matches character names from this shot, attaches the current scene reference image, and keeps @image1... aligned with upload order (up to 9 images).',
          )}
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-3 text-[10px]">
          <label className="flex flex-col gap-0.5 text-[var(--color-text-muted)]">
            {uiText('分镜视频（即梦）', 'Storyboard video (Dreamina)')}
            <select
              value={shotVideoDreaminaModel ?? ''}
              onChange={(e) => onShotVideoDreaminaModelChange(e.target.value)}
              className="mt-0.5 max-w-[240px] rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] text-[var(--color-text)]"
            >
              <option value="">
                {uiText(
                  '自动（有静帧→图生，无→文生）',
                  'Auto (image-to-video when a still exists, otherwise text-to-video)',
                )}
              </option>
              <option value="dreamina-multimodal">
                {uiText(
                  '即梦·全能参考（角色/场景图 + @图片1…）',
                  'Dreamina multimodal (character/scene refs + @image1...)',
                )}
              </option>
              <option value="dreamina-image2video">{uiText('即梦·图生视频', 'Dreamina image-to-video')}</option>
              <option value="dreamina-text2video">{uiText('即梦·文生视频', 'Dreamina text-to-video')}</option>
            </select>
          </label>
          <label className="flex flex-col gap-0.5 text-[var(--color-text-muted)]">
            {uiText('Seedance 版本（--model-version）', 'Seedance version (--model-version)')}
            <select
              value={dreaminaModelVersion ?? ''}
              onChange={(e) => onDreaminaModelVersionChange(e.target.value)}
              className="mt-0.5 max-w-[260px] rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] text-[var(--color-text)]"
            >
              <option value="">
                {uiText('默认（读服务端 DREAMINA_*_MODEL）', 'Default (use server DREAMINA_*_MODEL)')}
              </option>
              <option value="seedance2.0">{uiText('seedance2.0（全模态）', 'seedance2.0 (full multimodal)')}</option>
              <option value="seedance2.0fast">{uiText('seedance2.0fast（极速）', 'seedance2.0fast (fast)')}</option>
            </select>
          </label>
        </div>
      </div>
    </>
  );
}
