import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { loadVideoHistory, removeVideoFromHistory, getVideoFileUrl, type VideoHistoryItem } from '../utils/videoHistory';

export function History() {
  const [items, setItems] = useState<VideoHistoryItem[]>(() => loadVideoHistory());

  const handleRemove = useCallback((taskId: string) => {
    removeVideoFromHistory(taskId);
    setItems(loadVideoHistory());
  }, []);

  const formatTime = (ts: number) => new Date(ts).toLocaleString('zh-CN');

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">历史</h1>
        <p className="text-[var(--color-text-muted)]">
          您生成过的视频将在此展示，支持预览、下载和再次分发
        </p>

        {items.length === 0 ? (
          <div className="p-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-center">
            <p className="text-[var(--color-text-muted)] mb-2">暂无生成记录</p>
            <p className="text-sm text-[var(--color-text-subtle)] mb-4">
              前往 Studio 创建您的第一个视频，生成后会自动保存到此
            </p>
            <Link
              to="/studio"
              className="inline-flex px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-sm font-medium"
            >
              去 Studio 创作
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.taskId}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] overflow-hidden flex flex-col sm:flex-row"
              >
                <div className="sm:w-48 flex-shrink-0 aspect-video bg-black">
                  <video
                    src={getVideoFileUrl(item.videoPath)}
                    controls
                    className="w-full h-full object-contain"
                    preload="metadata"
                  />
                </div>
                <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                  <div>
                    <p className="text-sm text-[var(--color-text)] line-clamp-2 mb-1">
                      {item.prompt || '无描述'}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatTime(item.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Link
                      to={`/result?taskId=${item.taskId}`}
                      className="inline-flex px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] text-sm font-medium"
                    >
                      查看 / 分发
                    </Link>
                    <a
                      href={getVideoFileUrl(item.videoPath)}
                      download={item.videoPath.split('/').pop() || 'video.mp4'}
                      className="inline-flex px-3 py-1.5 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] text-sm"
                    >
                      下载
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.taskId)}
                      className="inline-flex px-3 py-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-error)] text-sm"
                    >
                      从列表中移除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
