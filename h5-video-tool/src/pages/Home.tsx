import { useNavigate } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleContext.tsx';

function CampaignIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l2.7 5.48L21 9.36l-4.5 4.38 1.06 6.2L12 17.25 6.44 19.94l1.06-6.2L3 9.36l6.3-.88L12 3z" />
    </svg>
  );
}

function QuickValidateIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function ProductionIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <line x1="6" y1="4" x2="6" y2="22" />
      <line x1="12" y1="4" x2="12" y2="22" />
      <line x1="18" y1="4" x2="18" y2="22" />
      <line x1="2" y1="11" x2="22" y2="11" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function Home() {
  const navigate = useNavigate();
  const { t } = useLocale();

  const paths = [
    {
      icon: CampaignIcon,
      title: t('home.paths.campaignCreative.title'),
      desc: t('home.paths.campaignCreative.desc'),
      action: t('home.paths.campaignCreative.action'),
      to: '/campaign-creative',
      highlight: true,
    },
    {
      icon: QuickValidateIcon,
      title: t('home.paths.quickValidate.title'),
      desc: t('home.paths.quickValidate.desc'),
      action: t('home.paths.quickValidate.action'),
      to: '/quickfilm',
      highlight: false,
    },
    {
      icon: ProductionIcon,
      title: t('home.paths.production.title'),
      desc: t('home.paths.production.desc'),
      action: t('home.paths.production.action'),
      to: '/studio/production',
      highlight: false,
    },
  ] as const;

  const quickIdeas = [
    t('home.quickIdeas.items.launch'),
    t('home.quickIdeas.items.boss'),
    t('home.quickIdeas.items.gacha'),
    t('home.quickIdeas.items.event'),
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-2 pb-12 pt-6">
      <section className="gobs-card relative overflow-hidden rounded-3xl p-8 sm:p-10 animate-fade-in-up">
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[var(--color-primary)]/20 blur-[100px] animate-glow-pulse" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[var(--color-accent)]/12 blur-[120px]" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-40 w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-primary)]/5 blur-[80px]" />

        <div className="relative flex flex-col gap-6">
          <span className="chip w-fit">{t('home.hero.badge')}</span>
          <h1
            className="text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--color-text)] sm:text-5xl"
            style={{ fontFamily: '"Space Grotesk", "Plus Jakarta Sans", sans-serif' }}
          >
            {t('home.hero.title')}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)] sm:text-[15px]">
            {t('home.hero.subtitle')}
          </p>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate('/campaign-creative')} className="btn-primary">
              {t('home.hero.primaryCta')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/studio')}
              className="rounded-full border border-[var(--color-border)]/70 bg-[var(--color-surface)] px-5 py-3 text-sm font-medium text-[var(--color-text)] transition-all hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-surface-hover)]"
            >
              {t('home.hero.secondaryCta')}
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)]/55 bg-[var(--color-surface)]/55 p-4 backdrop-blur-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
              {t('home.quickIdeas.title')}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {quickIdeas.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => navigate('/campaign-creative', { state: { seedIdea: idea } })}
                  className="rounded-full border border-[var(--color-border)]/60 px-3 py-1.5 text-[12px] text-[var(--color-text-muted)] transition-all hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/8 hover:text-[var(--color-primary-hover)]"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="animate-fade-in" style={{ animationDelay: '100ms' }}>
        <p className="section-overline mb-6 text-center">{t('home.paths.title')}</p>

        <div className="grid gap-4 lg:grid-cols-3 stagger-children">
          {paths.map((path) => {
            const Icon = path.icon;
            return (
              <button
                key={path.title}
                type="button"
                onClick={() => navigate(path.to)}
                className={`group relative flex flex-col gap-4 rounded-2xl border p-6 text-left transition-all ${
                  path.highlight
                    ? 'border-[var(--color-primary)]/35 bg-[var(--color-primary)]/8 hover:border-[var(--color-primary)]/60 hover:shadow-[0_0_24px_rgba(124,141,255,0.12)]'
                    : 'border-[var(--color-border)]/60 bg-[var(--color-surface-elevated)] hover:border-[var(--color-primary)]/40 hover:shadow-[0_0_20px_rgba(124,141,255,0.06)]'
                }`}
              >
                {path.highlight && (
                  <span className="chip-cyan w-fit !px-2 !py-0.5 !text-[10px]">{t('home.paths.recommended')}</span>
                )}
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-surface)] text-[var(--color-primary)]">
                  <Icon />
                </div>
                <div>
                  <p className="card-title transition-colors group-hover:text-[var(--color-primary)]">{path.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{path.desc}</p>
                </div>
                <div className="mt-auto flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]">
                  {path.action}
                  <ArrowRightIcon />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/8 p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
              {t('home.reviewQueue.title')}
            </div>
            <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">
              {t('home.reviewQueue.body')}
            </p>
            <div className="mt-4 grid gap-3">
              <ReviewQueueItem body={t('home.reviewQueue.items.guardrails')} />
              <ReviewQueueItem body={t('home.reviewQueue.items.variant')} />
            </div>
            <button
              type="button"
              onClick={() => navigate('/campaign-creative')}
              className="mt-5 rounded-full border border-[var(--color-primary)]/35 bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-primary)] transition-all hover:border-[var(--color-primary)]/55 hover:bg-[var(--color-primary)]/10"
            >
              {t('home.paths.campaignCreative.action')}
            </button>
          </div>

          <ValueCard
            title={t('home.advancedStudio.title')}
            body={t('home.advancedStudio.body')}
          />
        </div>
      </section>

      <section className="animate-fade-in" style={{ animationDelay: '260ms' }}>
        <div className="grid gap-4 lg:grid-cols-3">
          <ValueCard
            title={t('home.outcomes.brief.title')}
            body={t('home.outcomes.brief.body')}
          />
          <ValueCard
            title={t('home.outcomes.strategy.title')}
            body={t('home.outcomes.strategy.body')}
          />
          <ValueCard
            title={t('home.outcomes.handoff.title')}
            body={t('home.outcomes.handoff.body')}
          />
        </div>
      </section>
    </div>
  );
}

function ReviewQueueItem({ body }: { body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)]/55 bg-[var(--color-surface)]/80 px-4 py-3 text-sm leading-6 text-[var(--color-text)]">
      {body}
    </div>
  );
}

function ValueCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)]/55 bg-[var(--color-surface-elevated)] p-5">
      <div className="text-base font-semibold text-[var(--color-text)]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{body}</p>
    </div>
  );
}
