import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const QUICK_IDEAS = [
  '15 秒竖屏产品种草，开箱特写',
  '热血运动短片，慢动作结尾',
  '萌宠日常 Vlog，暖色客厅',
  '赛博城市夜景，镜头推进',
] as const;

const FEATURE_CARDS = [
  {
    to: '/studio?tab=templates',
    title: '从模板创建',
    subtitle: '精选 Prompt 模板，快速出片',
    gradient: 'from-violet-600/90 via-purple-600/80 to-fuchsia-500/70',
    badge: null as string | null,
    linkState: undefined as { autoSelectCustom?: boolean } | undefined,
  },
  {
    to: '/studio',
    title: '自定义创作',
    subtitle: '自由输入创意，导演知识优化',
    gradient: 'from-indigo-600/90 via-violet-600/75 to-sky-500/65',
    badge: null as string | null,
    linkState: { autoSelectCustom: true } as const,
  },
  {
    to: '/materials',
    title: '素材管理',
    subtitle: 'Drive 素材库，参考图与视频',
    gradient: 'from-emerald-600/85 via-teal-600/75 to-cyan-500/65',
    badge: null as string | null,
    linkState: undefined as { autoSelectCustom?: boolean } | undefined,
  },
  {
    to: '/distribute',
    title: '视频分发',
    subtitle: '多平台发布，验证 idea 表现',
    gradient: 'from-amber-600/85 via-orange-600/75 to-rose-500/70',
    badge: null as string | null,
    linkState: undefined as { autoSelectCustom?: boolean } | undefined,
  },
] as const;

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export function Home() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState('');

  const goStudioCustom = useCallback(
    (seed?: string) => {
      const text = (seed ?? draft).trim();
      navigate('/studio', {
        state: {
          autoSelectCustom: true as const,
          ...(text ? { seedPrompt: text } : {}),
        },
      });
    },
    [navigate, draft],
  );

  return (
    <div className="w-full max-w-[min(100%,90rem)] mx-auto flex flex-col gap-12 pb-8 px-0 sm:px-1 pt-8 sm:pt-12 md:pt-16">
      <section className="flex flex-col items-center text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[var(--color-text)] tracking-tight max-w-4xl w-full">
          洞察秒转视频，发布即是验证
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[var(--color-text-muted)] max-w-3xl w-full">
          Glimpse the idea. Obtain the video. Boost your growth.
        </p>

        <div className="mt-8 w-full max-w-5xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-sm overflow-hidden">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                goStudioCustom();
              }
            }}
            rows={5}
            placeholder="今天想让灵感从哪里开始？"
            className="w-full px-4 py-4 bg-transparent text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-subtle)] resize-none focus:outline-none focus:ring-0 min-h-[120px]"
          />
          <div className="flex items-center justify-between gap-3 px-3 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]/50">
            <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <Link
                to="/materials"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                素材
              </Link>
              <Link
                to="/studio?tab=templates"
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                模板市场
              </Link>
            </div>
            <button
              type="button"
              onClick={() => goStudioCustom()}
              className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[var(--color-text)] text-[var(--color-surface)] hover:opacity-90 transition-opacity shadow-md"
              title="进入创作（Enter）"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2 w-full max-w-5xl">
          {QUICK_IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => {
                setDraft(idea);
                goStudioCustom(idea);
              }}
              className="px-3 py-1.5 rounded-full text-xs border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-text)] transition-colors"
            >
              {idea}
            </button>
          ))}
        </div>
      </section>

      {/* 常用功能：四宫格 */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-4">
          常用功能
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURE_CARDS.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              state={card.linkState}
              className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] min-h-[140px] flex flex-col justify-between p-5 text-left transition-all hover:border-[var(--color-primary)]/40 hover:shadow-lg hover:shadow-[var(--color-primary)]/10"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-40 group-hover:opacity-55 transition-opacity`}
                aria-hidden
              />
              <div className="absolute inset-0 bg-[var(--color-surface-elevated)]/75 group-hover:bg-[var(--color-surface-elevated)]/65 transition-colors" aria-hidden />
              {card.badge && (
                <span className="relative z-10 self-start px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/90 text-white">
                  {card.badge}
                </span>
              )}
              <div className="relative z-10 mt-auto">
                <span className="block text-lg font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                  {card.title}
                </span>
                <span className="mt-1 block text-sm text-[var(--color-text-muted)]">{card.subtitle}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
