import { useCallback, useRef, useState } from 'react';
import {
  generateVideo,
  generateKlingAsync,
  getDreaminaTaskStatus,
  getKlingTaskStatus,
  klingVideoProxyUrl,
  resolveKlingPlaybackUrl,
  submitDreaminaAsync,
  generateMultishot,
  type VideoGenerateRequest,
  type MultishotGenerateRequest,
  type MultishotGenerateResponse,
} from '../api/video';
import { mockGenerateVideo } from '../api/mock/video';

export type VideoGenerationStatus = 'idle' | 'submitting' | 'polling' | 'completed' | 'failed';

export interface VideoGenerationResult {
  taskId: string;
  submitId?: string;
  videoUrl?: string;
  videoPath?: string;
}

export interface VideoGenerationState {
  status: VideoGenerationStatus;
  taskId?: string;
  submitId?: string;
  result?: VideoGenerationResult;
  error?: string;
}

type AsyncProvider = 'dreamina' | 'kling';

const FIRST_POLL_MS = 3000;
const STABLE_POLL_MS = 5000;
const MAX_POLL_MS = 10 * 60 * 1000;

/** VITE_USE_MOCK_VIDEO 默认为 false（显式关闭 mock）*/
const USE_MOCK = import.meta.env.VITE_USE_MOCK_VIDEO !== 'false';

function normalizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '生成失败');
  if (/(^|[\s:])429($|[\s:])|rate.?limit|too many requests/i.test(msg)) {
    return '服务繁忙，请稍后重试';
  }
  return msg;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useVideoGeneration(opts?: {
  onComplete?: (result: VideoGenerationResult) => void;
  onError?: (error: string) => void;
  onProgress?: (state: VideoGenerationState) => void;
}) {
  const [state, setState] = useState<VideoGenerationState>({ status: 'idle' });
  const cancelledRef = useRef(false);

  const emit = useCallback(
    (next: VideoGenerationState) => {
      setState(next);
      opts?.onProgress?.(next);
    },
    [opts],
  );

  const reset = useCallback(() => {
    cancelledRef.current = false;
    emit({ status: 'idle' });
  }, [emit]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    emit({ status: 'idle' });
  }, [emit]);

  const generateSync = useCallback(
    async (request: VideoGenerateRequest): Promise<VideoGenerationResult | null> => {
      cancelledRef.current = false;
      emit({ status: 'submitting' });
      try {
        const res = await generateVideo(request);
        if (cancelledRef.current) return null;
        if (!res?.taskId || !res?.videoUrl) {
          throw new Error('视频生成未返回地址');
        }
        const out: VideoGenerationResult = {
          taskId: res.taskId,
          videoUrl: res.videoUrl,
          videoPath: res.videoPath,
        };
        emit({ status: 'completed', taskId: out.taskId, result: out });
        opts?.onComplete?.(out);
        return out;
      } catch (e) {
        const msg = normalizeError(e);
        emit({ status: 'failed', error: msg });
        opts?.onError?.(msg);
        return null;
      }
    },
    [emit, opts],
  );

  const submitAsync = useCallback(
    async (
      provider: AsyncProvider,
      request: VideoGenerateRequest,
      externalCancel?: { cancelled: boolean },
      /** Called immediately after task submission, before polling starts — use to persist submitId */
      onSubmitted?: (submitId: string, taskId: string) => void,
    ): Promise<VideoGenerationResult | null> => {
      cancelledRef.current = false;
      emit({ status: 'submitting' });
      const startedAt = Date.now();
      try {
        if (provider === 'dreamina') {
          const submit = await submitDreaminaAsync(request);
          if (cancelledRef.current) return null;
          onSubmitted?.(submit.submitId, submit.taskId); // persist before polling
          let polls = 0;
          emit({
            status: 'polling',
            taskId: submit.taskId,
            submitId: submit.submitId,
          });
          while (!cancelledRef.current && !(externalCancel?.cancelled) && Date.now() - startedAt < MAX_POLL_MS) {
            const st = await getDreaminaTaskStatus(submit.submitId);
            if (st.status === 'failed') {
              throw new Error(st.failReason || '即梦任务失败');
            }
            if (st.status === 'completed' && st.videoUrl) {
              const out: VideoGenerationResult = {
                taskId: st.taskId || submit.taskId,
                submitId: submit.submitId,
                videoUrl: st.videoUrl,
                videoPath: st.videoPath,
              };
              emit({
                status: 'completed',
                taskId: out.taskId,
                submitId: out.submitId,
                result: out,
              });
              opts?.onComplete?.(out);
              return out;
            }
            await sleep(polls === 0 ? FIRST_POLL_MS : STABLE_POLL_MS);
            polls += 1;
          }
          throw new Error('即梦生成等待超时（>10min）');
        }

        const submit = await generateKlingAsync(request);
        if (cancelledRef.current) return null;
        let polls = 0;
        emit({ status: 'polling', taskId: submit.taskId });
        while (!cancelledRef.current && !(externalCancel?.cancelled) && Date.now() - startedAt < MAX_POLL_MS) {
          const st = await getKlingTaskStatus(submit.taskId);
          if (st.phase === 'failed') {
            throw new Error(st.error || '可灵任务失败');
          }
          if (st.phase === 'succeeded') {
            const remote = resolveKlingPlaybackUrl(st.row);
            if (!remote) throw new Error('可灵任务完成但未返回可播放地址');
            const out: VideoGenerationResult = {
              taskId: submit.taskId,
              videoUrl: klingVideoProxyUrl(remote),
            };
            emit({ status: 'completed', taskId: out.taskId, result: out });
            opts?.onComplete?.(out);
            return out;
          }
          await sleep(polls === 0 ? FIRST_POLL_MS : STABLE_POLL_MS);
          polls += 1;
        }
        throw new Error('可灵生成等待超时（>10min）');
      } catch (e) {
        const msg = normalizeError(e);
        emit({ status: 'failed', error: msg });
        opts?.onError?.(msg);
        return null;
      }
    },
    [emit, opts],
  );

  const submitQueued = useCallback(
    async (provider: AsyncProvider, request: VideoGenerateRequest): Promise<VideoGenerationResult | null> => {
      cancelledRef.current = false;
      emit({ status: 'submitting' });
      try {
        if (provider === 'dreamina') {
          const submit = await submitDreaminaAsync(request);
          if (cancelledRef.current) return null;
          const out: VideoGenerationResult = {
            taskId: submit.taskId,
            submitId: submit.submitId,
          };
          emit({
            status: 'completed',
            taskId: out.taskId,
            submitId: out.submitId,
            result: out,
          });
          opts?.onComplete?.(out);
          return out;
        }

        const submit = await generateKlingAsync(request);
        if (cancelledRef.current) return null;
        const out: VideoGenerationResult = { taskId: submit.taskId };
        emit({ status: 'completed', taskId: out.taskId, result: out });
        opts?.onComplete?.(out);
        return out;
      } catch (e) {
        const msg = normalizeError(e);
        emit({ status: 'failed', error: msg });
        opts?.onError?.(msg);
        return null;
      }
    },
    [emit, opts],
  );

  // ── 多镜头生成（原 useVideoGenerate.generateMultishot）─────────────────────
  const generateMultishotFn = useCallback(
    async (req: MultishotGenerateRequest): Promise<MultishotGenerateResponse | null> => {
      cancelledRef.current = false;
      emit({ status: 'submitting' });
      try {
        if (USE_MOCK) {
          const mock = await mockGenerateVideo();
          emit({ status: 'completed' });
          return mock ? { status: 'completed', videoUrl: mock.videoUrl ?? '' } : null;
        }
        const result = await generateMultishot(req);
        emit({ status: 'completed' });
        return result;
      } catch (e) {
        const msg = normalizeError(e);
        emit({ status: 'failed', error: msg });
        opts?.onError?.(msg);
        return null;
      }
    },
    [emit, opts],
  );

  // ── 便捷属性（向后兼容 useVideoGenerate 的调用方）─────────────────────────
  const loading = state.status === 'submitting' || state.status === 'polling';
  const error = state.error ?? null;
  const clearError = useCallback(() => emit({ ...state, status: state.status === 'failed' ? 'idle' : state.status, error: undefined }), [emit, state]);
  const setError = useCallback((msg: string | null) => {
    if (msg) emit({ status: 'failed', error: msg });
    else emit({ status: 'idle' });
  }, [emit]);

  return {
    state,
    submitAsync,
    submitQueued,
    generateSync,
    generateMultishot: generateMultishotFn,
    cancel,
    reset,
    // 兼容 useVideoGenerate 的消费者
    loading,
    error,
    clearError,
    setError,
    useMock: USE_MOCK,
  };
}

