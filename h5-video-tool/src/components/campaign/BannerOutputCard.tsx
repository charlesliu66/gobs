import type { ReactNode } from 'react';
import type { CreativeQualityStatus } from './quality/creativeQualityTypes.ts';
import {
  BANNER_OUTPUT_SPECS,
  type GameSourceAssetRequirement,
  type ProducedOutputDraft,
  type ProductionItem,
} from './outputPlan.ts';

type BannerCopy = {
  bannerSpecs: string;
  bannerMainVisual: string;
  bannerShortCopy: string;
  bannerCta: string;
  bannerPromptPlaceholder: string;
  bannerPromptReadiness: string;
  bannerPromptTemplateReady: string;
  bannerPromptNeedsAsset: string;
  bannerPromptNeedsCopy: string;
  bannerAssetFitWarnings: string;
  bannerQuality: string;
  chooseAsset: string;
  qualityUsable: string;
  qualityNeedsFix: string;
  qualityUnusable: string;
};

interface BannerOutputCardProps {
  item: ProductionItem;
  requirements: GameSourceAssetRequirement[];
  assetNamesById: Record<string, string>;
  copy: BannerCopy;
  onChooseSourceAsset?: (asset: GameSourceAssetRequirement) => void;
  onMarkQuality?: (item: ProductionItem, output: ProducedOutputDraft, status: CreativeQualityStatus) => void;
}

const QUALITY_OPTIONS: Array<{ status: CreativeQualityStatus; key: keyof Pick<BannerCopy, 'qualityUsable' | 'qualityNeedsFix' | 'qualityUnusable'> }> = [
  { status: 'usable', key: 'qualityUsable' },
  { status: 'needs_fix', key: 'qualityNeedsFix' },
  { status: 'unusable', key: 'qualityUnusable' },
];

export function BannerOutputCard({
  item,
  requirements,
  assetNamesById,
  copy,
  onChooseSourceAsset,
  onMarkQuality,
}: BannerOutputCardProps) {
  if (item.type !== 'banner' || !item.bannerDetails) return null;

  const mainRequirement = requirements.find((requirement) =>
    requirement.id === item.bannerDetails?.mainVisualRequirementId,
  );
  const logoRequirement = requirements.find((requirement) =>
    requirement.id === item.bannerDetails?.logoRequirementId,
  );
  const selectedMainVisual = item.bannerDetails.selectedMainVisualAssetId;
  const selectedLogo = item.bannerDetails.selectedLogoAssetId;
  const promptOutput = item.producedOutputs?.find((output) => output.kind === 'banner_prompt');
  const promptContext = promptOutput?.bannerPromptContext;
  const specs = item.bannerDetails.specs
    .map((id) => BANNER_OUTPUT_SPECS.find((spec) => spec.id === id))
    .filter(Boolean);
  const readinessLabel = promptContext?.readiness === 'template_ready'
    ? copy.bannerPromptTemplateReady
    : promptContext?.readiness === 'needs_source_asset'
      ? copy.bannerPromptNeedsAsset
      : promptContext?.readiness === 'needs_copy'
        ? copy.bannerPromptNeedsCopy
        : undefined;

  return (
    <div className="mt-4 border-t border-[var(--color-border)]/35 pt-4" data-section="bannerOutputCard">
      <div className="grid gap-3 md:grid-cols-2">
        <BannerInfo label={copy.bannerSpecs}>
          <div className="flex flex-wrap gap-2">
            {specs.map((spec) => spec ? (
              <span
                key={spec.id}
                className="rounded-full border border-[#d5b56a]/25 bg-[#d5b56a]/10 px-3 py-1 text-xs text-[#f4dc90]"
              >
                {spec.label} · {spec.aspectRatio}
              </span>
            ) : null)}
          </div>
        </BannerInfo>
        <BannerInfo label={copy.bannerMainVisual}>
          <div className="text-sm leading-6 text-[var(--color-text-muted)]">
            {selectedMainVisual ? assetNamesById[selectedMainVisual] ?? selectedMainVisual : '-'}
            {selectedLogo ? ` / ${assetNamesById[selectedLogo] ?? selectedLogo}` : ''}
          </div>
          {mainRequirement && onChooseSourceAsset ? (
            <button
              type="button"
              className="mt-2 rounded-lg border border-[var(--color-border)]/60 px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:border-[#d5b56a]/60"
              onClick={() => onChooseSourceAsset(mainRequirement)}
            >
              {copy.chooseAsset}
            </button>
          ) : null}
          {!selectedLogo && logoRequirement && onChooseSourceAsset ? (
            <button
              type="button"
              className="ml-2 mt-2 rounded-lg border border-[var(--color-border)]/60 px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:border-[#d5b56a]/60"
              onClick={() => onChooseSourceAsset(logoRequirement)}
            >
              {logoRequirement.label}
            </button>
          ) : null}
        </BannerInfo>
        <BannerInfo label={copy.bannerShortCopy}>
          {item.bannerDetails.shortCopy}
        </BannerInfo>
        <BannerInfo label={copy.bannerCta}>
          {item.bannerDetails.cta}
        </BannerInfo>
      </div>

      {promptOutput ? (
        <div className="mt-4 rounded-2xl border border-[#d5b56a]/20 bg-[#d5b56a]/8 p-4" data-section="bannerPromptPlaceholder">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e6c66e]">
            {copy.bannerPromptPlaceholder}
          </div>
          {readinessLabel ? (
            <div className="mt-3 flex flex-wrap items-center gap-2" data-section="bannerPromptReadiness">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
                {copy.bannerPromptReadiness}
              </span>
              <span className="rounded-full border border-[#d5b56a]/35 bg-[#d5b56a]/12 px-3 py-1 text-xs font-semibold text-[#ffe9a6]">
                {readinessLabel}
              </span>
            </div>
          ) : null}
          {promptContext?.assetFitWarnings.length ? (
            <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/8 px-3 py-2" data-section="bannerAssetFitWarnings">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">
                {copy.bannerAssetFitWarnings}
              </div>
              <ul className="mt-2 grid gap-1">
                {promptContext.assetFitWarnings.map((warning) => (
                  <li key={warning} className="text-xs leading-5 text-[var(--color-text-muted)]">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--color-text-muted)]">
            {promptOutput.body}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2" data-section="bannerQualityControls">
            <span className="mr-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
              {copy.bannerQuality}
            </span>
            {QUALITY_OPTIONS.map((option) => {
              const active = promptOutput.qualityStatus === option.status;
              return (
                <button
                  type="button"
                  key={option.status}
                  onClick={() => onMarkQuality?.(item, promptOutput, option.status)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'border-[#d5b56a] bg-[#d5b56a]/20 text-[#ffe9a6]'
                      : 'border-[var(--color-border)]/55 text-[var(--color-text-muted)] hover:border-[#d5b56a]/60'
                  }`}
                >
                  {copy[option.key]}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BannerInfo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
        {label}
      </div>
      <div className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{children}</div>
    </div>
  );
}
