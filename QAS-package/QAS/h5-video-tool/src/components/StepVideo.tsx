import { useState } from 'react';
import { useCreateFlow } from '../context/CreateFlowContext';
import { useMaterials } from '../context/MaterialsContext';
import { useVideoGenerate } from '../hooks/useVideoGenerate';
import { useNavigate } from 'react-router-dom';
import { saveVideoToHistory } from '../utils/videoHistory';

export function StepVideo() {
  const {
    prompt,
    shots,
    selectedOrder,
    shotFrames,
    videoModel,
    videoAspectRatio,
    videoDuration,
    videoResolution,
    multiShotEnabled,
    setVideoResult,
  } = useCreateFlow();
  const { accessToken } = useMaterials();
  const { generate, generateMultishot, loading, error, clearError } = useVideoGenerate();
  const navigate = useNavigate();
  const [showNoFramesModal, setShowNoFramesModal] = useState(false);

  /** 多镜头模式下，检查是否至少有一个镜头缺少首尾帧 */
  const hasMissingFrames =
    multiShotEnabled &&
    shots.length > 0 &&
    shots.some((_, i) => !shotFrames[i]?.first);

  const handleGenerate = () => {
    if (hasMissingFrames) {
      setShowNoFramesModal(true);
      return;
    }
    void doGenerate();
  };

  const doGenerate = async () => {
    setShowNoFramesModal(false);
    if (multiShotEnabled && shots.length > 0) {
      const res = await generateMultishot({
        shots: shots.map((s, i) => ({
          durationSeconds: s.duration,
          prompt: s.prompt.trim(),
          imageBase64: shotFrames[i]?.first,
        })),
        aspectRatio: videoAspectRatio,
        materials: selectedOrder.map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType })),
        driveToken: accessToken ?? undefined,
      });
      if (res?.videoUrl) {
        const taskId = `multishot-${Date.now()}`;
        setVideoResult(res.videoUrl, taskId, res.outputPath);
        if (res.outputPath) {
          saveVideoToHistory({ taskId, videoPath: res.outputPath, prompt: shots.map((s) => s.prompt).join('\n---\n') });
        }
        clearError();
        navigate(`/result?taskId=${taskId}`);
      }
    } else if (prompt?.trim()) {
      const res = await generate({
        storyboardText: prompt.trim(),
        materials: selectedOrder.map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType })),
        driveToken: accessToken ?? undefined,
        duration: videoDuration,
        aspectRatio: videoAspectRatio,
        resolution: videoResolution,
        model: videoModel || undefined,
      });
      if (res?.videoUrl && res?.taskId) {
        setVideoResult(res.videoUrl, res.taskId, res.videoPath);
        if (res.videoPath) {
          saveVideoToHistory({ taskId: res.taskId, videoPath: res.videoPath, prompt: prompt.trim() });
        }
        clearError();
        navigate(`/result?taskId=${res.taskId}`);
      }
    }
  };

  return (
    <section className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <h2 className="text-sm font-medium text-[var(--color-text)] mb-4">生成视频</h2>
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={
            loading ||
            (multiShotEnabled
              ? shots.length === 0 || shots.some((s) => !s.prompt.trim())
              : !prompt?.trim())
          }
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading
            ? multiShotEnabled
              ? '正在生成多镜头视频，请稍候…'
              : '正在生成视频，预计 1–2 分钟…'
            : '开始生成'}
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
      </div>

      {/* 未生成首尾帧时的确认弹窗 */}
      {showNoFramesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowNoFramesModal(false)}
        >
          <div
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[var(--color-text)] mb-4">
              未生成分镜首尾帧，直接生成将不会使用首尾帧作为参考。是否继续？
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowNoFramesModal(false)}
                className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void doGenerate()}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
              >
                继续生成
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
