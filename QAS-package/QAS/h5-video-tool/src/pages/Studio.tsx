import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TabGenerate } from './TabGenerate';
import { BossShowcase } from './BossShowcase';
import { TemplatePicker } from '../components/TemplatePicker';
import { TemplateMarket } from '../components/TemplateMarket';
import { GalleryView } from '../components/GalleryView';
import { StudioErrorBoundary } from '../components/ErrorFallback';
import { useCreateFlow } from '../context/CreateFlowContext';

const STUDIO_TABS = [
  { id: 'studio', label: 'Studio', sublabel: '创作' },
  { id: 'gallery', label: 'Gallery', sublabel: '内容管理' },
] as const;

const CREATE_MODE_TABS = [
  { id: 'create', label: '创作' },
  { id: 'templates', label: '模板市场' },
] as const;

export function Studio() {
  const {
    templateId,
    setTemplateId,
    setVideoDuration,
    setVideoAspectRatio,
    setPrompt,
  } = useCreateFlow();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as string | null;
  const mainTab = tabFromUrl === 'gallery' ? 'gallery' : 'studio';
  const initialCreateMode = tabFromUrl === 'templates' ? 'templates' : 'create';
  const [activeMainTab, setActiveMainTab] = useState<'studio' | 'gallery'>(mainTab);
  const [createMode, setCreateMode] = useState<'templates' | 'create'>(initialCreateMode);

  const handleMainTabChange = (tab: 'studio' | 'gallery') => {
    setActiveMainTab(tab);
    setSearchParams({ tab });
  };

  // URL tab 变化时同步 createMode（如刷新、直接访问 /studio?tab=templates）
  useEffect(() => {
    const mode = tabFromUrl === 'templates' ? 'templates' : 'create';
    setCreateMode(mode);
  }, [tabFromUrl]);

  const handleUseTemplate = useCallback(
    (template: { prompt: string; aspectRatio?: string }) => {
      setPrompt(template.prompt);
      if (template.aspectRatio) setVideoAspectRatio(template.aspectRatio);
      setCreateMode('create');
    },
    [setPrompt, setVideoAspectRatio],
  );

  return (
    <div className="min-h-screen">
      {/* 标题区 */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-6 py-5">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Studio</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          创建和管理你的 AI 生成视频。Studio 创作内容，Gallery 展示与管理。
        </p>
        {/* 子 Tab：Studio | Gallery */}
        <div className="mt-4 flex gap-1">
          {STUDIO_TABS.map(({ id, label, sublabel }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleMainTabChange(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeMainTab === id
                  ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-80">{sublabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-6">
        <StudioErrorBoundary>
          {activeMainTab === 'gallery' ? (
            <div className="max-w-6xl mx-auto">
              <GalleryView />
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
            {/* Studio 创作区：内层 Tab 创作 | 模板市场 */}
            <div className="mb-6 flex gap-1">
              {CREATE_MODE_TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setCreateMode(id);
                    setSearchParams(id === 'create' ? {} : { tab: id });
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    createMode === id
                      ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {createMode === 'templates' ? (
              <TemplateMarket onUseTemplate={handleUseTemplate} />
            ) : templateId === 'boss-showcase' ? (
              <BossShowcase onBackToPicker={() => setTemplateId('')} />
            ) : templateId ? (
              <TabGenerate onBrowseTemplates={() => setCreateMode('templates')} onBackToPicker={() => setTemplateId('')} />
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
