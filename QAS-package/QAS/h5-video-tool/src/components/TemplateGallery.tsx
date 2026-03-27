import { useState } from 'react';

export interface PromptTemplate {
  id: string;
  title: string;
  prompt: string;
  tags: string[];
  aspectRatio: string;
  useCount?: number;
  likeCount?: number;
}

interface TemplateGalleryProps {
  templates: PromptTemplate[];
  onUseTemplate?: (template: PromptTemplate) => void;
}

const LIKES_STORAGE_KEY = 'template-likes';

function getStoredLikes(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LIKES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStoredLikes(likes: Record<string, boolean>) {
  localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes));
}

export function TemplateGallery({ templates, onUseTemplate }: TemplateGalleryProps) {
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>(() => getStoredLikes());

  const handleLike = (id: string) => {
    setLikedIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      setStoredLikes(next);
      return next;
    });
  };

  const sortedTemplates = [...templates].sort((a, b) => {
    const scoreA = (a.useCount ?? 0) + (a.likeCount ?? 0);
    const scoreB = (b.useCount ?? 0) + (b.likeCount ?? 0);
    return scoreB - scoreA;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">
          按引用量与好评度排序，引用模板到自定义区或点赞收藏。
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedTemplates.map((t) => {
          const isLiked = likedIds[t.id];
          const displayLikes = (t.likeCount ?? 0) + (isLiked ? 1 : 0);
          return (
            <div
              key={t.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 hover:border-[var(--color-primary)]/40 transition-colors flex flex-col"
            >
              <h3 className="font-medium text-[var(--color-text)] mb-2">{t.title}</h3>
              <p className="text-sm text-[var(--color-text-muted)] line-clamp-3 mb-3 flex-1">
                {t.prompt}
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {t.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded text-xs bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-text-muted)] mb-4">
                <span>引用 {t.useCount ?? 0} 次</span>
                <button
                  type="button"
                  onClick={() => handleLike(t.id)}
                  className={`inline-flex items-center gap-1 transition-colors ${isLiked ? 'text-[var(--color-primary)]' : 'hover:text-[var(--color-primary)]'}`}
                  title={isLiked ? '取消赞' : '赞'}
                >
                  <svg
                    className="w-4 h-4"
                    fill={isLiked ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  {displayLikes}
                </button>
              </div>
              {onUseTemplate && (
                <button
                  type="button"
                  onClick={() => onUseTemplate(t)}
                  className="w-full py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  引用
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
