import { useState, useCallback, useEffect, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateFlow } from '../context/CreateFlowContext';

const STEPS = [
  {
    num: 1,
    title: '上传素材',
    desc: '拖拽或选择图片/视频，作为即梦的参考素材',
    icon: UploadIcon,
    action: '上传素材',
    to: '/materials',
  },
  {
    num: 2,
    title: '生成视频',
    desc: '输入创意描述，调用即梦 AI 生成高质量视频',
    icon: VideoIcon,
    action: '开始创作',
    to: '/studio',
  },
  {
    num: 3,
    title: '分发到社媒',
    desc: '选择目标账号，一键发布到 TikTok、Instagram 等平台',
    icon: ShareIcon,
    action: '去发布',
    to: '/distribute',
  },
] as const;

const QUICK_IDEAS = [
  '15 秒竖屏产品种草，开箱特写',
  '热血运动短片，慢动作结尾',
  '萌宠日常 Vlog，暖色调',
  '赛博城市夜景，镜头推进',
] as const;

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
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

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export function Home() {
  const navigate = useNavigate();
  const { setPrompt, setTemplateId, setVideoAspectRatio, setVideoDuration } = useCreateFlow();
  const [draft, setDraft] = useState('');

  const [stepsDone, setStepsDone] = useState({ materials: false, video: false });
  useEffect(() => {
    try {
      const hasMaterials = !!localStorage.getItem('h5-materials-tab');
      const hasVideo = (() => {
        const raw = localStorage.getItem('videoHistory');
        if (!raw) return false;
        try { return (JSON.parse(raw) as unknown[]).length > 0; } catch { return false; }
      })();
      setStepsDone({ materials: hasMaterials, video: hasVideo });
    } catch { /* ignore */ }
  }, []);

  const goCreate = useCallback(
    (seed?: string) => {
      const text = (seed ?? draft).trim();
      setTemplateId('custom');
      setVideoDuration(8);
      setVideoAspectRatio('9:16');
      if (text) setPrompt(text);
      navigate('/studio', { state: { autoSelectCustom: true, seedPrompt: text } });
    },
    [draft, navigate, setPrompt, setTemplateId, setVideoDuration, setVideoAspectRatio],
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-2 pb-12 pt-6">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="gobs-card relative overflow-hidden rounded-3xl p-8 sm:p-10 animate-fade-in-up">
        {/* Decorative glow orbs — primary + cyan dual accent */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[var(--color-primary)]/20 blur-[100px] animate-glow-pulse" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[var(--color-accent)]/12 blur-[120px]" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-[120%] rounded-full bg-[var(--color-primary)]/5 blur-[80px]" />

        <div className="relative text-center flex flex-col items-center gap-5">
          <span className="chip">
            GOBS Creative Suite
          </span>
          <h1 className="text-3xl sm:text-5xl font-semibold text-[var(--color-text)] tracking-[-0.03em] leading-[1.1]"
            style={{ fontFamily: '"Space Grotesk", "Plus Jakarta Sans", sans-serif' }}
          >
            洞察即灵感，秒速出视频
          </h1>
          <p className="max-w-xl text-sm sm:text-[15px] text-[var(--color-text-muted)] leading-relaxed">
            上传素材、生成分镜、自动出片、分发社媒 — 完整链路在一个工作台完成
          </p>
        </div>

        {/* Prompt Input */}
        <div className="relative mt-8 w-full overflow-hidden rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/50 backdrop-blur-lg shadow-xl transition-all focus-within:border-[var(--color-primary)]/50 focus-within:shadow-[0_0_24px_rgba(124,141,255,0.1)]">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                goCreate();
              }
            }}
            rows={3}
            placeholder="输入你的创意，按 Enter 开始生成…"
            className="min-h-[100px] w-full resize-none bg-transparent px-5 py-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)]/40 px-4 py-2.5">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => goCreate(idea)}
                  className="rounded-full border border-[var(--color-border)]/60 px-2.5 py-1 text-[11px] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/8 hover:text-[var(--color-primary-hover)] transition-all"
                >
                  {idea}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => goCreate()}
              className="btn-primary !p-0 h-9 w-9 flex-shrink-0 !rounded-full"
              title="开始创作（Enter）"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </section>

      {/* ── 三步流程 ─────────────────────────────────────────────────── */}
      <section className="animate-fade-in" style={{ animationDelay: '100ms' }}>
        <p className="section-overline text-center mb-6">三步完成从素材到发布</p>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch stagger-children">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isDone = (step.num === 1 && stepsDone.materials) || (step.num === 2 && stepsDone.video);
            return (
              <div key={step.num} className="flex flex-col sm:flex-row items-stretch flex-1 gap-3">
                <button
                  type="button"
                  onClick={() => navigate(step.to)}
                  className={`group relative flex-1 flex flex-col gap-4 p-5 rounded-2xl border text-left transition-all overflow-hidden ${
                    isDone
                      ? 'border-[var(--color-success)]/40 bg-[var(--color-surface-elevated)] hover:border-[var(--color-success)]/70 hover:shadow-[0_0_20px_rgba(34,197,94,0.06)]'
                      : 'border-[var(--color-border)]/60 bg-[var(--color-surface-elevated)] hover:border-[var(--color-primary)]/50 hover:shadow-[0_0_20px_rgba(124,141,255,0.06)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="section-overline">
                      Step {step.num}
                    </span>
                    {isDone && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-success)]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        已完成
                      </span>
                    )}
                  </div>

                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isDone ? 'bg-[var(--color-success)]/12 text-[var(--color-success)]' : 'bg-[var(--color-primary)]/12 text-[var(--color-primary)]'
                  }`}>
                    <Icon />
                  </div>

                  <div className="flex-1">
                    <p className="card-title group-hover:text-[var(--color-primary)] transition-colors">
                      {step.title}
                    </p>
                    <p className="mt-1.5 text-xs text-[var(--color-text-muted)] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  <div className={`flex items-center gap-1.5 text-xs font-medium ${isDone ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-primary)]'}`}>
                    {isDone ? '再次进入' : step.action}
                    <ArrowRightIcon />
                  </div>
                </button>

                {idx < STEPS.length - 1 && (
                  <div className="hidden sm:flex items-center flex-shrink-0 text-[var(--color-border)]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
                      <polyline points="9 6 15 12 9 18" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 快捷入口 ─────────────────────────────────────────────────── */}
      <section className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        <p className="section-overline mb-5">快捷入口</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 stagger-children">
          {SHORTCUTS.map((s) => {
            const SIcon = s.icon;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => navigate(s.to)}
                className={`group relative flex flex-col items-center gap-3 p-4 rounded-xl border bg-[var(--color-surface-elevated)] transition-all text-sm ${
                  s.hot
                    ? 'border-[var(--color-primary)]/30 hover:border-[var(--color-primary)]/60 hover:shadow-[0_0_20px_rgba(124,141,255,0.1)]'
                    : s.accent
                      ? 'border-[var(--color-accent)]/20 hover:border-[var(--color-accent)]/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.08)]'
                      : 'border-[var(--color-border)]/50 hover:border-[var(--color-primary)]/30'
                } hover:bg-[var(--color-surface-hover)]`}
              >
                {s.hot && (
                  <span className="absolute -top-1.5 -right-1.5 chip !text-[8px] !py-0 !px-1.5 !border-0 bg-[var(--color-primary)] !text-white">
                    HOT
                  </span>
                )}
                <span className={`${
                  s.hot ? 'text-[var(--color-primary)]' : s.accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-subtle)]'
                } group-hover:text-[var(--color-text)] transition-colors group-hover:scale-110 transition-transform duration-200`}>
                  <SIcon />
                </span>
                <span className={`font-medium text-xs ${
                  s.hot ? 'text-[var(--color-primary)]' : s.accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
                } group-hover:text-[var(--color-text)] transition-colors`}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

    </div>
  );
}

function TemplateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="9" height="8" rx="2" />
      <rect x="15" y="14" width="7" height="8" rx="2" />
    </svg>
  );
}

function HistoryClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ScissorsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

const SHORTCUTS: { icon: () => JSX.Element; label: string; to: string; hot: boolean; accent?: boolean }[] = [
  { icon: TemplateIcon, label: '模板市场', to: '/studio?tab=templates', hot: true },
  { icon: HistoryClockIcon, label: '历史视频', to: '/history', hot: false },
  { icon: ScissorsIcon, label: '视频剪辑', to: '/editor', hot: false },
  { icon: RocketIcon, label: '视频分发', to: '/distribute', hot: false, accent: true },
  { icon: ShieldIcon, label: '风控大师', to: '/tiktok-matrix', hot: false },
];
