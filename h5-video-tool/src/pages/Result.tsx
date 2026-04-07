import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { useCreateFlow } from '../context/CreateFlowContext';
import { loadVideoHistory, getVideoFileUrl, getLocalPlaybackSrc } from '../utils/videoHistory';

export function Result() {
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');
  const { videoUrl, taskId: contextTaskId, setVideoResult } = useCreateFlow();

  const navigate = useNavigate();

  const historyItem = useMemo(() => {
    if (!taskId) return null;
    return loadVideoHistory().find((x) => x.taskId === taskId) ?? null;
  }, [taskId]);

  const historyPlaybackUrl = useMemo(() => {
    if (!historyItem) return null;
    const s = getLocalPlaybackSrc(historyItem);
    return s || null;
  }, [historyItem]);

  /**
   * URL 带 taskId 时以本机历史为准，避免沿用创作流程里上一条成片的 videoUrl（例如从可灵云端点进时）。
   * 无历史记录时仍允许与 context 同 taskId 的成片（Studio 刚生成、尚未写入 storage 的极短窗口）。
   */
  const url =
    taskId && historyPlaybackUrl
      ? historyPlaybackUrl
      : videoUrl && (!taskId || taskId === contextTaskId)
        ? videoUrl
        : historyPlaybackUrl;

  // 将当前成片同步到 context，便于「去分发」与 taskId 一致
  useEffect(() => {
    if (!taskId || !historyItem) return;
    const fromPath = historyItem.videoPath?.trim();
    const fromUrl = historyItem.videoUrl?.trim();
    if (fromPath) {
      setVideoResult(getVideoFileUrl(fromPath), taskId, fromPath);
    } else if (fromUrl) {
      setVideoResult(fromUrl, taskId, null);
    }
  }, [taskId, historyItem?.videoUrl, historyItem?.videoPath, historyItem?.taskId, setVideoResult]);

  return (
    <div className="max-w-6xl w-full space-y-6">
      <h1 className="page-title mb-4">成片预览</h1>
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
            <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">下一步</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/editor')}
                  className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-hover)] transition-all text-left group"
                >
                  <span className="text-2xl">✂️</span>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">去剪辑</p>
                    <p className="text-xs text-[var(--color-text-muted)]">导入到剪辑工作台</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/distribute')}
                  className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-hover)] transition-all text-left group"
                >
                  <span className="text-2xl">🚀</span>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">手动发布</p>
                    <p className="text-xs text-[var(--color-text-muted)]">选平台、填文案、单次发</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/geelark-batch')}
                  className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-primary)]/10 transition-all text-left group"
                >
                  <span className="text-2xl">📲</span>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-primary)] transition-colors">矩阵批发 ★</p>
                    <p className="text-xs text-[var(--color-text-muted)]">多账号自动化，TikTok 专属</p>
                  </div>
                </button>
              </div>
            </div>
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
