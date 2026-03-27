import { useCreateFlow } from '../context/CreateFlowContext';
import { Link } from 'react-router-dom';

export function GalleryView() {
  const { videoUrl, taskId, prompt } = useCreateFlow();

  // 暂无持久化，仅展示当前会话中生成的内容；后续可接入 API 或 localStorage
  const hasContent = videoUrl && taskId;

  if (!hasContent) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-[var(--color-text-muted)]">
          展示并管理已创作的视频，支持预览、下载和再次分发
        </p>
        <div className="p-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-center">
          <p className="text-[var(--color-text-muted)] mb-2">暂无创作内容</p>
          <p className="text-sm text-[var(--color-text-subtle)] mb-4">
            前往 Studio 创作并生成您的第一个视频，生成结果将在此展示
          </p>
          <Link
            to="/studio?tab=studio"
            className="inline-flex px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-sm font-medium"
          >
            去 Studio 创作
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-text-muted)]">
        展示并管理已创作的视频，支持预览、编辑、重新生成和分发
      </p>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] overflow-hidden">
        <div className="p-4">
          <p className="text-sm font-medium text-[var(--color-text)] mb-2 line-clamp-2">
            {prompt || '浪人 (参考图) 打怪物'}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">Seedance 2.0 • 16:9</p>
          <div className="aspect-video bg-black/50 rounded-lg flex items-center justify-center mb-4">
            <video
              src={videoUrl}
              controls
              className="max-h-full max-w-full"
              poster=""
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] text-sm hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <EditIcon />
              编辑
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] text-sm hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <RefreshIcon />
              重新生成
            </button>
            <Link
              to={`/result?taskId=${taskId}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              查看详情 / 分发
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
