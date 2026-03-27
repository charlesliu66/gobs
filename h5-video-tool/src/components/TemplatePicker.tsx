/**
 * 功能模板选择：Viral 舞蹈、英雄宣传、短剧 等
 * 用户先选定功能，再进入该模板的 prompt 工作区
 */
import { useEffect, useState, useMemo } from 'react';
import { getTemplates, type PromptTemplate } from '../api/promptPolish';

const DURATION_ORDER = [8, 15, 30, 60];

const CUSTOM_TEMPLATE: PromptTemplate = {
  id: 'custom',
  name: 'Custom',
  nameZh: '自定义',
  description: '自由发挥，无预设，仅用导演知识优化',
  duration: 8,
  aspectRatio: '9:16',
  pipelineMode: 'single',
};

function sortTemplates(list: PromptTemplate[]): PromptTemplate[] {
  const filtered = list.filter((t) => t.id !== 'cat-harem');
  return [...filtered].sort((a, b) => {
    const idxA = DURATION_ORDER.indexOf(a.duration);
    const idxB = DURATION_ORDER.indexOf(b.duration);
    const orderA = idxA >= 0 ? idxA : DURATION_ORDER.length;
    const orderB = idxB >= 0 ? idxB : DURATION_ORDER.length;
    if (orderA !== orderB) return orderA - orderB;
    return a.duration - b.duration;
  });
}

interface TemplatePickerProps {
  onSelect: (template: PromptTemplate) => void;
}

export function TemplatePicker({ onSelect }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTemplates()
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sortedTemplates = useMemo(() => sortTemplates(templates), [templates]);
  const displayList = useMemo(() => [CUSTOM_TEMPLATE, ...sortedTemplates], [sortedTemplates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-[var(--color-text-muted)]">加载中…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-medium text-[var(--color-text)]">选择功能</h2>
      <p className="text-sm text-[var(--color-text-muted)]">
        先选定要创作的类型，再进入对应的 prompt 工作区
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {displayList.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t)}
            className="flex flex-col items-stretch text-left p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <span className="text-base font-semibold text-[var(--color-text)]">
              {t.nameZh ?? t.name}
            </span>
            <span className="mt-1 text-xs text-[var(--color-text-muted)]">{t.description}</span>
            <span className="mt-2 text-xs text-[var(--color-text-subtle)]">
              {t.duration}秒 · {t.aspectRatio}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
