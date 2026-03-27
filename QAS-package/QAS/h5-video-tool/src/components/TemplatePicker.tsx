/**
 * 功能模板选择：Viral 舞蹈、英雄宣传、短剧 等
 * 用户先选定功能，再进入该模板的 prompt 工作区
 */
import { useEffect, useState } from 'react';
import { getTemplates, type PromptTemplate } from '../api/promptPolish';

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
        {templates.map((t) => (
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
