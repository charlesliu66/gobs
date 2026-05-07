import type { CharacterSheet, ProductionShot, SceneSheet } from '../productionTypes';
import {
  characterMentionedInShotBlob,
  extractAtImageContext,
  getCharacterShotImage,
} from '../productionAssets';
import { useLocale } from '../../i18n/LocaleContext.tsx';

type MultimodalRefPack = {
  multimodalImages: Array<{ base64: string; mimeType?: string }>;
  labels: string[];
  narrativeWithInlineTags: string;
};

function formatReferenceLabelForUi(label: string, uiLocale: string): string {
  if (uiLocale !== 'en') return label;
  if (/^(Character|Scene|Prop) \[/.test(label)) return label;
  const character = /^角色「(.+?)」(?:\((.+)\))?$/.exec(label);
  if (character) return `Character [${character[1]}]${character[2] ? ` (${character[2]})` : ''}`;
  const scene = /^场景「(.+?)」$/.exec(label);
  if (scene) return `Scene [${scene[1]}]`;
  const prop = /^道具「(.+?)」$/.exec(label);
  if (prop) return `Prop [${prop[1]}]`;
  return label;
}

function stripReferenceSuffix(prompt: string): string {
  const cuts = [
    prompt.indexOf('\n\n参考对应'),
    prompt.indexOf('\n\nReference order'),
  ].filter((idx) => idx >= 0);
  if (!cuts.length) return prompt;
  return prompt.slice(0, Math.min(...cuts));
}

export function StepStoryboardMultimodalRefPanel({
  shot,
  chSheets,
  scSheets,
  multimodalRefPack,
  multimodalAutoPrompt,
  shotBlob,
  onPatchShot,
  onOpenLightbox,
}: {
  shot: ProductionShot;
  chSheets: CharacterSheet[];
  scSheets: SceneSheet[];
  multimodalRefPack: MultimodalRefPack;
  multimodalAutoPrompt: string;
  shotBlob: string;
  onPatchShot: (patch: Partial<ProductionShot>) => void;
  onOpenLightbox: (src: string) => void;
}) {
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T): T => (uiLocale === 'en' ? en : zh);
  const promptValue = shot.videoStoryboardOverride ?? multimodalAutoPrompt;
  const promptNarrative = stripReferenceSuffix(promptValue);

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-surface)] p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--color-text)]">
          {uiText('全能参考 · 素材与 @图片 对应', 'Reference images · @图片 mapping')}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">
          {uiText(
            '正文会自动在首次出现的人名/场景名后插入 @图片n；龙一与龙一的父亲会分别绑定。可继续微调全文。',
            'Provider tokens stay as @图片n. They are inserted next to the first matching character, scene, or prop phrase.',
          )}
        </span>
      </div>
      {multimodalRefPack.multimodalImages.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {multimodalRefPack.multimodalImages.map((img, i) => {
            const ctx = extractAtImageContext(promptNarrative, i + 1, uiLocale);
            const notInjected = !ctx;
            const imageSrc = `data:${img.mimeType || 'image/png'};base64,${img.base64}`;
            return (
              <div
                key={`${shot.shotIndex}-mm-${i}`}
                className="flex min-w-0 max-w-full flex-col gap-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1.5 pl-1.5 pr-2"
              >
                <div className="flex items-center gap-2">
                  <span className="shrink-0 rounded-md bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {uiText(`@图片${i + 1}`, `Image ${i + 1} · @图片${i + 1}`)}
                  </span>
                  <img
                    src={imageSrc}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-md object-cover ring-1 ring-[var(--color-border)] cursor-zoom-in"
                    onClick={() => onOpenLightbox(imageSrc)}
                  />
                  <span className="min-w-0 truncate text-[11px] text-[var(--color-text)]">
                    {formatReferenceLabelForUi(multimodalRefPack.labels[i] ?? uiText(`素材 ${i + 1}`, `Asset ${i + 1}`), uiLocale)}
                  </span>
                </div>
                {notInjected ? (
                  <span className="text-[10px] text-amber-500">
                    {uiText('↳ ⚠ 未在文案中找到对应词，@图片 未注入', '↳ ⚠ No matching phrase found in the prompt; @图片 was not inserted')}
                  </span>
                ) : (
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {uiText(`↳ 插入在 ${ctx}`, `↳ Inserted ${ctx}`)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-100">
          {uiText(
            '当前未匹配到任何带图素材。请在本镜主体/对白中写明角色名或父亲/母亲等称谓，并为角色卡、场景卡生成参考图。',
            'No reference image is matched yet. Mention the character, relationship, scene, or prop in this shot, and make sure the matching card has an image.',
          )}
        </div>
      )}

      <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px]">
        <summary className="cursor-pointer px-3 py-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          {uiText('▸ 手动调整引用对象（覆盖自动匹配）', '▸ Manually adjust references (override automatic matching)')}
        </summary>
        <div className="space-y-2 p-3">
          <div className="space-y-1">
            <div className="font-medium text-[var(--color-text)]">{uiText('角色', 'Characters')}</div>
            <div className="flex flex-wrap gap-1.5">
              {chSheets.map((ch) => {
                const hasImg = !!getCharacterShotImage(ch, shot);
                const overrides = shot.manualRefOverrides;
                const autoSelected = characterMentionedInShotBlob(ch, shotBlob);
                const manualIds = overrides?.characterIds;
                const isSelected = manualIds !== undefined ? manualIds.includes(ch.id) : autoSelected;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    title={hasImg ? '' : uiText('暂无定妆图，需先生成', 'No character image yet. Generate one first.')}
                    onClick={() => {
                      const cur = shot.manualRefOverrides?.characterIds
                        ?? chSheets.filter((c) => characterMentionedInShotBlob(c, shotBlob)).map((c) => c.id);
                      const next = cur.includes(ch.id)
                        ? cur.filter((id) => id !== ch.id)
                        : [...cur, ch.id];
                      onPatchShot({
                        manualRefOverrides: { ...shot.manualRefOverrides, characterIds: next },
                      });
                    }}
                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                      isSelected && hasImg
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                        : isSelected && !hasImg
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)]'
                    }`}
                  >
                    {isSelected ? '✓' : '+'} {ch.name}
                    {!hasImg && <span className="text-amber-500">⚠</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-medium text-[var(--color-text)]">{uiText('场景', 'Scenes')}</div>
            <div className="flex flex-wrap gap-1.5">
              {[{ id: null as null, name: uiText('（不引用）', '(No reference)'), hasImg: true }, ...scSheets.map((sc) => ({
                id: sc.id,
                name: sc.name,
                hasImg: !!sc.variants[0]?.imageDataUrl,
              }))].map((item) => {
                const overrides = shot.manualRefOverrides;
                const autoSceneId = scSheets.find((s) => s.sceneRef === shot.sceneRef || s.id === shot.sceneRef)?.id ?? null;
                const selectedId = overrides?.sceneId !== undefined ? overrides.sceneId : autoSceneId;
                const isSelected = item.id === selectedId;
                return (
                  <button
                    key={String(item.id)}
                    type="button"
                    onClick={() => {
                      onPatchShot({
                        manualRefOverrides: {
                          ...shot.manualRefOverrides,
                          sceneId: item.id === autoSceneId && !overrides?.sceneId ? undefined : item.id,
                        },
                      });
                    }}
                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                      isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {isSelected ? '●' : '○'} {item.name}
                    {!item.hasImg && item.id !== null && <span className="text-amber-500">⚠</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {shot.manualRefOverrides && (
            <button
              type="button"
              onClick={() => onPatchShot({ manualRefOverrides: undefined })}
              className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
            >
              {uiText('↩ 恢复自动匹配', '↩ Restore automatic matching')}
            </button>
          )}
        </div>
      </details>

      <label className="block">
        <span className="text-[11px] text-[var(--color-text-muted)]">
          {uiText(
            '将发送给即梦的完整 Prompt（与左侧资产顺序一致；勿改 @图片 编号与素材顺序的对应关系）',
            'Full prompt sent to Dreamina. Keep @图片 numbering aligned with the image order above.',
          )}
        </span>
        <textarea
          rows={9}
          value={promptValue}
          onChange={(e) => {
            const v = e.target.value;
            onPatchShot({
              videoStoryboardOverride: v === '' ? undefined : v,
            });
          }}
          spellCheck={false}
          className="mt-1.5 w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2.5 py-2 font-mono text-[11px] leading-relaxed text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
        />
      </label>
      <button
        type="button"
        onClick={() => onPatchShot({ videoStoryboardOverride: undefined })}
        className="text-[11px] text-[var(--color-primary)] hover:underline"
      >
        {uiText('恢复自动拼接', 'Restore automatic prompt')}
      </button>
    </div>
  );
}

