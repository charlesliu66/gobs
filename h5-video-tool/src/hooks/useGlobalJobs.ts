import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getBatchJobs, type BatchJobDto, type QueueSnapshotDto } from '../api/batchJobs';
import { useLocale } from '../i18n/LocaleContext.tsx';
import { sendBrowserNotification } from '../utils/notification';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const STREAM_RETRY_BASE_MS = 1500;
const STREAM_RETRY_MAX_MS = 10000;

export interface GlobalJobsState {
  jobs: BatchJobDto[];
  snapshot: QueueSnapshotDto;
  activeCount: number;
  panelOpen: boolean;
  togglePanel: () => void;
  closePanel: () => void;
  dismissJob: (id: string) => void;
  refreshJobs: (projectId?: string) => Promise<void>;
  upsertJobs: (jobs: BatchJobDto[]) => void;
}

const DEFAULT_SNAPSHOT: QueueSnapshotDto = {
  totalActive: 0,
  totalWaiting: 0,
  avgSecPerJob: 120,
  recentSuccessAvgSec: 120,
  recentSuccessSampleCount: 0,
  maxConcurrent: 3,
  availableSlots: 3,
};

const TERMINAL_JOB_STATUSES = new Set<BatchJobDto['status']>(['done', 'failed', 'cancelled']);

function resolveLocalizedReason(uiLocale: 'zh-CN' | 'en', job: BatchJobDto): string {
  if (uiLocale === 'en') {
    return job.displayMessageEn?.trim()
      || job.displayMessageZh?.trim()
      || job.failReason?.trim()
      || 'Unknown';
  }
  return job.displayMessageZh?.trim()
    || job.displayMessageEn?.trim()
    || job.failReason?.trim()
    || '未知原因';
}

const GlobalJobsContext = createContext<GlobalJobsState>({
  jobs: [],
  snapshot: DEFAULT_SNAPSHOT,
  activeCount: 0,
  panelOpen: false,
  togglePanel: () => {},
  closePanel: () => {},
  dismissJob: () => {},
  refreshJobs: async () => {},
  upsertJobs: () => {},
});

export const useGlobalJobs = () => useContext(GlobalJobsContext);
export { GlobalJobsContext };

export function useGlobalJobsProvider(): GlobalJobsState {
  const { uiLocale } = useLocale();
  const [jobMap, setJobMap] = useState<Map<string, BatchJobDto>>(new Map());
  const [snapshot, setSnapshot] = useState<QueueSnapshotDto>(DEFAULT_SNAPSHOT);
  const [panelOpen, setPanelOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const seededTerminalKeysRef = useRef(false);
  const announcedTerminalKeysRef = useRef<Set<string>>(new Set());

  const upsertJobs = useCallback((incomingJobs: BatchJobDto[]) => {
    if (incomingJobs.length === 0) return;
    setJobMap((prev) => {
      const next = new Map(prev);
      for (const job of incomingJobs) {
        if (!job?.id) continue;
        next.set(job.id, job);
      }
      return next;
    });
  }, []);

  const refreshJobs = useCallback(async (projectId?: string) => {
    try {
      const { jobs } = await getBatchJobs(projectId);
      upsertJobs(jobs);
    } catch (error) {
      console.warn('[global-jobs] refresh failed', error);
    }
  }, [upsertJobs]);

  useEffect(() => {
    const token = localStorage.getItem('gobs_token') ?? '';
    if (!token) return;

    const url = `${API_BASE}/api/batch-jobs/stream?token=${encodeURIComponent(token)}`;
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let es: EventSource | null = null;
    let reconnectAttempts = 0;

    const connect = () => {
      if (disposed) return;
      es = new EventSource(url);

      es.onopen = () => {
        reconnectAttempts = 0;
        void refreshJobs();
      };

      es.onmessage = (event: MessageEvent) => {
        try {
          const job = JSON.parse(event.data as string) as BatchJobDto;
          upsertJobs([job]);
        } catch {
          // Ignore malformed events.
        }
      };

      es.addEventListener('queue-snapshot', (event: MessageEvent) => {
        try {
          const next = JSON.parse(event.data as string) as QueueSnapshotDto;
          setSnapshot(next);
        } catch {
          // Ignore malformed events.
        }
      });

      es.onerror = () => {
        if (disposed) return;
        es?.close();
        const delay = Math.min(STREAM_RETRY_BASE_MS * (2 ** reconnectAttempts), STREAM_RETRY_MAX_MS);
        reconnectAttempts += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    void refreshJobs();
    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [refreshJobs, upsertJobs]);

  const allJobs = useMemo(() => (
    Array.from(jobMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  ), [jobMap]);

  const jobs = useMemo(() => (
    Array.from(jobMap.values())
      .filter((job) => !dismissed.has(job.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  ), [jobMap, dismissed]);

  useEffect(() => {
    const currentTerminalKeys = new Set(
      allJobs
        .filter((job) => TERMINAL_JOB_STATUSES.has(job.status))
        .map((job) => `${job.id}:${job.status}:${job.updatedAt}`),
    );

    if (!seededTerminalKeysRef.current) {
      announcedTerminalKeysRef.current = currentTerminalKeys;
      seededTerminalKeysRef.current = true;
      return;
    }

    for (const job of allJobs) {
      if (!TERMINAL_JOB_STATUSES.has(job.status)) continue;
      const key = `${job.id}:${job.status}:${job.updatedAt}`;
      if (announcedTerminalKeysRef.current.has(key)) continue;
      announcedTerminalKeysRef.current.add(key);

      if (job.status === 'done') {
        const title = uiLocale === 'en' ? 'Storyboard Video Ready' : '分镜视频已完成';
        const body = uiLocale === 'en'
          ? `Shot ${job.shotIndex} finished and returned to this project.`
          : `第 ${job.shotIndex} 镜已完成，结果已回写到当前项目。`;
        sendBrowserNotification(title, body);
        continue;
      }

      if (job.status === 'cancelled') {
        const title = uiLocale === 'en' ? 'Storyboard Tracking Stopped' : '分镜任务已停止跟进';
        const reason = resolveLocalizedReason(uiLocale, job);
        const body = uiLocale === 'en'
          ? `Shot ${job.shotIndex}: ${reason}`
          : `第 ${job.shotIndex} 镜：${reason}`;
        sendBrowserNotification(title, body);
        continue;
      }

      const title = uiLocale === 'en' ? 'Storyboard Video Failed' : '分镜视频生成失败';
      const reason = resolveLocalizedReason(uiLocale, job);
      const body = uiLocale === 'en'
        ? `Shot ${job.shotIndex}: ${reason}`
        : `第 ${job.shotIndex} 镜：${reason}`;
      sendBrowserNotification(title, body);
    }
  }, [allJobs, uiLocale]);

  const activeCount = useMemo(
    () => jobs.filter((job) => !['done', 'failed', 'cancelled'].includes(job.status)).length,
    [jobs],
  );

  const togglePanel = useCallback(() => setPanelOpen((open) => !open), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const dismissJob = useCallback((id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  }, []);

  return {
    jobs,
    snapshot,
    activeCount,
    panelOpen,
    togglePanel,
    closePanel,
    dismissJob,
    refreshJobs,
    upsertJobs,
  };
}
