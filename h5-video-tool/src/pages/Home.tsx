import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateFlow } from '../context/CreateFlowContext';

// ─── 步骤定义 ────────────────────────────────────────────────────────────────

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

// ─── 图标 ─────────────────────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export function Home() {
  const navigate = useNavigate();
  const { setPrompt, setTemplateId, setVideoAspectRatio, setVideoDuration } = useCreateFlow();
  const [draft, setDraft] = useState('');

  // 步骤完成状态感知（轻量版：读 localStorage）
  const [stepsDone, setStepsDone] = useState({ materials: false, video: false });
  useEffect(() => {
    try {
      const hasMaterials = !!localStorage.getItem('h5-materials-tab'); // 去过素材页就算
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-2 pb-12 pt-8">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="gobs-card relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-[var(--color-primary)]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 right-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative text-center flex flex-col items-center gap-4">
          <span className="rounded-full border border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 px-3 py-1 text-[11px] font-semibold text-[var(--color-primary-hover)]">
            GOBS Creative Suite
          </span>
          <h1 className="text-3xl font-semibold text-[var(--color-text)] tracking-tight sm:text-5xl">
            洞察即灵感，秒速出视频
          </h1>
          <p className="max-w-2xl text-sm text-[var(--color-text-muted)] sm:text-base">
            上传素材、生成分镜、自动出片、分发社媒，完整链路在一个工作台完成。
          </p>
        </div>

        {/* 快速输入框 */}
        <div className="gobs-glass relative mt-5 w-full overflow-hidden rounded-2xl border border-[var(--color-border)]/70 shadow-xl">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                goCreate();
              }
            }}
            rows={4}
            placeholder="直接输入创意，按 Enter 开始生成…"
            className="min-h-[120px] w-full resize-none bg-transparent px-5 py-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)]/70 bg-[var(--color-surface)]/30 px-4 py-3">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => goCreate(idea)}
                  className="rounded-full border border-[var(--color-border)]/80 px-2.5 py-1 text-xs text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/65 hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary-hover)] transition-all"
                >
                  {idea}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => goCreate()}
              className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg transition-all hover:scale-105 hover:bg-[var(--color-primary-hover)] active:scale-95"
              title="开始创作（Enter）"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </section>

      {/* ── 三步流程 ──────────────────────────────────────────────────────────── */}
      <section className="gobs-card rounded-3xl p-5 sm:p-6">
        <h2 className="mb-5 text-center text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
          三步完成从素材到发布
        </h2>

        <div className="flex flex-col sm:flex-row gap-4 items-stretch">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isDone = (step.num === 1 && stepsDone.materials) || (step.num === 2 && stepsDone.video);
            return (
              <div key={step.num} className="flex flex-col sm:flex-row items-stretch flex-1 gap-4">
                {/* 卡片 */}
                <button
                  type="button"
                  onClick={() => navigate(step.to)}
                  className={`group relative flex-1 flex flex-col gap-3 p-5 rounded-2xl border text-left hover:shadow-lg transition-all overflow-hidden ${
                    isDone
                      ? 'border-[var(--color-success)]/50 bg-[var(--color-surface-elevated)] hover:border-[var(--color-success)]/80'
                      : 'border-[var(--color-border)]/75 bg-[var(--color-surface-elevated)] hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  {/* 步骤数 + 完成标记 */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--color-text-muted)] tracking-widest uppercase">
                      Step {step.num}
                    </span>
                    {isDone && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-success)]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        已完成
                      </span>
                    )}
                  </div>

                  {/* 图标 */}
                  <div className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDone ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]' : 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                  }`}>
                    <Icon />
                  </div>

                  {/* 文案 */}
                  <div className="relative z-10 flex-1">
                    <p className="font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                      {step.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  {/* 按钮 */}
                  <div className={`relative z-10 flex items-center gap-1.5 text-xs font-medium ${isDone ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-primary)]'}`}>
                    {isDone ? '再次进入' : step.action}
                    <ArrowRightIcon />
                  </div>
                </button>

                {/* 连接箭头（步骤之间） */}
                {idx < STEPS.length - 1 && (
                  <div className="hidden sm:flex items-center flex-shrink-0 text-[var(--color-border)]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 快捷入口 ──────────────────────────────────────────────────────────── */}
      <section className="gobs-card rounded-3xl p-5 sm:p-6">
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
          快捷入口
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SHORTCUTS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => navigate(s.to)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] transition-all text-sm hover:text-[var(--color-text)] ${
                s.hot
                  ? 'border-[var(--color-primary)]/50 hover:border-[var(--color-primary)]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'
              }`}
            >
              {s.hot && (
                <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-primary)] text-white">
                  HOT
                </span>
              )}
              <span className="text-2xl">{s.emoji}</span>
              <span className={`font-medium text-xs ${s.hot ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>{s.label}</span>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}

// ─── 快捷入口数据 ──────────────────────────────────────────────────────────────

const SHORTCUTS = [
  { emoji: '🎬', label: '模板市场', to: '/studio?tab=templates', hot: true },
  { emoji: '📂', label: '历史视频', to: '/history', hot: false },
  { emoji: '✂️', label: '视频剪辑', to: '/editor', hot: false },
  { emoji: '📱', label: '视频分发', to: '/distribute', hot: false },
  { emoji: '📲', label: '风控大师', to: '/tiktok-matrix', hot: false },
] as const;
