import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { TabGenerate } from './TabGenerate';
import { TemplatePicker } from '../components/TemplatePicker';
import { TemplateMarket } from '../components/TemplateMarket';
import { StudioErrorBoundary } from '../components/ErrorFallback';
import { useCreateFlow } from '../context/CreateFlowContext';

type HomeStudioState = { autoSelectCustom?: boolean; seedPrompt?: string };

export function Studio() {
  const {
    templateId,
    setTemplateId,
    setVideoDuration,
    setVideoAspectRatio,
    setPrompt,
  } = useCreateFlow();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as string | null;

  // 主 tab：create | templates
  const [activeTab, setActiveTab] = useState<'create' | 'templates'>(
    tabFromUrl === 'templates' ? 'templates' : 'create',
  );

  // URL 变化时同步
  useEffect(() => {
    const t = tabFromUrl === 'templates' ? 'templates' : 'create';
    setActiveTab(t);
  }, [tabFromUrl]);

  const switchTab = (tab: 'create' | 'templates') => {
    setActiveTab(tab);
    if (tab === 'create') setSearchParams({});
    else setSearchParams({ tab });
  };

  /** 首页带 seed prompt 进来 */
  useEffect(() => {
    const st = location.state as HomeStudioState | null;
    if (!st?.autoSelectCustom) return;
    setTemplateId('custom');
    setVideoDuration(8);
    setVideoAspectRatio('9:16');
    if (st.seedPrompt?.trim()) setPrompt(st.seedPrompt.trim());
    setActiveTab('create');
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
  }, [
    location.state,
    location.pathname,
    location.search,
    navigate,
    setTemplateId,
    setVideoDuration,
    setVideoAspectRatio,
    setPrompt,
  ]);

  const handleUseTemplate = useCallback(
    (template: { prompt: string; aspectRatio?: string }) => {
      setPrompt(template.prompt);
      if (template.aspectRatio) setVideoAspectRatio(template.aspectRatio);
      switchTab('create');
    },
    [setPrompt, setVideoAspectRatio],
  );

  const TABS = [
    { id: 'create' as const, label: '创作' },
    { id: 'templates' as const, label: '模板市场' },
  ];

  return (
    <div className="min-h-screen">
      {/* 顶部标题 + Tab */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <div className="max-w-6xl px-6 pt-5 pb-0">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[var(--color-text)]">生成视频</h1>
              <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                输入创意 → 选素材 → 即梦 AI 生成
              </p>
            </div>
            {/* 高级制片入口 */}
            <Link
              to="/studio/production"
              className="mb-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
            >
              高级制片 →
            </Link>
          </div>
          {/* Tab 栏 */}
          <div className="mt-4 flex gap-1">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchTab(id)}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors border-b-2 ${
                  activeTab === id
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="pt-6">
        <StudioErrorBoundary>
          {activeTab === 'templates' ? (
            <div className="max-w-6xl px-6">
              <TemplateMarket onUseTemplate={handleUseTemplate} />
            </div>
          ) : (
            // 创作区：选模板 or 直接创作
            <div className="max-w-6xl">
              {templateId ? (
                <TabGenerate
                  onBrowseTemplates={() => switchTab('templates')}
                  onBackToPicker={() => setTemplateId('')}
                />
              ) : (
                <TemplatePicker
                  onSelect={(t) => {
                    setTemplateId(t.id);
                    setVideoDuration(t.duration);
                    setVideoAspectRatio(t.aspectRatio);
                  }}
                />
              )}
            </div>
          )}
        </StudioErrorBoundary>
      </div>
    </div>
  );
}
