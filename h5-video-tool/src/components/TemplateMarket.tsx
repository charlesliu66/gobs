/**
 * 模板市场：我的模板 + 模板市场
 * 用户保存的模板可分享到市场供他人引用
 * 支持：按引用量排序、点赞、收藏
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getUserTemplates,
  getMarketTemplates,
  shareToMarket,
  deleteUserTemplate,
  incrementUseCount,
  toggleLike,
  toggleFavorite,
  getUserLikes,
  getUserFavorites,
  getTemplateStats,
  type SavedTemplate,
} from '../utils/templateStorage';
import type { PromptTemplate } from './TemplateGallery';

const PLATFORM_TEMPLATES: PromptTemplate[] = [
  { id: 'product-showcase', title: '产品展示', prompt: '产品静物展示，专业打光，纯色背景，5 秒缓缓旋转展示产品细节。适合全年龄段观看，无版权争议。', tags: ['电商', '16:9', '5s'], aspectRatio: '16:9', useCount: 128, likeCount: 89 },
  { id: 'character-action', title: '角色动作', prompt: '浪人持武器在昏暗石质走廊中奔跑，电影感光线，动作连贯。适合全年龄段观看，无版权争议。', tags: ['剧情', '16:9', '5s'], aspectRatio: '16:9', useCount: 256, likeCount: 192 },
  { id: 'lifestyle-vlog', title: '生活 Vlog', prompt: '生活场景片段，自然光，温馨氛围，人物自然互动。适合全年龄段观看，无版权争议。', tags: ['社媒', '9:16', '5s'], aspectRatio: '9:16', useCount: 312, likeCount: 245 },
  { id: 'brand-story', title: '品牌故事', prompt: '品牌 logo 与产品结合，简约风格，节奏舒缓，传递品牌调性。适合全年龄段观看，无版权争议。', tags: ['品牌', '16:9', '5s'], aspectRatio: '16:9', useCount: 87, likeCount: 56 },
];

type SortBy = 'useCount' | 'likeCount' | 'newest';

function toPromptTemplate(t: SavedTemplate, stats?: { useCount: number; likeCount: number }): PromptTemplate {
  return {
    id: t.id,
    title: t.title,
    prompt: t.prompt,
    tags: t.tags,
    aspectRatio: t.aspectRatio ?? '16:9',
    useCount: stats?.useCount ?? 0,
    likeCount: stats?.likeCount ?? 0,
  };
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
  const [sortBy, setSortBy] = useState<SortBy>('useCount');
  const [interactionVersion, setInteractionVersion] = useState(0);

  const likedIds = useMemo(() => getUserLikes(), [interactionVersion]);
  const favoritedIds = useMemo(() => getUserFavorites(), [interactionVersion]);

  const refresh = useCallback(() => {
    setUserTemplates(getUserTemplates());
    setMarketTemplates(getMarketTemplates());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const allMarketItems: PromptTemplate[] = (() => {
    const marketWithStats = marketTemplates.map((t) => {
      const stats = getTemplateStats(t.id);
      return { ...toPromptTemplate(t, stats), createdAt: t.createdAt };
    });
    const platformWithMeta = PLATFORM_TEMPLATES.map((t) => ({ ...t, createdAt: 0 }));
    const combined = [...marketWithStats, ...platformWithMeta];
    const sorted = [...combined].sort((a, b) => {
      if (sortBy === 'useCount') return (b.useCount ?? 0) - (a.useCount ?? 0);
      if (sortBy === 'likeCount') return (b.likeCount ?? 0) - (a.likeCount ?? 0);
      if (sortBy === 'newest') return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      return 0;
    });
    return sorted;
  })();

  const handleUse = (t: PromptTemplate | SavedTemplate) => {
    incrementUseCount(t.id);
    setInteractionVersion((v) => v + 1);
    onUseTemplate({ prompt: t.prompt, aspectRatio: (t as SavedTemplate).aspectRatio ?? (t as PromptTemplate).aspectRatio });
  };

  const handleLike = (id: string) => {
    toggleLike(id);
    setInteractionVersion((v) => v + 1);
  };

  const handleFavorite = (id: string) => {
    toggleFavorite(id);
    setInteractionVersion((v) => v + 1);
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
                    {t.tags.map((tag, idx) => (
                      <span key={`${tag}-${idx}`} className="px-2 py-0.5 rounded text-xs bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]">
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--color-text-muted)]">
              来自其他用户分享的模板与平台精选，可直接引用。
            </p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
            >
              <option value="useCount">按引用量</option>
              <option value="likeCount">按点赞数</option>
              <option value="newest">按最新</option>
            </select>
          </div>
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
                  <div className="flex flex-wrap gap-2 mb-3">
                    {t.tags.map((tag, idx) => (
                      <span key={`${tag}-${idx}`} className="px-2 py-0.5 rounded text-xs bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mb-4 text-xs text-[var(--color-text-muted)]">
                    <span>引用 {(t.useCount ?? 0)}</span>
                    <span>点赞 {(t.likeCount ?? 0)}</span>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={() => handleLike(t.id)}
                      className={`p-1 rounded transition-colors ${likedIds.has(t.id) ? 'text-red-500' : 'hover:text-red-500 hover:bg-[var(--color-surface-hover)]'}`}
                      title={likedIds.has(t.id) ? '取消点赞' : '点赞'}
                    >
                      <svg className="w-4 h-4" fill={likedIds.has(t.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFavorite(t.id)}
                      className={`p-1 rounded transition-colors ${favoritedIds.has(t.id) ? 'text-amber-500' : 'hover:text-amber-500 hover:bg-[var(--color-surface-hover)]'}`}
                      title={favoritedIds.has(t.id) ? '取消收藏' : '收藏'}
                    >
                      <svg className="w-4 h-4" fill={favoritedIds.has(t.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
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
