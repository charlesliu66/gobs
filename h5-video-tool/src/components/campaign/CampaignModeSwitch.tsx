import type { CampaignCreativeMode } from './model';

type ModeOption = {
  value: CampaignCreativeMode;
  title: string;
  description: string;
};

interface CampaignModeSwitchProps {
  value: CampaignCreativeMode;
  options: ModeOption[];
  onChange: (value: CampaignCreativeMode) => void;
}

export function CampaignModeSwitch({ value, options, onChange }: CampaignModeSwitchProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-2xl border p-5 text-left transition-all ${
              active
                ? 'border-[var(--color-primary)]/45 bg-[var(--color-primary)]/10 shadow-[0_0_24px_rgba(124,141,255,0.12)]'
                : 'border-[var(--color-border)]/55 bg-[var(--color-surface-elevated)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-[var(--color-text)]">{option.title}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{option.description}</p>
              </div>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                  active
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                    : 'border-[var(--color-border)] text-[var(--color-text-subtle)]'
                }`}
              >
                {active ? '✓' : ''}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
