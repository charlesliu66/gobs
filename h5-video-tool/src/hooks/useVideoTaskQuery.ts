/**
 * useVideoTaskQuery — 基于 React Query 的视频任务状态轮询
 *
 * 与 useVideoGeneration 的区别：
 * - useVideoGeneration: 手动 while+sleep 循环，阻塞 hook 生命周期
 * - useVideoTaskQuery: useQuery + refetchInterval，非阻塞，页面切换后继续后台轮询
 *
 * 当前用于：
 * - Dreamina 任务（submitId → getDreaminaTaskStatus）
 * - Kling 任务（taskId → getKlingTaskStatus）
 */
import { useQuery } from '@tanstack/react-query';
import {
  getDreaminaTaskStatus,
  getKlingTaskStatus,
  klingVideoProxyUrl,
  resolveKlingPlaybackUrl,
} from '../api/video';

const POLL_MS = 4000;

// ── Dreamina 任务轮询 ──────────────────────────────────────────────────────────

export interface DreaminaTaskResult {
  status: 'pending' | 'completed' | 'failed';
  videoUrl?: string;
  videoPath?: string;
  errorCode?: string;
  failReason?: string;
}

/**
 * 轮询 Dreamina 任务状态，直到完成或失败（自动停止）。
 * @param submitId null 时禁用轮询
 */
export function useDreaminaTaskQuery(submitId: string | null) {
  return useQuery<DreaminaTaskResult>({
    queryKey: ['dreamina-task', submitId],
    enabled: !!submitId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'completed' || data?.status === 'failed') return false;
      return POLL_MS;
    },
    queryFn: async () => {
      const st = await getDreaminaTaskStatus(submitId!);
      if (st.status === 'failed') {
        return {
          status: 'failed' as const,
          errorCode: st.errorCode,
          failReason: st.failReason,
        };
      }
      if (st.status === 'completed' && st.videoUrl) {
        return {
          status: 'completed' as const,
          videoUrl: st.videoUrl,
          videoPath: st.videoPath,
        };
      }
      return { status: 'pending' as const };
    },
    staleTime: 0,
  });
}

// ── Kling 任务轮询 ────────────────────────────────────────────────────────────

export interface KlingTaskResult {
  status: 'pending' | 'completed' | 'failed';
  videoUrl?: string;
  errorCode?: string;
}

/**
 * 轮询 Kling 任务状态，直到完成或失败（自动停止）。
 * @param taskId null 时禁用轮询
 */
export function useKlingTaskQuery(taskId: string | null) {
  return useQuery<KlingTaskResult>({
    queryKey: ['kling-task', taskId],
    enabled: !!taskId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'completed' || data?.status === 'failed') return false;
      return POLL_MS;
    },
    queryFn: async () => {
      const st = await getKlingTaskStatus(taskId!);
      if (st.phase === 'failed') {
        return { status: 'failed' as const, errorCode: st.errorCode };
      }
      if (st.phase === 'succeeded') {
        const remote = resolveKlingPlaybackUrl(st.row);
        if (!remote) return { status: 'failed' as const, errorCode: 'KLING_TASK_FAILED' };
        return { status: 'completed' as const, videoUrl: klingVideoProxyUrl(remote) };
      }
      return { status: 'pending' as const };
    },
    staleTime: 0,
  });
}
