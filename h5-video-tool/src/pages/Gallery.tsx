import { useNavigate } from 'react-router-dom';
import { GalleryView } from '../components/GalleryView';

export function Gallery() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* 页面标题栏 */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <div className="max-w-6xl px-6 pt-5 pb-4">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[var(--color-text)]">我的成片</h1>
              <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                本地生成记录与服务端近期输出
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="mb-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              批量任务 & 云端历史 →
            </button>
          </div>
        </div>
      </div>

      {/* 成片内容 */}
      <div className="max-w-6xl px-6 pt-6">
        <GalleryView />
      </div>
    </div>
  );
}
