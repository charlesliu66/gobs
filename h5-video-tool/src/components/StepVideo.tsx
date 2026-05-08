import { useState, useEffect, useRef } from 'react';
import { useCreateFlow } from '../context/CreateFlowContext';
import { useMaterials } from '../context/MaterialsContext';
import { useVideoGeneration } from '../hooks/useVideoGeneration';
import { useNavigate } from 'react-router-dom';
import { saveVideoToHistory } from '../utils/videoHistory';
import { getVideoFileUrl } from '../utils/videoHistory';
import { filterPlaceholders } from '../utils/materialPlaceholders';
import { generateUUID } from '../utils/uuid';
import {
  checkDreaminaAuthStatus,
  getVeoModels,
  getMultishotJobStatus,
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
  type MultishotJobStatusResponse,
} from '../api/video';
import { submitBatchJobs } from '../api/batchJobs';
import { KlingJobCard } from './KlingJobCard';
import { DreaminaJobCard } from './DreaminaJobCard';
import { DreaminaMultimodalRefs } from './DreaminaMultimodalRefs';
import { RunningStatus } from './RunningStatus';

/** 可灵轮询间隔 */
const KLING_POLL_MS = 30_000;
/** 即梦排队可能较长，略降低请求频率 */
const DREAMINA_POLL_MS = 10_000;
const MULTISHOT_JOB_STORAGE_KEY = 'gobs_multishot_job_id';

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

type MultishotJobView = Pick<
  MultishotJobStatusResponse,
  'jobId' | 'status' | 'shots' | 'finalVideoPath' | 'error' | 'progress'
>;

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
  const {
    generateMultishot,
    loading,
    error,
    clearError,
    setError,
    useMock,
  } = useVideoGeneration();
  const singleVideoGen = useVideoGeneration({
    onError: (msg) => setError(msg),
  });
  const queuedVideoGen = useVideoGeneration({
    onError: (msg) => setError(msg),
  });
  const navigate = useNavigate();
  const [showNoFramesModal, setShowNoFramesModal] = useState(false);

  const [klingAsync, setKlingAsync] = useState(false);
  const [dreaminaAsync, setDreaminaAsync] = useState(false);
  const [klingJobs, setKlingJobs] = useState<KlingJob[]>([]);
  const [dreaminaJobs, setDreaminaJobs] = useState<DreaminaJob[]>([]);
  const [submittingProvider, setSubmittingProvider] = useState<'kling' | 'dreamina' | null>(null);

  // 夜间批量提交状态
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ submitted: number; total: number } | null>(null);
  const [batchDone, setBatchDone] = useState(false);
  const [multishotJob, setMultishotJob] = useState<MultishotJobView | null>(null);
  const [multishotSubmitting, setMultishotSubmitting] = useState(false);
  const doneMultishotJobRef = useRef<string | null>(null);

  const klingJobsRef = useRef(klingJobs);
  klingJobsRef.current = klingJobs;
  const dreaminaJobsRef = useRef(dreaminaJobs);
  dreaminaJobsRef.current = dreaminaJobs;
  const promptRef = useRef(prompt);
  promptRef.current = prompt;

  useEffect(() => {
    try {
      const cachedJobId = localStorage.getItem(MULTISHOT_JOB_STORAGE_KEY)?.trim();
      if (cachedJobId) {
        setMultishotJob({
          jobId: cachedJobId,
          status: 'pending',
          shots: [],
        });
      }
    } catch {
      // ignore
    }
  }, []);

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

  useEffect(() => {
    if (!multishotJob?.jobId) return;
    if (!(multishotJob.status === 'pending' || multishotJob.status === 'running')) return;

    let stopped = false;
    const tick = async () => {
      try {
        const st = await getMultishotJobStatus(multishotJob.jobId);
        if (stopped) return;
        setMultishotJob({
          jobId: st.jobId,
          status: st.status,
          shots: st.shots,
          finalVideoPath: st.finalVideoPath,
          error: st.error,
          progress: st.progress,
        });
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : '多镜头任务查询失败');
      }
    };

    void tick();
    const id = setInterval(() => {
      void tick();
    }, 5000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [multishotJob?.jobId, multishotJob?.status, setError]);

  useEffect(() => {
    try {
      if (!multishotJob?.jobId) {
        localStorage.removeItem(MULTISHOT_JOB_STORAGE_KEY);
        return;
      }
      if (multishotJob.status === 'pending' || multishotJob.status === 'running') {
        localStorage.setItem(MULTISHOT_JOB_STORAGE_KEY, multishotJob.jobId);
      } else {
        localStorage.removeItem(MULTISHOT_JOB_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [multishotJob?.jobId, multishotJob?.status]);

  useEffect(() => {
    if (!multishotJob || multishotJob.status !== 'done' || !multishotJob.finalVideoPath) return;
    if (doneMultishotJobRef.current === multishotJob.jobId) return;
    doneMultishotJobRef.current = multishotJob.jobId;
    const taskId = `multishot-${multishotJob.jobId}`;
    const playbackUrl = getVideoFileUrl(multishotJob.finalVideoPath);
    setVideoResult(playbackUrl, taskId, multishotJob.finalVideoPath);
    saveVideoToHistory({
      taskId,
      videoPath: multishotJob.finalVideoPath,
      prompt: shots.map((s) => s.prompt).join('\n---\n'),
    });
    clearError();
    navigate(`/result?taskId=${taskId}`);
  }, [multishotJob, shots, setVideoResult, clearError, navigate]);

  const hasMissingFrames =
    multiShotEnabled &&
    shots.length > 0 &&
    shots.some((_, i) => !shotFrames[i]?.first);

  const buildDreaminaPromptHints = () => {
    const imageItems = dreaminaMultimodalItems.filter((i) => i.kind === 'image');
    const roleImageIndex = imageItems.findIndex((i) => i.semanticRole === 'role');
    const sceneImageIndex = imageItems.findIndex((i) => i.semanticRole === 'scene');
    return {
      autoComposePrompt: true,
      dreaminaPromptHints: {
        ...(roleImageIndex >= 0 ? { roleImageIndex } : {}),
        ...(sceneImageIndex >= 0 ? { sceneImageIndex } : {}),
      },
    };
  };

  /** 🌙 夜间批量提交：遍历所有分镜，逐个调用 submitDreaminaAsync，收集 submitId 后存入后端队列 */
  const handleBatchNight = async () => {
    if (shots.length === 0) return;
    if (isDreaminaModelId(videoModel) && !useMock) {
      try {
        const auth = await checkDreaminaAuthStatus();
        if (!auth.loggedIn) {
          setError(auth.error || '即梦服务登录已过期，请联系管理员在服务器重新登录');
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '即梦登录态检测失败');
        return;
      }
    }
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
    if (isDreaminaModelId(videoModel) && !useMock) {
      try {
        const auth = await checkDreaminaAuthStatus();
        if (!auth.loggedIn) {
          setError(auth.error || '即梦服务登录已过期，请联系管理员在服务器重新登录');
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '即梦登录态检测失败');
        return;
      }
    }
    if (multiShotEnabled && shots.length > 0 && isDreaminaMultimodalModelId(videoModel)) {
      setError('全能参考（即梦 multimodal）暂不支持多镜头拼接，请关闭多镜头后再试。');
      return;
    }
    if (multiShotEnabled && shots.length > 0) {
      if (!useMock) {
        setMultishotSubmitting(true);
        setMultishotJob(null);
      }
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
      setMultishotSubmitting(false);
      if (res?.status === 'pending' && res.jobId) {
        setMultishotJob({
          jobId: res.jobId,
          status: 'pending',
          shots: shots.map((s, i) => ({
            index: i,
            status: 'pending',
            promptSnippet: s.prompt.trim().slice(0, 120),
            durationSeconds: s.duration,
          })),
          progress: {
            total: shots.length,
            done: 0,
            failed: 0,
            running: 0,
            pending: shots.length,
          },
        });
        return;
      }
      if (res?.videoUrl) {
        const taskId = `multishot-${Date.now()}`;
        setVideoResult(res.videoUrl, taskId, res.outputPath);
        if (res.outputPath) {
          saveVideoToHistory({
            taskId,
            videoPath: res.outputPath,
            prompt: shots.map((s) => s.prompt).join('\n---\n'),
          });
        }
        clearError();
        navigate(`/result?taskId=${taskId}`);
      }
    } else if (prompt?.trim()) {
      const useDreaminaSubmit =
        !useMock && dreaminaAsync && isDreaminaModelId(videoModel) && !multiShotEnabled;

      if (useDreaminaSubmit) {
        setSubmittingProvider('dreamina');
        clearError();
        try {
          const queued = await queuedVideoGen.submitQueued('dreamina', {
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
                  ...buildDreaminaPromptHints(),
                }
              : {}),
          });
          const submitId = queued?.submitId;
          if (!submitId || !queued?.taskId) return;
          setDreaminaJobs((prev) => [
            ...prev,
            {
              id: generateUUID(),
              submitId,
              taskId: queued.taskId,
              status: 'pending',
              promptSnippet: prompt.trim().slice(0, 80),
            },
          ]);
        } finally {
          setSubmittingProvider(null);
        }
        return;
      }

      const useKlingAsyncPath =
        !useMock && klingAsync && isKlingModelId(videoModel) && !multiShotEnabled;

      if (useKlingAsyncPath) {
        setSubmittingProvider('kling');
        clearError();
        try {
          const refUrl = viralDanceReferenceVideoUrl?.trim();
          const queued = await queuedVideoGen.submitQueued('kling', {
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
          if (!queued?.taskId) return;
          setKlingJobs((prev) => [...prev, { id: generateUUID(), taskId: queued.taskId, phase: 'pending' }]);
        } finally {
          setSubmittingProvider(null);
        }
        return;
      }

      const res = await singleVideoGen.generateSync({
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
              ...buildDreaminaPromptHints(),
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

  const busy =
    loading ||
    multishotSubmitting ||
    queuedVideoGen.state.status === 'submitting' ||
    singleVideoGen.state.status === 'submitting' ||
    singleVideoGen.state.status === 'polling';
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
            : multishotSubmitting
              ? '正在创建多镜头任务…'
            : submittingProvider === 'kling'
              ? templateId === 'viral-dance' && viralDanceReferenceVideoUrl?.trim()
                ? '正在解析参考视频并提交可灵…（首次解析可能需 30–120 秒）'
                : '正在提交可灵任务…'
              : submittingProvider === 'dreamina'
                ? '正在提交即梦任务…'
                : '开始生成'}
        </button>
        <RunningStatus
          active={
            loading ||
            multishotSubmitting ||
            queuedVideoGen.state.status === 'submitting' ||
            multishotJob?.status === 'pending' ||
            multishotJob?.status === 'running'
          }
          label={loading ? '正在生成视频' : '正在提交视频任务'}
          stallAfterSec={30}
          scene="rehearsal"
        />

        <p className="text-xs text-[var(--color-text-muted)]">
          {dreaminaAsync && isDreaminaModelId(videoModel) && !useMock
            ? '即梦为异步排队：提交后可继续点击「开始生成」创建新任务；下方卡片展示各任务排队与成片。全能参考会自动重写为结构化 Prompt（支持主角/场景一键纠正）。'
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
            <RunningStatus
              active={batchSubmitting}
              label="正在批量提交分镜任务"
              stallAfterSec={25}
              scene="rehearsal"
            />
          </div>
        )}

        {multishotJob && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-[var(--color-text)]">多镜头任务进度</p>
              <span className="text-xs text-[var(--color-text-muted)]">
                {multishotJob.progress
                  ? `${multishotJob.progress.done}/${multishotJob.progress.total} 完成`
                  : `任务 ${multishotJob.jobId}`}
              </span>
            </div>
            {multishotJob.progress && (
              <div className="h-1.5 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        ((multishotJob.progress.done + multishotJob.progress.failed) /
                          Math.max(1, multishotJob.progress.total)) *
                          100,
                      ),
                    )}%`,
                  }}
                />
              </div>
            )}
            <div className="space-y-2">
              {multishotJob.shots.map((shot) => (
                <div
                  key={shot.index}
                  className="flex items-start justify-between gap-3 rounded-lg border border-[var(--color-border)]/80 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--color-text)]">镜头 {shot.index + 1}</p>
                    <p className="truncate text-[11px] text-[var(--color-text-muted)]">{shot.promptSnippet || '-'}</p>
                  </div>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    {shot.status === 'pending'
                      ? '排队中'
                      : shot.status === 'running'
                        ? '生成中'
                        : shot.status === 'done'
                          ? '完成'
                          : '失败'}
                  </span>
                </div>
              ))}
            </div>
            {multishotJob.status === 'error' && (
              <p className="text-xs text-[var(--color-error)]">{multishotJob.error || '多镜头任务失败'}</p>
            )}
            {multishotJob.status === 'done' && multishotJob.finalVideoPath && (
              <p className="text-xs text-green-400">已完成拼接，正在跳转成片页...</p>
            )}
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
