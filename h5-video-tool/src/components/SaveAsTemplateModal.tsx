import { useState } from 'react';
import { saveAsUserTemplate, type SavedTemplate } from '../utils/templateStorage';

interface SaveAsTemplateModalProps {
  prompt: string;
  defaultDuration?: number;
  defaultAspectRatio?: string;
  onClose: () => void;
  onSaved: (template: SavedTemplate) => void;
}

export function SaveAsTemplateModal({
  prompt,
  defaultDuration,
  defaultAspectRatio,
  onClose,
  onSaved,
}: SaveAsTemplateModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsStr, setTagsStr] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const template = saveAsUserTemplate({
      title: title.trim(),
      description: description.trim() || undefined,
      prompt,
      tags: tagsStr
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean),
      aspectRatio: defaultAspectRatio,
      duration: defaultDuration,
    });
    onSaved(template);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">保存为模板</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">模板名称 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：浪人舞蹈宣传"
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">描述（选填）</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简短说明适用场景"
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">标签（逗号分隔）</label>
            <input
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="如：浪人, 舞蹈, 9:16"
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
