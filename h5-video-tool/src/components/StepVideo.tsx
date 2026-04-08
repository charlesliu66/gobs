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
import { submitBatchJobs } from '../api/batchJobs';
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

  // 夜间批量提交状态
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ submitted: number; total: number } | null>(null);
  const [batchDone, setBatchDone] = useState(false);

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

  /** 🌙 夜间批量提交：遍历所有分镜，逐个调用 submitDreaminaAsync，收集 submitId 后存入后端队列 */
  const handleBatchNight = async () => {
    if (shots.length === 0) return;
    setBatchSubmitting(true);
    setBatchDone(false);
    setBatchProgress({ submitted: 0, total: shots.length });

    const batchShots: Array<{ submitId: string; taskId: string; shotIndex: number; shotDescription: string; model: string }> = [];

    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      if (!shot.prompt.trim()) continue;
      try {
        const { submitId, taskId } = await submitDreaminaAsync({
          storyboardText: shot.prompt.trim(),
          materials: selectedOrder.map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType })),
          driveToken: accessToken ?? undefined,
          duration: videoDuration,
          aspectRatio: videoAspectRatio,
          resolution: videoResolution,
          model: videoModel || undefined,
        });
        batchShots.push({
          submitId,
          taskId,
          shotIndex: i,
          shotDescription: shot.prompt.trim().slice(0, 120),
          model: videoModel || 'dreamina',
        });
      } catch (e) {
        console.warn(`[BatchNight] 分镜 ${i + 1} 提交失败`, e);
      }
      setBatchProgress({ submitted: i + 1, total: shots.length });
    }

    // 存入后端队列
    try {
      await submitBatchJobs(templateId || 'default', batchShots);
    } catch (e) {
      console.log('batch submitted (fallback log):', batchShots.map((s) => s.submitId));
      console.warn('[BatchNight] submitBatchJobs failed', e);
    }

    setBatchSubmitting(false);
    setBatchDone(true);
  };

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

        {/* 🌙 夜间批量提交区域：仅在即梦异步 + 多分镜时显示 */}
        {dreaminaAsync && isDreaminaModelId(videoModel) && !useMock && multiShotEnabled && shots.length > 0 && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🌙</span>
              <span className="text-sm font-medium text-[var(--color-text)]">夜间批量提交</span>
              <span className="text-xs text-[var(--color-text-muted)] ml-auto">{shots.length} 个分镜</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              一次性提交所有分镜到即梦队列，关掉浏览器后台继续生成，明天来「历史 → 批量任务看板」审片。
            </p>
            {batchProgress && (
              <div className="space-y-1.5">
                <div className="h-1.5 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                    style={{ width: `${(batchProgress.submitted / batchProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  已提交 {batchProgress.submitted}/{batchProgress.total} 个分镜
                </p>
              </div>
            )}
            {batchDone && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
                <p className="text-xs text-green-400">
                  ✅ 已提交 {batchProgress?.total ?? shots.length} 个分镜，关掉浏览器后台继续生成，明天来审片
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => void handleBatchNight()}
              disabled={batchSubmitting || shots.some((s) => !s.prompt.trim())}
              className="w-full px-4 py-2 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {batchSubmitting
                ? `提交中… (${batchProgress?.submitted ?? 0}/${batchProgress?.total ?? shots.length})`
                : '🌙 夜间批量提交全部分镜'}
            </button>
          </div>
        )}

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
          className="fixed top-0 right-0 bottom-0 left-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:left-56"
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
