import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { TabGenerate } from './TabGenerate';
import { TemplatePicker } from '../components/TemplatePicker';
import { TemplateMarket } from '../components/TemplateMarket';
import { StudioErrorBoundary } from '../components/ErrorFallback';
import { useCreateFlow } from '../context/CreateFlowContext';
import { buildAssetFileUrl, recordUsage } from '../api/assetLibraryApi';

type HomeStudioState = { autoSelectCustom?: boolean; seedPrompt?: string };

export function Studio() {
  const {
    templateId,
    setTemplateId,
    setVideoDuration,
    setVideoAspectRatio,
    setPrompt,
    setDreaminaMultimodalItems,
  } = useCreateFlow();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as string | null;
  const urlAssetId = searchParams.get('assetId');

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

  // 从素材库跳转过来时：自动进入创作模式并加载素材为参考图
  useEffect(() => {
    if (!urlAssetId) return;
    setTemplateId('custom');
    setVideoDuration(8);
    setVideoAspectRatio('9:16');
    setActiveTab('create');
    void (async () => {
      try {
        const fileUrl = buildAssetFileUrl(urlAssetId);
        const resp = await fetch(fileUrl);
        const blob = await resp.blob();
        if (blob.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1] ?? dataUrl;
            setDreaminaMultimodalItems([{
              id: `asset-${urlAssetId}`,
              kind: 'image' as const,
              base64,
              mimeType: blob.type || 'image/jpeg',
              fileName: `asset-${urlAssetId}`,
            }]);
          };
          reader.readAsDataURL(blob);
        }
        void recordUsage(urlAssetId, 'generate');
      } catch { /* ignore */ }
    })();
    // 清除 URL 中的 assetId 避免重复加载
    const url = new URL(window.location.href);
    url.searchParams.delete('assetId');
    window.history.replaceState(null, '', url.toString());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlAssetId]);

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
      {/* Header */}
      <div className="border-b border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/80 backdrop-blur-lg">
        <div className="max-w-6xl px-6 pt-6 pb-0">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="page-title">生成视频</h1>
              <p className="page-subtitle">
                输入创意 → 选素材 → 即梦 AI 生成
              </p>
            </div>
            <Link
              to="/studio/production"
              className="mb-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-1"
            >
              高级制片
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 6 15 12 9 18"/></svg>
            </Link>
          </div>
          {/* Tab Bar */}
          <div className="mt-5 flex gap-0.5">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchTab(id)}
                className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors ${
                  activeTab === id
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {label}
                {activeTab === id && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--color-primary)]" />
                )}
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
