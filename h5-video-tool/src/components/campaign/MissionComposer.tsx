import type { CampaignCreativeMode } from './model';

type ModeOption = {
  value: CampaignCreativeMode;
  title: string;
  description: string;
};

type BrainStatus = {
  label: string;
  detail: string;
  state: 'ready' | 'loading' | 'warning';
};

interface MissionComposerProps {
  mission: string;
  mode: CampaignCreativeMode;
  modeOptions: ModeOption[];
  brainStatus: BrainStatus;
  loading: boolean;
  error: string | null;
  copy: {
    eyebrow: string;
    title: string;
    subtitle: string;
    placeholder: string;
    generate: string;
    generating: string;
    chipsTitle: string;
    brainTitle: string;
  };
  onMissionChange: (value: string) => void;
  onModeChange: (mode: CampaignCreativeMode) => void;
  onSubmit: () => void;
}

export function MissionComposer({
  mission,
  mode,
  modeOptions,
  brainStatus,
  loading,
  error,
  copy,
  onMissionChange,
  onModeChange,
  onSubmit,
}: MissionComposerProps) {
  const canSubmit = mission.trim().length > 0 && !loading;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[#d5b56a]/25 bg-[#0e1424] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.25)] sm:p-7">
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#e6b84d]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-[#5f7cff]/20 blur-3xl" />
      <div className="relative">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#e6c66e]">{copy.eyebrow}</div>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">{copy.title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b8c2e6]">{copy.subtitle}</p>

        <label className="mt-6 block">
          <textarea
            value={mission}
            onChange={(event) => onMissionChange(event.target.value)}
            rows={5}
            placeholder={copy.placeholder}
            className="min-h-40 w-full resize-none rounded-[1.5rem] border border-[#d5b56a]/25 bg-[#070b15]/80 px-5 py-4 text-base leading-7 text-white outline-none transition placeholder:text-[#687397] focus:border-[#e6c66e]/70 focus:shadow-[0_0_0_4px_rgba(230,198,110,0.12)]"
          />
        </label>

        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7f8bb6]">
              {copy.chipsTitle}
            </div>
            <div className="flex flex-wrap gap-2">
              {modeOptions.map((option) => {
                const active = mode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onModeChange(option.value)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      active
                        ? 'border-[#e6c66e]/60 bg-[#e6c66e]/15 text-white'
                        : 'border-white/10 bg-white/[0.04] text-[#b8c2e6] hover:border-[#e6c66e]/35 hover:text-white'
                    }`}
                    title={option.description}
                  >
                    {option.title}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f8bb6]">{copy.brainTitle}</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-white">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  brainStatus.state === 'ready'
                    ? 'bg-emerald-400'
                    : brainStatus.state === 'loading'
                      ? 'bg-[#e6c66e]'
                      : 'bg-amber-400'
                }`}
              />
              {brainStatus.label}
            </div>
            <div className="mt-1 max-w-xs text-xs leading-5 text-[#9aa6cf]">{brainStatus.detail}</div>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#e6c66e] px-5 py-3 text-sm font-semibold text-[#111827] shadow-[0_18px_45px_rgba(230,198,110,0.22)] transition hover:bg-[#f0d681] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {loading ? copy.generating : copy.generate}
        </button>
      </div>
    </section>
  );
}
