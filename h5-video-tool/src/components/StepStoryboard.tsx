import { useState } from 'react';
import { useCreateFlow } from '../context/CreateFlowContext';
import { useStoryboard } from '../hooks/useStoryboard';

export function StepStoryboard() {
  const { prompt, selectedOrder, setStoryboardText } = useCreateFlow();
  const { generate, loading, error, clearError } = useStoryboard();
  const [localText, setLocalText] = useState<string>('');
  const [confirmed, setConfirmed] = useState(false);

  const handleGenerate = async () => {
    const res = await generate({
      prompt,
      materials: selectedOrder.map((f) => ({ id: f.id, name: f.name })),
      duration: 5,
      aspectRatio: '16:9',
    });
    if (res?.storyboardText) {
      setLocalText(res.storyboardText);
      clearError();
    }
  };

  const handleConfirm = () => {
    setStoryboardText(localText);
    setConfirmed(true);
  };

  return (
    <section className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <h2 className="text-sm font-medium text-[var(--color-text)] mb-4">4. 生成分镜</h2>
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '正在生成分镜…' : '生成分镜'}
        </button>

        {error && (
          <div className="flex items-center gap-2">
            <p className="text-sm text-[var(--color-error)]">{error}</p>
            <button
              type="button"
              onClick={clearError}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              关闭
            </button>
          </div>
        )}

        {localText && !confirmed && (
          <div className="space-y-3">
            <label className="block text-sm text-[var(--color-text-muted)]">分镜内容（可编辑）：</label>
            <textarea
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none"
              placeholder="分镜文本将显示在这里…"
            />
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              确认并使用
            </button>
          </div>
        )}

        {confirmed && (
          <p className="text-sm text-[var(--color-success)]">✓ 分镜已确认，可继续生成视频</p>
        )}
      </div>
    </section>
  );
}
