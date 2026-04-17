import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  startQuickFilm,
  confirmStoryboard,
  saveDraft,
  listDrafts,
  loadDraft,
  deleteDraft,
  saveSession,
  loadSession,
  clearSession,
} from '../api/quickfilm';
import type { ShotWithAssets, JobStep, DraftMeta, DraftData } from '../api/quickfilm';
import { createProject } from '../api/projectsStorage';
import { toast } from '../components/Toast';
import { RunningStatus } from '../components/RunningStatus';

// ─── Step 1: 输入 ────────────────────────────────────────────────────────────

const STYLE_OPTIONS = ['古装', '现代', '游戏', '动漫', '科幻', '自定义'] as const;
type StyleOption = (typeof STYLE_OPTIONS)[number];

interface Step1Form {
  story: string;
  protagonist: string;
  protagonistDesc: string;
  style: StyleOption;
  customStyle: string;
  styleImageBase64?: string;
  assetFiles: Array<{ name: string; base64: string }>;
}

function Step1({
  onSubmit,
  onRestoreStoryboard,
}: {
  onSubmit: (form: Step1Form) => void;
  onRestoreStoryboard?: (draft: DraftData) => void;
}) {
  const [form, setForm] = useState<Step1Form>({
    story: '',
    protagonist: '',
    protagonistDesc: '',
    style: '现代',
    customStyle: '',
    assetFiles: [],
  });
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleImgRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  // Draft state
  const [drafts, setDrafts] = useState<DraftMeta[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load drafts on mount
  useEffect(() => {
    listDrafts().then(setDrafts).catch(() => {/* ignore */});
  }, []);

  // Auto-save draft 10s after input changes
  useEffect(() => {
    if (!form.story.trim() && !form.protagonist.trim()) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      void handleSaveDraft(true);
    }, 10000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.story, form.protagonist, form.protagonistDesc, form.style, form.customStyle]);

  async function handleSaveDraft(silent = false) {
    if (!form.story.trim() && !form.protagonist.trim()) return;
    setSavingDraft(true);
    try {
      const res = await saveDraft({
        id: currentDraftId ?? undefined,
        name: form.story.slice(0, 20) || '未命名草稿',
        story: form.story,
        protagonist: form.protagonist,
        protagonistDesc: form.protagonistDesc,
        style: form.style,
        customStyle: form.customStyle,
        styleImageBase64: form.styleImageBase64,
        assetFiles: form.assetFiles,
      });
      setCurrentDraftId(res.id);
      const updated = await listDrafts();
      setDrafts(updated);
      if (!silent) toast.success('草稿已保存');
    } catch (err) {
      if (!silent) toast.error(err instanceof Error ? err.message : '保存草稿失败');
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleLoadDraft(id: string) {
    try {
      const draft = await loadDraft(id);
      if (draft.storyboard && draft.storyboard.length > 0 && onRestoreStoryboard) {
        onRestoreStoryboard(draft);
        setShowDrafts(false);
        toast.success('已恢复分镜草稿');
        return;
      }
      setForm({
        story: draft.story,
        protagonist: draft.protagonist,
        protagonistDesc: draft.protagonistDesc,
        style: (STYLE_OPTIONS as readonly string[]).includes(draft.style) ? draft.style as StyleOption : '自定义',
        customStyle: draft.customStyle,
        styleImageBase64: draft.styleImageBase64,
        assetFiles: draft.assetFiles ?? [],
      });
      setCurrentDraftId(id);
      setShowDrafts(false);
      toast.success('草稿已加载');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加载草稿失败');
    }
  }

  async function handleDeleteDraft(id: string) {
    try {
      await deleteDraft(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      if (currentDraftId === id) setCurrentDraftId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除草稿失败');
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/'),
    );
    processFiles(files);
  }

  function processFiles(files: File[]) {
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1] ?? '';
        setForm((prev) => ({
          ...prev,
          assetFiles: [...prev.assetFiles, { name: file.name, base64 }],
        }));
      };
      reader.readAsDataURL(file);
    });
  }

  function handleStyleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1] ?? '';
      setForm((prev) => ({ ...prev, styleImageBase64: base64 }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!form.story.trim()) {
      toast.error('请描述故事内容');
      return;
    }
    setLoading(true);
    try {
      onSubmit(form);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-[var(--color-text)] mb-2">🎬 一键成片</h1>
        <p className="text-[var(--color-text-muted)] text-base">填三个问题，剩下交给我们</p>
        {/* 草稿入口 */}
        {drafts.length > 0 && (
          <button
            type="button"
            onClick={() => setShowDrafts(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline"
          >
            📋 草稿列表
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold">{drafts.length}</span>
          </button>
        )}
      </div>

      {/* 草稿列表弹窗 */}
      {showDrafts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setShowDrafts(false)}>
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">📋 草稿列表</h2>
            {drafts.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">暂无草稿</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {drafts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleLoadDraft(d.id)}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">
                        {d.name}
                        {d.hasStoryboard && <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-primary)]/20 text-[var(--color-primary)]">含分镜</span>}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-subtle)]">
                        {new Date(d.updatedAt).toLocaleString('zh-CN')}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDraft(d.id)}
                      className="ml-2 text-xs text-red-400 hover:text-red-300"
                    >删除</button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDrafts(false)}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >关闭</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* 故事描述 */}
        <div className="bg-[var(--color-surface-elevated)] rounded-2xl p-6 border border-[var(--color-border)]">
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-3">
            🎬 这个视频是关于什么的？
          </label>
          <textarea
            value={form.story}
            onChange={(e) => setForm({ ...form, story: e.target.value })}
            placeholder="用一句话描述故事，例如：一个孤独的武士在雪夜保护村庄"
            rows={3}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] placeholder-[var(--color-text-subtle)] resize-none focus:outline-none focus:border-[var(--color-primary)] transition text-sm"
          />
        </div>

        {/* 主角 */}
        <div className="bg-[var(--color-surface-elevated)] rounded-2xl p-6 border border-[var(--color-border)]">
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-3">
            👤 主角是谁？
          </label>
          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              value={form.protagonist}
              onChange={(e) => setForm({ ...form, protagonist: e.target.value })}
              placeholder="角色名（如：剑圣李明）"
              className="w-full sm:w-40 flex-shrink-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-primary)] transition text-sm"
            />
            <input
              type="text"
              value={form.protagonistDesc}
              onChange={(e) => setForm({ ...form, protagonistDesc: e.target.value })}
              placeholder="一句话描述外貌/性格（可选，填得越详细视频越精准）"
              className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-primary)] transition text-sm"
            />
          </div>
        </div>

        {/* 风格 */}
        <div className="bg-[var(--color-surface-elevated)] rounded-2xl p-6 border border-[var(--color-border)]">
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-3">
            🎨 视频风格
          </label>
          <div className="flex flex-wrap gap-2 mb-4">
            {STYLE_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm({ ...form, style: s })}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  form.style === s
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-text)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {form.style === '自定义' && (
            <input
              type="text"
              value={form.customStyle}
              onChange={(e) => setForm({ ...form, customStyle: e.target.value })}
              placeholder="描述你想要的风格，如：蒸汽朋克、水墨风..."
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-primary)] transition text-sm mb-3"
            />
          )}
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={() => styleImgRef.current?.click()}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition flex items-center gap-1.5 border border-dashed border-[var(--color-border)] rounded-lg px-3 py-2 hover:border-[var(--color-primary)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              {form.styleImageBase64 ? '已上传风格参考图 ✓' : '上传风格参考图（可选）'}
            </button>
            <input ref={styleImgRef} type="file" accept="image/*" className="hidden" onChange={handleStyleImage} />
          </div>
        </div>

        {/* 素材上传 */}
        <div className="bg-[var(--color-surface-elevated)] rounded-2xl p-6 border border-[var(--color-border)]">
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-1">
            📁 上传角色立绘/场景图（可选）
          </label>
          <p className="text-xs text-[var(--color-text-subtle)] mb-3">上传越多，视频质量越高，AI 会自动识别并匹配</p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragging
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            <div className="text-2xl mb-2">🖼️</div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {form.assetFiles.length > 0
                ? `已选 ${form.assetFiles.length} 张图片，点击继续添加`
                : '拖拽图片到此处，或点击选择'}
            </p>
            <p className="text-xs text-[var(--color-text-subtle)] mt-1">支持 JPG/PNG/WebP</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => processFiles(Array.from(e.target.files ?? []))}
          />
          {form.assetFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {form.assetFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text-muted)]">
                  🖼 {f.name}
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, assetFiles: prev.assetFiles.filter((_, j) => j !== i) }))}
                    className="text-[var(--color-text-subtle)] hover:text-[var(--color-error)] ml-1"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 保存草稿按钮 */}
        <button
          type="button"
          onClick={() => handleSaveDraft(false)}
          disabled={savingDraft || (!form.story.trim() && !form.protagonist.trim())}
          className="w-full py-3 rounded-2xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)] disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all flex items-center justify-center gap-2"
        >
          {savingDraft ? '保存中…' : '💾 保存草稿'}
        </button>

        {/* 提交按钮 */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !form.story.trim()}
          className="w-full py-4 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base transition-all shadow-lg hover:shadow-[var(--color-primary)]/30 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
        >
          <span>🚀</span>
          <span>开始生成</span>
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: 处理中 ───────────────────────────────────────────────────────────

function Step2({
  jobId,
  onDone,
  onError,
  onRestart,
}: {
  jobId: string;
  onDone: (storyboard: ShotWithAssets[], logline?: string) => void;
  onError?: () => void;
  onRestart?: () => void;
}) {
  const [steps, setSteps] = useState<JobStep[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef(Date.now());
  const TIMEOUT_MS = 5 * 60 * 1000; // 5 分钟超时

  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);
  onDoneRef.current = onDone;
  onErrorRef.current = onError;

  useEffect(() => {
    const BASE = import.meta.env.VITE_API_BASE_URL || '';
    const token = localStorage.getItem('gobs_token') ?? '';
    if (!token) {
      setError('登录已过期，请重新登录');
      onErrorRef.current?.();
      return;
    }

    const url = `${BASE}/api/quickfilm/${encodeURIComponent(jobId)}/stream?token=${encodeURIComponent(token)}`;
    let retryCount = 0;
    const MAX_RETRIES = 2;
    let es: EventSource | null = null;
    let closed = false;

    const timeoutTimer = setTimeout(() => {
      closed = true;
      es?.close();
      setError('生成超时（5分钟），请重试');
      onErrorRef.current?.();
    }, TIMEOUT_MS - (Date.now() - startTimeRef.current));

    function connect() {
      if (closed) return;
      es = new EventSource(url);

      es.onmessage = (e: MessageEvent) => {
        retryCount = 0;
        try {
          const job = JSON.parse(e.data as string) as {
            status: string;
            progress?: number;
            steps?: JobStep[];
            storyboard?: ShotWithAssets[];
            error?: string;
            storyArc?: { logline?: string };
          };
          setSteps(job.steps ?? []);
          setProgress(job.progress ?? 0);

          if (job.status === 'done' && job.storyboard) {
            closed = true;
            clearTimeout(timeoutTimer);
            es?.close();
            onDoneRef.current(job.storyboard, job.storyArc?.logline);
            return;
          }
          if (job.status === 'error') {
            closed = true;
            clearTimeout(timeoutTimer);
            es?.close();
            setError(job.error ?? '生成失败，请重试');
            onErrorRef.current?.();
          }
        } catch { /* ignore parse errors */ }
      };

      es.onerror = () => {
        es?.close();
        if (closed) return;
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.warn(`[QuickFilm SSE] 连接失败，${retryCount}s 后重试 (${retryCount}/${MAX_RETRIES})`);
          setTimeout(connect, retryCount * 1000);
        } else {
          closed = true;
          clearTimeout(timeoutTimer);
          setError('连接服务器失败，请检查网络后刷新页面重试');
          onErrorRef.current?.();
        }
      };
    }

    connect();

    return () => {
      closed = true;
      clearTimeout(timeoutTimer);
      es?.close();
    };
  }, [jobId]);

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="text-5xl mb-4">😟</div>
        <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">出了点问题</h2>
        <p className="text-[var(--color-text-muted)] mb-6">{error}</p>
        <button
          type="button"
          onClick={() => onRestart ? onRestart() : window.location.reload()}
          className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium hover:bg-[var(--color-primary-hover)] transition"
        >
          重新开始
        </button>
      </div>
    );
  }

  const defaultSteps: JobStep[] = [
    { name: '分析故事结构', done: false },
    { name: '生成角色设定', done: false },
    { name: '生成分镜脚本', done: false },
    { name: '匹配素材库', done: false },
    { name: '准备视频生成', done: false },
  ];

  const displaySteps = steps.length > 0 ? steps : defaultSteps;
  const currentIdx = displaySteps.findIndex((s) => !s.done);

  return (
    <div className="max-w-xl mx-auto py-16 px-4">
      <div className="text-center mb-10">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-border)" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke="var(--color-primary)" strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[var(--color-primary)]">
            {progress}%
          </div>
        </div>
        <h2 className="text-xl font-bold text-[var(--color-text)] mb-1">联合编剧正在创作中</h2>
        <p className="text-sm text-[var(--color-text-muted)]">编剧室的灯还亮着，通常需要 1-2 分钟</p>
      </div>

      <div className="bg-[var(--color-surface-elevated)] rounded-2xl p-6 border border-[var(--color-border)] space-y-4">
        {displaySteps.map((step, i) => {
          const isCurrent = i === currentIdx && !step.done;
          return (
            <div key={step.name} className="flex items-center gap-3">
              <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                {step.done ? (
                  <span className="text-[var(--color-success)] text-base">✅</span>
                ) : isCurrent ? (
                  <span className="inline-block w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-[var(--color-text-subtle)] text-base">⬜</span>
                )}
              </div>
              <span className={`text-sm ${
                step.done
                  ? 'text-[var(--color-text)] line-through opacity-60'
                  : isCurrent
                  ? 'text-[var(--color-primary)] font-semibold'
                  : 'text-[var(--color-text-subtle)]'
              }`}>
                {step.name}
                {isCurrent && <span className="ml-1 opacity-70">...</span>}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-[var(--color-text-subtle)] mt-6">
        AI 正在分析故事、生成分镜、匹配素材，完成后自动跳转
      </p>
    </div>
  );
}

// ─── Step 3: 分镜确认 ─────────────────────────────────────────────────────────

function ShotCard({
  shot,
  index,
  assetFiles,
  onUpdateShot,
}: {
  shot: ShotWithAssets;
  index: number;
  assetFiles: Array<{ name: string; base64: string }>;
  onUpdateShot: (updated: ShotWithAssets) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState<'character' | 'scene' | null>(null);
  const hasAssets =
    (shot.matchedAssets?.characterRefs?.length ?? 0) > 0 ||
    shot.matchedAssets?.sceneRef != null;
  return (
    <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl overflow-hidden transition-all hover:border-[var(--color-border-focus)]/50">
      {/* 折叠视图（默认） */}
      <div
        className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-[var(--color-surface-hover)] transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-shrink-0 w-12 text-center">
          <span className="text-xs text-[var(--color-text-subtle)]">#{index + 1}</span>
          <div className="text-xs font-bold text-[var(--color-text)]">{shot.durationSec}秒</div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--color-text)] truncate">{shot.subject} — {shot.action}</p>
          <p className="text-xs text-[var(--color-text-subtle)] truncate mt-0.5">{shot.structuredStill.sp_environment}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {hasAssets ? (
            <div className="flex gap-1">
              {shot.matchedAssets?.characterRefs.slice(0, 1).map((a) => (
                <div key={a.id} title={a.name} className="w-7 h-7 rounded-md bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 flex items-center justify-center text-xs">
                  👤
                </div>
              ))}
              {shot.matchedAssets?.sceneRef && (
                <div title={shot.matchedAssets.sceneRef.name} className="w-7 h-7 rounded-md bg-[var(--color-success)]/20 border border-[var(--color-success)]/40 flex items-center justify-center text-xs">
                  🏞
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-2 py-0.5 text-[var(--color-text-subtle)]">
              AI生成
            </span>
          )}
          <svg
            className={`w-4 h-4 text-[var(--color-text-subtle)] transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div className="border-t border-[var(--color-border)] px-4 py-4 space-y-3 bg-[var(--color-surface)]/50">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[var(--color-text-subtle)]">景别：</span>
              <span className="text-[var(--color-text)]">{shot.shotScale}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-subtle)]">运镜：</span>
              <span className="text-[var(--color-text)]">{shot.cameraMove}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-subtle)]">情绪：</span>
              <span className="text-[var(--color-text)]">{shot.emotion}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-subtle)]">时长：</span>
              <span className="text-[var(--color-text)]">{shot.durationSec}s</span>
            </div>
          </div>
          {shot.dialogue && (
            <div className="text-xs">
              <span className="text-[var(--color-text-subtle)]">对白：</span>
              <span className="text-[var(--color-text)]">"{shot.dialogue}"</span>
            </div>
          )}
          <div className="text-xs text-[var(--color-text-subtle)]">
            <span>光线：</span>{shot.structuredStill.sp_lighting}
          </div>
          {hasAssets && (
            <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-subtle)] mb-2">已匹配素材：</p>
              <div className="flex flex-wrap gap-2">
                {shot.matchedAssets?.characterRefs.map((a) => (
                  <span key={a.id} className="text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30 rounded-md px-2 py-0.5">
                    👤 {a.name}
                  </span>
                ))}
                {shot.matchedAssets?.sceneRef && (
                  <span className="text-xs bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/30 rounded-md px-2 py-0.5">
                    🏞 {shot.matchedAssets.sceneRef.name}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 手动匹配素材 */}
          <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-subtle)] mb-2">手动匹配素材：</p>
            <div className="flex flex-wrap gap-2 items-center">
              {/* 角色参考 */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--color-text-subtle)]">👤 角色：</span>
                {shot.userMatchedAssets?.characterRef ? (
                  <div className="flex items-center gap-1">
                    <img
                      src={`data:image/png;base64,${shot.userMatchedAssets.characterRef}`}
                      alt="角色参考"
                      className="w-8 h-8 rounded object-cover border border-[var(--color-primary)]/40"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateShot({ ...shot, userMatchedAssets: { ...shot.userMatchedAssets, characterRef: undefined } })}
                      className="text-xs text-red-400 hover:text-red-300"
                    >×</button>
                  </div>
                ) : (
                  <span className="text-xs text-[var(--color-text-subtle)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5">未匹配</span>
                )}
                {assetFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAssetPicker('character')}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >选择</button>
                )}
              </div>
              {/* 场景参考 */}
              <div className="flex items-center gap-1.5 ml-3">
                <span className="text-xs text-[var(--color-text-subtle)]">🏞 场景：</span>
                {shot.userMatchedAssets?.sceneRef ? (
                  <div className="flex items-center gap-1">
                    <img
                      src={`data:image/png;base64,${shot.userMatchedAssets.sceneRef}`}
                      alt="场景参考"
                      className="w-8 h-8 rounded object-cover border border-[var(--color-success)]/40"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateShot({ ...shot, userMatchedAssets: { ...shot.userMatchedAssets, sceneRef: undefined } })}
                      className="text-xs text-red-400 hover:text-red-300"
                    >×</button>
                  </div>
                ) : (
                  <span className="text-xs text-[var(--color-text-subtle)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5">未匹配</span>
                )}
                {assetFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAssetPicker('scene')}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >选择</button>
                )}
              </div>
            </div>
          </div>

          {/* 素材选择弹窗 */}
          {showAssetPicker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setShowAssetPicker(null)}>
              <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="mb-4 text-sm font-semibold text-[var(--color-text)]">
                  选择{showAssetPicker === 'character' ? '角色' : '场景'}素材
                </h3>
                {assetFiles.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">暂无可用素材</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                    {assetFiles.map((f, fi) => (
                      <button
                        key={fi}
                        type="button"
                        onClick={() => {
                          const key = showAssetPicker === 'character' ? 'characterRef' : 'sceneRef';
                          onUpdateShot({
                            ...shot,
                            userMatchedAssets: { ...shot.userMatchedAssets, [key]: f.base64 },
                          });
                          setShowAssetPicker(null);
                        }}
                        className="rounded-lg border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] transition aspect-square"
                      >
                        <img src={`data:image/png;base64,${f.base64}`} alt={f.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAssetPicker(null)}
                    className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  >取消</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Step3({
  jobId,
  projectId,
  storyboard,
  logline,
  assetFiles,
  storyMeta,
  onSubmitted,
}: {
  jobId: string;
  projectId?: string;
  storyboard: ShotWithAssets[];
  logline?: string;
  assetFiles: Array<{ name: string; base64: string }>;
  storyMeta?: { story: string; protagonist: string; protagonistDesc: string; style: string };
  onSubmitted?: () => Promise<void> | void;
}) {
  const navigate = useNavigate();
  const [shots, setShots] = useState<ShotWithAssets[]>(storyboard);
  const [confirming, setConfirming] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const totalDuration = shots.reduce((sum, s) => sum + (s.durationSec ?? 0), 0);

  async function handleSaveDraft() {
    setSavingDraft(true);
    try {
      await saveDraft({
        name: logline?.slice(0, 20) || storyMeta?.story?.slice(0, 20) || '分镜草稿',
        story: storyMeta?.story ?? '',
        protagonist: storyMeta?.protagonist ?? '',
        protagonistDesc: storyMeta?.protagonistDesc ?? '',
        style: storyMeta?.style ?? '',
        customStyle: '',
        assetFiles,
        storyboard: shots,
        logline,
        jobId,
        projectId,
      });
      toast.success('分镜草稿已保存');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存草稿失败');
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      const res = await confirmStoryboard(jobId, shots);
      await onSubmitted?.();
      const queued = res.queued ?? shots.length;
      toast.success(`已提交 ${queued} 个生成任务，请到「历史 → 批量任务看板」查看进度`);
      setTimeout(() => navigate('/history', { state: { defaultTab: 'batch' } }), 1400);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 pb-28">
      {/* 概要头部 */}
      <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-5 mb-6">
        <h2 className="text-lg font-bold text-[var(--color-text)] mb-1">🎬 分镜已生成</h2>
        {logline && <p className="text-sm text-[var(--color-text-muted)] mb-3 italic">"{logline}"</p>}
        <div className="flex gap-4 text-sm text-[var(--color-text-subtle)]">
          <span>
            <span className="text-[var(--color-text)] font-semibold">{shots.length}</span> 个镜头
          </span>
          <span>·</span>
          <span>
            总时长 <span className="text-[var(--color-text)] font-semibold">{totalDuration}</span> 秒
          </span>
          <span>·</span>
          <span>
            {shots.filter((s) => (s.matchedAssets?.characterRefs?.length ?? 0) > 0 || s.matchedAssets?.sceneRef).length} 个镜头匹配到素材
          </span>
        </div>
      </div>

      {/* 提示 */}
      <p className="text-xs text-[var(--color-text-subtle)] mb-3 px-1">
        点击镜头卡片可展开查看详情，如需修改请展开后编辑
      </p>

      {/* 分镜列表 */}
      <div className="space-y-2">
        {shots.map((shot, i) => (
          <ShotCard
            key={shot.shotIndex}
            shot={shot}
            index={i}
            assetFiles={assetFiles}
            onUpdateShot={(updated) => setShots((prev) => prev.map((s, j) => j === i ? updated : s))}
          />
        ))}
      </div>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 sm:left-56 bg-[var(--color-surface-elevated)]/95 backdrop-blur border-t border-[var(--color-border)] px-4 py-4 flex gap-3 z-50">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)] transition flex items-center gap-2"
        >
          ✏️ 修改
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={savingDraft}
          className="px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
        >
          {savingDraft ? '保存中…' : '💾 存草稿'}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirming}
          className="flex-1 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          {confirming ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              提交中...
            </>
          ) : (
            <>🎬 开始生成视频</>
          )}
        </button>
      </div>
      <div className="fixed bottom-20 left-4 right-4 sm:left-60 sm:right-6 z-40">
        <RunningStatus active={confirming} label="正在提交一键成片任务" stallAfterSec={20} scene="premiere" />
      </div>
    </div>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

export function QuickFilm() {
  const QUICKFILM_JOB_KEY = 'quickfilm_active_job';
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [jobId, setJobId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [storyboard, setStoryboard] = useState<ShotWithAssets[]>([]);
  const [logline, setLogline] = useState<string | undefined>();
  const [assetFiles, setAssetFiles] = useState<Array<{ name: string; base64: string }>>([]);
  const [storyMeta, setStoryMeta] = useState<{ story: string; protagonist: string; protagonistDesc: string; style: string } | undefined>();
  const [restoring, setRestoring] = useState(true);
  const sessionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const urlProjectId = searchParams.get('projectId')?.trim();
    if (urlProjectId) setProjectId(urlProjectId);
  }, [searchParams]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const session = await loadSession();
        if (!alive) return;
        if (!session?.jobId) {
          // Fallback: restore jobId from localStorage if server session is absent
          const savedJobId = localStorage.getItem(QUICKFILM_JOB_KEY);
          if (savedJobId) {
            setJobId(savedJobId);
            setStep(2);
          }
          return;
        }
        setJobId(session.jobId);
        if (session.projectId) setProjectId(session.projectId);
        setAssetFiles(session.assetFiles ?? []);
        setLogline(session.logline);
        if (session.step === 3 && Array.isArray(session.storyboard) && session.storyboard.length > 0) {
          setStoryboard(session.storyboard);
          setStep(3);
        } else {
          setStep(2);
        }
        toast.success('已恢复上次一键成片进度');
      } catch {
        // no session
      } finally {
        if (alive) setRestoring(false);
      }
    })();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (restoring || !jobId || (step !== 2 && step !== 3)) return;
    if (step === 3 && storyboard.length === 0) return;
    if (sessionSaveTimer.current) clearTimeout(sessionSaveTimer.current);
    sessionSaveTimer.current = setTimeout(() => {
      void saveSession({
        step: step as 2 | 3,
        jobId,
        projectId: projectId ?? undefined,
        logline,
        storyboard: step === 3 ? storyboard : undefined,
        assetFiles,
      }).catch(() => {
        // ignore silent autosave failure
      });
    }, 1200);
    return () => {
      if (sessionSaveTimer.current) clearTimeout(sessionSaveTimer.current);
    };
  }, [step, jobId, projectId, logline, storyboard, assetFiles, restoring]);

  async function handleFormSubmit(form: Step1Form) {
    try {
      const style = form.style === '自定义' ? form.customStyle || '现代' : form.style;
      setAssetFiles(form.assetFiles);
      setStoryMeta({ story: form.story, protagonist: form.protagonist || '主角', protagonistDesc: form.protagonistDesc || '', style });
      await clearSession().catch(() => undefined);
      let ensuredProjectId = projectId;
      if (!ensuredProjectId) {
        const titleSeed = form.story.trim().slice(0, 12);
        const created = await createProject(titleSeed ? `${titleSeed}（一键成片）` : '一键成片项目');
        ensuredProjectId = created.id;
        setProjectId(created.id);
      }
      const { jobId: id } = await startQuickFilm({
        story: form.story,
        protagonist: form.protagonist || '主角',
        protagonistDesc: form.protagonistDesc,
        style,
        projectId: ensuredProjectId,
        styleImageBase64: form.styleImageBase64,
        assetFiles: form.assetFiles.length > 0 ? form.assetFiles : undefined,
      });
      setJobId(id);
      localStorage.setItem(QUICKFILM_JOB_KEY, id);
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '启动失败，请重试');
    }
  }

  function handleJobDone(sb: ShotWithAssets[], ll?: string) {
    localStorage.removeItem(QUICKFILM_JOB_KEY);
    setStoryboard(sb);
    setLogline(ll);
    setStep(3);
  }

  async function handleSessionSubmitted() {
    localStorage.removeItem(QUICKFILM_JOB_KEY);
    await clearSession().catch(() => undefined);
  }

  if (restoring) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
        <div className="text-center">
          <span className="inline-block w-7 h-7 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">正在恢复上次进度...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      {/* 步骤指示器 */}
      {step !== 2 && (
        <div className="flex items-center justify-center pt-6 gap-3">
          {(['1', '2', '3'] as const).map((s, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done
                    ? 'bg-[var(--color-success)] text-white'
                    : active
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-subtle)] border border-[var(--color-border)]'
                }`}>
                  {done ? '✓' : n}
                </div>
                {i < 2 && (
                  <div className={`w-8 h-0.5 transition-all ${step > n ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {step === 1 && <Step1 onSubmit={handleFormSubmit} onRestoreStoryboard={(draft) => {
        setJobId(draft.jobId || `draft-${draft.id}`);
        setProjectId(draft.projectId ?? null);
        setStoryboard(draft.storyboard ?? []);
        setLogline(draft.logline);
        setAssetFiles(draft.assetFiles ?? []);
        setStoryMeta({ story: draft.story, protagonist: draft.protagonist, protagonistDesc: draft.protagonistDesc, style: draft.style });
        setStep(3);
      }} />}
      {step === 2 && jobId && <Step2 jobId={jobId} onDone={handleJobDone} onError={() => {
        localStorage.removeItem(QUICKFILM_JOB_KEY);
        void clearSession().catch(() => undefined);
      }} onRestart={() => {
        localStorage.removeItem(QUICKFILM_JOB_KEY);
        void clearSession().catch(() => undefined);
        setJobId(null);
        setStep(1);
      }} />}
      {step === 3 && jobId && (
        <Step3
          jobId={jobId}
          projectId={projectId ?? undefined}
          storyboard={storyboard}
          logline={logline}
          assetFiles={assetFiles}
          storyMeta={storyMeta}
          onSubmitted={handleSessionSubmitted}
        />
      )}
    </div>
  );
}

export default QuickFilm;
