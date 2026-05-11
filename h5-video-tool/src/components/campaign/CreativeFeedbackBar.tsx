import type { CreativeFeedbackTag } from './feedback/creativeFeedbackTypes.ts';
import type { CreativeFeedbackTagDefinition } from './feedback/creativeFeedbackTypes.ts';

type CreativeFeedbackCopy = Record<CreativeFeedbackTag, string>;

interface CreativeFeedbackBarProps {
  definitions: CreativeFeedbackTagDefinition[];
  selectedTagIds: CreativeFeedbackTag[];
  copy: CreativeFeedbackCopy;
  onToggleTag: (tag: CreativeFeedbackTag) => void;
}

export function CreativeFeedbackBar({
  definitions,
  selectedTagIds,
  copy,
  onToggleTag,
}: CreativeFeedbackBarProps) {
  const selected = new Set(selectedTagIds);
  return (
    <div className="flex flex-wrap gap-2" data-section="creativeFeedbackTags">
      {definitions.map((definition) => {
        const active = selected.has(definition.id);
        return (
          <button
            key={definition.id}
            type="button"
            onClick={() => onToggleTag(definition.id)}
            className={[
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
              active
                ? 'border-[#d5b56a] bg-[#d5b56a]/20 text-[#ffe9a6]'
                : 'border-[var(--color-border)]/55 text-[var(--color-text-muted)] hover:border-[#d5b56a]/60',
            ].join(' ')}
          >
            {copy[definition.id] ?? definition.defaultLabel}
          </button>
        );
      })}
    </div>
  );
}
