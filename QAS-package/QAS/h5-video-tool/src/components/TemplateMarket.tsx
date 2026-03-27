/**
 * 模板市场：我的模板 + 模板市场
 * 用户保存的模板可分享到市场供他人引用
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getUserTemplates,
  getMarketTemplates,
  shareToMarket,
  deleteUserTemplate,
  type SavedTemplate,
} from '../utils/templateStorage';
import type { PromptTemplate } from './TemplateGallery';

const PLATFORM_TEMPLATES: PromptTemplate[] = [
  { id: 'product-showcase', title: '产品展示', prompt: '产品静物展示，专业打光，纯色背景，5 秒缓缓旋转展示产品细节。适合全年龄段观看，无版权争议。', tags: ['电商', '16:9', '5s'], aspectRatio: '16:9', useCount: 128, likeCount: 89 },
  { id: 'character-action', title: '角色动作', prompt: '浪人持武器在昏暗石质走廊中奔跑，电影感光线，动作连贯。适合全年龄段观看，无版权争议。', tags: ['剧情', '16:9', '5s'], aspectRatio: '16:9', useCount: 256, likeCount: 192 },
  { id: 'lifestyle-vlog', title: '生活 Vlog', prompt: '生活场景片段，自然光，温馨氛围，人物自然互动。适合全年龄段观看，无版权争议。', tags: ['社媒', '9:16', '5s'], aspectRatio: '9:16', useCount: 312, likeCount: 245 },
  { id: 'brand-story', title: '品牌故事', prompt: '品牌 logo 与产品结合，简约风格，节奏舒缓，传递品牌调性。适合全年龄段观看，无版权争议。', tags: ['品牌', '16:9', '5s'], aspectRatio: '16:9', useCount: 87, likeCount: 56 },
];

function toPromptTemplate(t: SavedTemplate): PromptTemplate {
  return { id: t.id, title: t.title, prompt: t.prompt, tags: t.tags, aspectRatio: t.aspectRatio ?? '16:9' };
}

interface TemplateMarketProps {
  onUseTemplate: (template: { prompt: string; aspectRatio?: string }) => void;
}

const TABS = [
  { id: 'mine', label: '我的模板' },
  { id: 'market', label: '模板市场' },
] as const;

export function TemplateMarket({ onUseTemplate }: TemplateMarketProps) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('mine');
  const [userTemplates, setUserTemplates] = useState<SavedTemplate[]>([]);
  const [marketTemplates, setMarketTemplates] = useState<SavedTemplate[]>([]);

  const refresh = useCallback(() => {
    setUserTemplates(getUserTemplates());
    setMarketTemplates(getMarketTemplates());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const allMarketItems: PromptTemplate[] = [
    ...marketTemplates.map(toPromptTemplate),
    ...PLATFORM_TEMPLATES,
  ];

  const handleUse = (t: PromptTemplate | SavedTemplate) => {
    onUseTemplate({ prompt: t.prompt, aspectRatio: (t as SavedTemplate).aspectRatio ?? (t as PromptTemplate).aspectRatio });
  };

  const handleShareToMarket = (t: SavedTemplate) => {
    shareToMarket(t);
    refresh();
    // 可加 toast: "已分享到模板市场"
  };

  const handleDelete = (id: string) => {
    if (confirm('确定删除此模板？')) {
      deleteUserTemplate(id);
      refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'mine' ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            你保存的模板。可分享到模板市场供其他用户引用。
          </p>
          {userTemplates.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] py-8 text-center rounded-lg border border-dashed border-[var(--color-border)]">
              暂无保存的模板。在自定义区写好 prompt 后点击「保存为模板」即可添加。
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {userTemplates.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 hover:border-[var(--color-primary)]/40 transition-colors flex flex-col"
                >
                  <h3 className="font-medium text-[var(--color-text)] mb-2">{t.title}</h3>
                  {t.description && <p className="text-xs text-[var(--color-text-muted)] mb-2">{t.description}</p>}
                  <p className="text-sm text-[var(--color-text-muted)] line-clamp-3 mb-3 flex-1">{t.prompt}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {t.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded text-xs bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUse(t)}
                      className="flex-1 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
                    >
                      引用
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareToMarket(t)}
                      className="px-3 py-2 rounded-lg border border-[var(--color-primary)] text-[var(--color-primary)] text-sm hover:bg-[var(--color-primary)]/10 transition-colors"
                    >
                      分享到市场
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="px-2 py-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-surface-hover)] transition-colors"
                      title="删除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            来自其他用户分享的模板与平台精选，可直接引用。
          </p>
          {allMarketItems.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] py-8 text-center rounded-lg border border-dashed border-[var(--color-border)]">
              暂无市场模板。分享你的模板到市场，让更多人使用。
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allMarketItems.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 hover:border-[var(--color-primary)]/40 transition-colors flex flex-col"
                >
                  <h3 className="font-medium text-[var(--color-text)] mb-2">{t.title}</h3>
                  <p className="text-sm text-[var(--color-text-muted)] line-clamp-3 mb-3 flex-1">{t.prompt}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {t.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded text-xs bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUse(t)}
                    className="w-full py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
                  >
                    引用
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
