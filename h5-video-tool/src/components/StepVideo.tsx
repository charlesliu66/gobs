import { useState, useEffect, useRef } from 'react';
import { useCreateFlow } from '../context/CreateFlowContext';
import { useMaterials } from '../context/MaterialsContext';
import { useVideoGenerate } from '../hooks/useVideoGenerate';
import { useNavigate } from 'react-router-dom';
import { saveVideoToHistory } from '../utils/videoHistory';
import { filterPlaceholders } from './ShortDramaMaterialPicker';
import {
  getVeoModels,
  generateKlingAsync,
  getKlingTaskStatus,
  klingVideoProxyUrl,
  resolveKlingPlaybackUrl,
  isKlingModelId,
  type KlingPollPhase,
  type KlingVideoListRow,
} from '../api/video';

/** 轮询间隔：成片后尽快跳转（原 5 分钟过长易误以为失败） */
const KLING_POLL_MS = 30_000;
import { KlingJobCard } from './KlingJobCard';

export function StepVideo() {
  const {
    prompt,
    shots,
    selectedOrder: rawSelectedOrder,
    shotFrames,
    videoModel,
    videoAspectRatio,
    videoDuration,
    videoResolution,
    multiShotEnabled,
    setVideoResult,
    templateId,
    viralDanceReferenceVideoUrl,
  } = useCreateFlow();
  const selectedOrder = filterPlaceholders(rawSelectedOrder);
  const { accessToken } = useMaterials();
  const { generate, generateMultishot, loading, error, clearError, setError, useMock } = useVideoGenerate();
  const navigate = useNavigate();
  const [showNoFramesModal, setShowNoFramesModal] = useState(false);

  const [klingAsync, setKlingAsync] = useState(false);
  const [klingPoll, setKlingPoll] = useState<{
    taskId: string;
    phase: KlingPollPhase;
    row?: KlingVideoListRow;
    error?: string;
  } | null>(null);
  const [klingSubmitting, setKlingSubmitting] = useState(false);
  const promptRef = useRef(prompt);
  promptRef.current = prompt;

  useEffect(() => {
    getVeoModels()
      .then((r) => setKlingAsync(!!r.klingAsync))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!klingPoll?.taskId) return;
    const tid = klingPoll.taskId;

    const run = async () => {
      try {
        const s = await getKlingTaskStatus(tid);
        setKlingPoll((prev) => {
          if (!prev || prev.taskId !== tid) return prev;
          return {
            taskId: tid,
            phase: s.phase,
            row: s.row ?? prev.row,
            error: s.error,
          };
        });
        const remote = resolveKlingPlaybackUrl(s.row);
        if (s.phase === 'succeeded' && remote) {
          const playUrl = klingVideoProxyUrl(remote);
          const outTaskId = `kling-${tid}`;
          setVideoResult(playUrl, outTaskId, null);
          saveVideoToHistory({
            taskId: outTaskId,
            videoPath: '',
            videoUrl: playUrl,
            prompt: promptRef.current?.trim() ?? '',
          });
          clearError();
          navigate(`/result?taskId=${encodeURIComponent(outTaskId)}`);
          setKlingPoll(null);
          return;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '轮询失败';
        setKlingPoll((prev) => (prev && prev.taskId === tid ? { ...prev, error: msg } : prev));
      }
    };

    void run();
    const id = setInterval(run, KLING_POLL_MS);
    return () => clearInterval(id);
  }, [klingPoll?.taskId, navigate, setVideoResult, clearError, setError]);

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
        model: videoModel || undefined,
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
      const useKlingAsync =
        !useMock && klingAsync && isKlingModelId(videoModel) && !multiShotEnabled;

      if (useKlingAsync) {
        setKlingSubmitting(true);
        clearError();
        try {
          const refUrl = viralDanceReferenceVideoUrl?.trim();
          const { taskId } = await generateKlingAsync({
            storyboardText: prompt.trim(),
            materials: selectedOrder.map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType })),
            driveToken: accessToken ?? undefined,
            duration: videoDuration,
            aspectRatio: videoAspectRatio,
            model: videoModel || undefined,
            ...(templateId === 'viral-dance' && refUrl
              ? { referenceVideoUrl: refUrl, referenceVideoReferType: 'feature' as const, referenceVideoKeepSound: 'no' as const }
              : {}),
          });
          setKlingPoll({ taskId, phase: 'pending' });
        } catch (e) {
          setError(e instanceof Error ? e.message : '创建可灵任务失败');
        } finally {
          setKlingSubmitting(false);
        }
        return;
      }

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

  const busy = loading || klingSubmitting || !!klingPoll;

  return (
    <section className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <h2 className="text-sm font-medium text-[var(--color-text)] mb-4">生成视频</h2>
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={
            busy ||
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
            : klingSubmitting
              ? templateId === 'viral-dance' && viralDanceReferenceVideoUrl?.trim()
                ? '正在解析参考视频并提交可灵…（TikTok 首次可能需 30–120 秒）'
                : '正在提交可灵任务…'
              : klingPoll
                ? '可灵任务进行中（约每 30 秒检查一次状态）…'
                : '开始生成'}
        </button>

        {klingPoll && (
          <KlingJobCard
            taskId={klingPoll.taskId}
            phase={klingPoll.phase}
            row={klingPoll.row}
            error={klingPoll.error}
          />
        )}

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
