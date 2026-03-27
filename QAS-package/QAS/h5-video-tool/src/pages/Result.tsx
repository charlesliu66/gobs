import { useSearchParams, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useCreateFlow } from '../context/CreateFlowContext';
import { loadVideoHistory, getVideoFileUrl } from '../utils/videoHistory';

export function Result() {
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');
  const { videoUrl, videoPath, setVideoResult } = useCreateFlow();
  const historyItem = taskId ? loadVideoHistory().find((x) => x.taskId === taskId) : null;

  // 从历史进入时，若 context 无视频则恢复，便于后续去分发页
  useEffect(() => {
    if (taskId && !videoUrl && !videoPath && historyItem?.videoPath) {
      setVideoResult(getVideoFileUrl(historyItem.videoPath), taskId, historyItem.videoPath);
    }
  }, [taskId, videoUrl, videoPath, historyItem, setVideoResult]);

  const url = videoUrl || (historyItem?.videoPath ? getVideoFileUrl(historyItem.videoPath) : null);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-[var(--color-text)] mb-6">成片预览</h1>
      <div className="space-y-6">
        {url ? (
          <>
            <div className="rounded-lg overflow-hidden border border-[var(--color-border)] bg-black">
              <video
                src={url}
                controls
                className="w-full aspect-video"
                poster=""
              >
                您的浏览器不支持视频播放
              </video>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/distribute"
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                去分发
              </Link>
              <a
                href={url}
                download
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                下载视频
              </a>
              <Link
                to="/"
                className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                返回创作
              </Link>
            </div>
            {taskId && (
              <p className="text-xs text-[var(--color-text-subtle)]">任务 ID: {taskId}</p>
            )}
          </>
        ) : (
          <div className="p-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-center">
            <p className="text-[var(--color-text-muted)] mb-4">
              暂无成片，请先在创作流程中完成视频生成
            </p>
            <Link
              to="/"
              className="inline-block px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              返回创作
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
