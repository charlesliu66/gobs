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
  submitDreaminaAsync,
  getDreaminaTaskStatus,
  klingVideoProxyUrl,
  resolveKlingPlaybackUrl,
  isKlingModelId,
  isDreaminaMultimodalModelId,
  isDreaminaModelId,
  type KlingPollPhase,
  type KlingVideoListRow,
  type DreaminaTaskPollResponse,
} from '../api/video';
import { KlingJobCard } from './KlingJobCard';
import { DreaminaJobCard } from './DreaminaJobCard';
import { DreaminaMultimodalRefs } from './DreaminaMultimodalRefs';

/** 可灵轮询间隔 */
const KLING_POLL_MS = 30_000;
/** 即梦排队可能较长，略降低请求频率 */
const DREAMINA_POLL_MS = 10_000;

type KlingJob = {
  id: string;
  taskId: string;
  phase: KlingPollPhase;
  row?: KlingVideoListRow;
  error?: string;
};

type DreaminaJob = {
  id: string;
  submitId: string;
  taskId: string;
  status: DreaminaTaskPollResponse['status'];
  queueInfo?: DreaminaTaskPollResponse['queueInfo'];
  genStatus?: string;
  failReason?: string;
  videoUrl?: string;
  videoPath?: string;
  promptSnippet?: string;
};

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
    dreaminaMultimodalItems,
    setDreaminaMultimodalItems,
  } = useCreateFlow();
  const selectedOrder = filterPlaceholders(rawSelectedOrder);
  const { accessToken } = useMaterials();
  const { generate, generateMultishot, loading, error, clearError, setError, useMock } = useVideoGenerate();
  const navigate = useNavigate();
  const [showNoFramesModal, setShowNoFramesModal] = useState(false);

  const [klingAsync, setKlingAsync] = useState(false);
  const [dreaminaAsync, setDreaminaAsync] = useState(false);
  const [klingJobs, setKlingJobs] = useState<KlingJob[]>([]);
  const [dreaminaJobs, setDreaminaJobs] = useState<DreaminaJob[]>([]);
  const [klingSubmitting, setKlingSubmitting] = useState(false);
  const [dreaminaSubmitting, setDreaminaSubmitting] = useState(false);

  const klingJobsRef = useRef(klingJobs);
  klingJobsRef.current = klingJobs;
  const dreaminaJobsRef = useRef(dreaminaJobs);
  dreaminaJobsRef.current = dreaminaJobs;
  const promptRef = useRef(prompt);
  promptRef.current = prompt;

  useEffect(() => {
    getVeoModels()
      .then((r) => {
        setKlingAsync(!!r.klingAsync);
        setDreaminaAsync(!!r.dreaminaAsync);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const tick = async () => {
      const snapshot = klingJobsRef.current;
      const active = snapshot.filter((j) => j.phase === 'pending' || j.phase === 'processing');
      for (const job of active) {
        try {
          const s = await getKlingTaskStatus(job.taskId);
          const remote = resolveKlingPlaybackUrl(s.row);
          const activeBeforeSuccess = klingJobsRef.current.filter(
            (j) => j.phase === 'pending' || j.phase === 'processing',
          ).length;

          setKlingJobs((prev) =>
            prev.map((j) =>
              j.taskId === job.taskId ? { ...j, phase: s.phase, row: s.row ?? j.row, error: s.error } : j,
            ),
          );

          if (s.phase === 'succeeded' && remote) {
            const playUrl = klingVideoProxyUrl(remote);
            const outTaskId = `kling-${job.taskId}`;
            saveVideoToHistory({
              taskId: outTaskId,
              videoPath: '',
              videoUrl: playUrl,
              prompt: promptRef.current?.trim() ?? '',
            });
            setVideoResult(playUrl, outTaskId, null);
            clearError();
            setKlingJobs((prev) => prev.filter((j) => j.taskId !== job.taskId));
            if (activeBeforeSuccess <= 1) {
              navigate(`/result?taskId=${encodeURIComponent(outTaskId)}`);
            }
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : '轮询失败';
          setKlingJobs((prev) =>
            prev.map((j) => (j.taskId === job.taskId ? { ...j, error: msg } : j)),
          );
        }
      }
    };

    void tick();
    const id = setInterval(tick, KLING_POLL_MS);
    return () => clearInterval(id);
  }, [klingJobs.length, navigate, setVideoResult, clearError]);

  useEffect(() => {
    const tick = async () => {
      const snapshot = dreaminaJobsRef.current;
      const active = snapshot.filter((j) => j.status === 'pending');
      for (const job of active) {
        try {
          const s = await getDreaminaTaskStatus(job.submitId);
          if (s.status === 'failed') {
            setDreaminaJobs((prev) =>
              prev.map((j) =>
                j.id === job.id
                  ? {
                      ...j,
                      status: 'failed',
                      failReason: s.failReason,
                      queueInfo: s.queueInfo,
                    }
                  : j,
              ),
            );
            continue;
          }
          if (s.status === 'completed' && s.videoUrl) {
            const promptText = promptRef.current?.trim() ?? '';
            saveVideoToHistory({
              taskId: s.taskId,
              videoPath: s.videoPath ?? '',
              prompt: promptText,
              ...(s.videoPath?.trim() ? {} : { videoUrl: s.videoUrl }),
            });
            setDreaminaJobs((prev) =>
              prev.map((j) =>
                j.id === job.id
                  ? {
                      ...j,
                      status: 'completed',
                      videoUrl: s.videoUrl,
                      videoPath: s.videoPath,
                      queueInfo: undefined,
                    }
                  : j,
              ),
            );
            continue;
          }
          if (s.status === 'pending') {
            setDreaminaJobs((prev) =>
              prev.map((j) =>
                j.id === job.id
                  ? { ...j, queueInfo: s.queueInfo, genStatus: s.genStatus }
                  : j,
              ),
            );
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : '轮询失败';
          setDreaminaJobs((prev) =>
            prev.map((j) => (j.id === job.id ? { ...j, status: 'failed', failReason: msg } : j)),
          );
        }
      }
    };

    void tick();
    const id = setInterval(tick, DREAMINA_POLL_MS);
    return () => clearInterval(id);
  }, [dreaminaJobs.length]);

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
    if (multiShotEnabled && shots.length > 0 && isDreaminaMultimodalModelId(videoModel)) {
      setError('全能参考（即梦 multimodal）暂不支持多镜头拼接，请关闭多镜头后再试。');
      return;
    }
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
      const useDreaminaSubmit =
        !useMock && dreaminaAsync && isDreaminaModelId(videoModel) && !multiShotEnabled;

      if (useDreaminaSubmit) {
        setDreaminaSubmitting(true);
        clearError();
        try {
          const { submitId, taskId } = await submitDreaminaAsync({
            storyboardText: prompt.trim(),
            materials: selectedOrder.map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType })),
            driveToken: accessToken ?? undefined,
            duration: videoDuration,
            aspectRatio: videoAspectRatio,
            resolution: videoResolution,
            model: videoModel || undefined,
            ...(isDreaminaMultimodalModelId(videoModel)
              ? {
                  multimodalImages: dreaminaMultimodalItems
                    .filter((i) => i.kind === 'image')
                    .map((i) => ({ base64: i.base64, mimeType: i.mimeType })),
                  multimodalVideos: dreaminaMultimodalItems
                    .filter((i) => i.kind === 'video')
                    .map((i) => ({ base64: i.base64, mimeType: i.mimeType })),
                  multimodalAudios: dreaminaMultimodalItems
                    .filter((i) => i.kind === 'audio')
                    .map((i) => ({ base64: i.base64, mimeType: i.mimeType })),
                }
              : {}),
          });
          setDreaminaJobs((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              submitId,
              taskId,
              status: 'pending',
              promptSnippet: prompt.trim().slice(0, 80),
            },
          ]);
        } catch (e) {
          setError(e instanceof Error ? e.message : '即梦提交失败');
        } finally {
          setDreaminaSubmitting(false);
        }
        return;
      }

      const useKlingAsyncPath =
        !useMock && klingAsync && isKlingModelId(videoModel) && !multiShotEnabled;

      if (useKlingAsyncPath) {
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
          setKlingJobs((prev) => [...prev, { id: crypto.randomUUID(), taskId, phase: 'pending' }]);
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
        ...(isDreaminaMultimodalModelId(videoModel) && !useMock
          ? {
              multimodalImages: dreaminaMultimodalItems
                .filter((i) => i.kind === 'image')
                .map((i) => ({ base64: i.base64, mimeType: i.mimeType })),
              multimodalVideos: dreaminaMultimodalItems
                .filter((i) => i.kind === 'video')
                .map((i) => ({ base64: i.base64, mimeType: i.mimeType })),
              multimodalAudios: dreaminaMultimodalItems
                .filter((i) => i.kind === 'audio')
                .map((i) => ({ base64: i.base64, mimeType: i.mimeType })),
            }
          : {}),
      });
      if (res?.videoUrl && res?.taskId) {
        setVideoResult(res.videoUrl, res.taskId, res.videoPath);
        saveVideoToHistory({
          taskId: res.taskId,
          videoPath: res.videoPath ?? '',
          prompt: prompt.trim(),
          ...(res.videoPath?.trim() ? {} : { videoUrl: res.videoUrl }),
        });
        clearError();
        navigate(`/result?taskId=${res.taskId}`);
      }
    }
  };

  const busy = loading || klingSubmitting || dreaminaSubmitting;
  const multimodalReady =
    !isDreaminaMultimodalModelId(videoModel) ||
    useMock ||
    dreaminaMultimodalItems.some((i) => i.kind === 'image' || i.kind === 'video');

  return (
    <section className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <h2 className="text-sm font-medium text-[var(--color-text)] mb-4">生成视频</h2>
      <div className="space-y-4">
        {isDreaminaMultimodalModelId(videoModel) && (
          <DreaminaMultimodalRefs items={dreaminaMultimodalItems} onChange={setDreaminaMultimodalItems} />
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={
            busy ||
            (multiShotEnabled
              ? shots.length === 0 || shots.some((s) => !s.prompt.trim())
              : !prompt?.trim()) ||
            !multimodalReady
          }
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading
            ? multiShotEnabled
              ? '正在生成多镜头视频，请稍候…'
              : isDreaminaMultimodalModelId(videoModel)
                ? '正在生成（全能参考，即梦可能需数分钟）…'
                : '正在生成视频，预计 1–2 分钟…'
            : klingSubmitting
              ? templateId === 'viral-dance' && viralDanceReferenceVideoUrl?.trim()
                ? '正在解析参考视频并提交可灵…（TikTok 首次可能需 30–120 秒）'
                : '正在提交可灵任务…'
              : dreaminaSubmitting
                ? '正在提交即梦任务…'
                : '开始生成'}
        </button>

        <p className="text-xs text-[var(--color-text-muted)]">
          {dreaminaAsync && isDreaminaModelId(videoModel) && !useMock
            ? '即梦为异步排队：提交后可继续点击「开始生成」创建新任务；下方卡片展示各任务排队与成片。'
            : klingAsync && isKlingModelId(videoModel) && !useMock
              ? '可灵异步：可同时保留多个进行中的任务。'
              : null}
        </p>

        {(klingJobs.length > 0 || dreaminaJobs.length > 0) && (
          <div className="flex flex-col gap-3">
            {dreaminaJobs.map((j) => (
              <DreaminaJobCard
                key={j.id}
                taskId={j.taskId}
                submitId={j.submitId}
                status={j.status}
                queueInfo={j.queueInfo}
                genStatus={j.genStatus}
                failReason={j.failReason}
                videoUrl={j.videoUrl}
                promptSnippet={j.promptSnippet}
                onDismiss={() => setDreaminaJobs((prev) => prev.filter((x) => x.id !== j.id))}
              />
            ))}
            {klingJobs.map((j) => (
              <KlingJobCard key={j.id} taskId={j.taskId} phase={j.phase} row={j.row} error={j.error} />
            ))}
          </div>
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
