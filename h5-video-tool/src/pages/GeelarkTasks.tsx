/**
 * 任务日志（SJ 功能整合）
 */
import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';

const API = '/api/sj';
const BATCH_KEY = 'geelark_batch_tasks';
const TASK_STATUS: Record<number, string> = { 1: '等待', 2: '进行中', 3: '已完成', 4: '失败', 7: '已取消' };
const TASK_TYPE_NAMES: Record<number, string> = { 1: 'TikTok 发视频', 2: 'TikTok 养号', 3: 'TikTok 图集', 42: '自定义' };

interface BatchRecord {
  batchId: string;
  taskIds: string[];
  links?: string[];
  items?: { taskId?: string; error?: string; link?: string }[];
  createdAt: number;
  planName?: string;
}

interface TaskItem {
  id: string;
  planName?: string;
  taskType?: number;
  serialName?: string;
  scheduleAt?: number;
  status?: number;
  failDesc?: string;
  cost?: number;
  resultImages?: string[];
  logs?: string[];
  logContinue?: boolean;
  searchAfter?: number[];
}

export function GeelarkTasks() {
  const [history, setHistory] = useState<TaskItem[]>([]);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [subTasks, setSubTasks] = useState<Record<string, TaskItem[]>>({});
  const [acting, setActing] = useState(false);
  const [reportTaskId, setReportTaskId] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState<TaskItem | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportLogs, setReportLogs] = useState<string[]>([]);

  const loadHistory = useCallback(() => {
    fetch(`${API}/tasks/history`).then((r) => r.json()).then((d: { items?: TaskItem[]; error?: string }) => {
      if ('items' in d && d.items) setHistory(d.items);
      else if ('error' in d && d.error) setError(d.error);
    }).catch((e) => setError(e?.message || '请求失败'));
  }, []);

  const loadBatches = useCallback(() => {
    try {
      const raw = localStorage.getItem(BATCH_KEY);
      setBatches(Array.isArray(JSON.parse(raw || '[]')) ? JSON.parse(raw || '[]') : []);
    } catch {
      setBatches([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/tasks/history`)
      .then((r) => r.json())
      .then((d: { items?: TaskItem[]; error?: string }) => {
        if (d.items) setHistory(d.items);
        if (d.error) setError(d.error);
      })
      .catch((e) => setError(e?.message || '请求失败'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const toggleBatch = (batchId: string) => {
    if (expandedBatch === batchId) {
      setExpandedBatch(null);
      return;
    }
    setExpandedBatch(batchId);
    const batch = batches.find((b) => b.batchId === batchId);
    const ids = (batch?.items?.map((i) => i.taskId).filter(Boolean) as string[]) ?? batch?.taskIds ?? [];
    if (ids.length > 0 && !subTasks[batchId]) {
      fetch(`${API}/tasks/query`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids })})
        .then((r) => r.json())
        .then((d: { items?: TaskItem[] }) => setSubTasks((prev) => ({ ...prev, [batchId]: d?.items ?? [] })));
    }
  };

  const cancelTasks = async (ids: string[]) => {
    if (ids.length === 0) return;
    setActing(true);
    try {
      const res = await fetch(`${API}/tasks/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      loadHistory();
      setSubTasks({});
      setExpandedBatch(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : '取消失败');
    } finally {
      setActing(false);
    }
  };

  const openReport = (taskId: string) => {
    setReportTaskId(taskId);
    setReportDetail(null);
    setReportLogs([]);
    setReportLoading(true);
    fetch(`${API}/tasks/detail`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: taskId }) })
      .then((r) => r.json())
      .then((d: TaskItem & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        setReportDetail(d);
        setReportLogs(d.logs ?? []);
      })
      .catch(() => setReportDetail(null))
      .finally(() => setReportLoading(false));
  };

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">任务日志</h1>
        <button type="button" onClick={() => { setLoading(true); loadHistory(); loadBatches(); setLoading(false); }} disabled={loading} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-surface-hover)]">
          刷新
        </button>
      </div>
      {error && <div className="rounded-lg border border-[var(--color-error)]/50 p-4 text-[var(--color-error)]">{error}</div>}

      {batches.length > 0 && (
        <div className="space-y-2">
          <h2 className="section-title">本站发起的批量任务</h2>
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                  <th className="w-10 p-2" />
                  <th className="text-left p-2">任务名称</th>
                  <th className="text-left p-2">子任务数</th>
                  <th className="text-left p-2">创建时间</th>
                  <th className="text-right p-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <React.Fragment key={b.batchId}>
                    <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] cursor-pointer" onClick={() => toggleBatch(b.batchId)}>
                      <td className="p-2">{expandedBatch === b.batchId ? '▼' : '▶'}</td>
                      <td className="p-2 font-medium">{b.planName ?? '批量评论'}</td>
                      <td className="p-2">{b.items?.length ?? b.taskIds?.length ?? 0}</td>
                      <td className="p-2">{format(new Date(b.createdAt), 'yyyy-MM-dd HH:mm')}</td>
                      <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => cancelTasks(b.taskIds)} disabled={acting} className="text-sm text-[var(--color-error)] hover:underline">终止整批</button>
                      </td>
                    </tr>
                    {expandedBatch === b.batchId && (b.items ?? b.taskIds?.map((id, i) => ({ taskId: id, link: b.links?.[i] })) ?? []).map((item, idx) => {
                      const it = item as { taskId?: string; error?: string; link?: string };
                      if (it.error) {
                        return (
                          <tr key={`err-${idx}-${it.link}`} className="border-b border-[var(--color-border)] bg-[var(--color-error)]/10">
                            <td className="p-2" />
                            <td className="p-2">{it.link ? <a href={it.link} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">{it.link.slice(0, 40)}…</a> : `第${idx + 1}条`}</td>
                            <td className="p-2" colSpan={3}><span className="text-[var(--color-error)]">发布失败：{it.error}</span></td>
                          </tr>
                        );
                      }
                      const t = (subTasks[b.batchId] ?? []).find((x) => x.id === it.taskId);
                      return (
                        <tr key={it.taskId ?? idx} className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                          <td className="p-2" />
                          <td className="p-2">{it.link ? <a href={it.link} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">{it.link.slice(0, 40)}…</a> : it.taskId?.slice(-8)}</td>
                          <td className="p-2">{t?.serialName ?? '—'}</td>
                          <td className="p-2">{t?.scheduleAt ? format(new Date(t.scheduleAt * 1000), 'yyyy-MM-dd HH:mm') : '—'}</td>
                          <td className="p-2">
                            <span className={t?.status === 2 ? 'text-amber-500' : t?.status === 3 ? 'text-green-500' : t?.status === 4 ? 'text-red-500' : ''}>
                              {t ? (TASK_STATUS[t.status ?? 0] ?? '—') : '—'} {t?.failDesc ?? ''}
                            </span>
                            {(t?.status === 1 || t?.status === 2) && it.taskId && (
                              <button type="button" onClick={() => cancelTasks([it.taskId!])} disabled={acting} className="ml-2 text-[var(--color-error)] hover:underline text-xs">终止</button>
                            )}
                            {it.taskId && <button type="button" onClick={() => openReport(it.taskId!)} className="ml-2 text-[var(--color-primary)] hover:underline text-xs">报告</button>}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="section-title">GeeLark 近期任务</h2>
        {loading && history.length === 0 ? (
          <p className="text-[var(--color-text-muted)]">加载中…</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                  <th className="text-left p-2">任务 ID</th>
                  <th className="text-left p-2">计划名</th>
                  <th className="text-left p-2">类型</th>
                  <th className="text-left p-2">云手机</th>
                  <th className="text-left p-2">计划时间</th>
                  <th className="text-left p-2">状态</th>
                  <th className="text-right p-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {history.map((t) => (
                  <tr key={t.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                    <td className="p-2 font-mono text-xs">{t.id}</td>
                    <td className="p-2">{t.planName ?? '—'}</td>
                    <td className="p-2">{t.taskType != null ? (TASK_TYPE_NAMES[t.taskType] ?? t.taskType) : '—'}</td>
                    <td className="p-2">{t.serialName ?? '—'}</td>
                    <td className="p-2">{t.scheduleAt ? format(new Date(t.scheduleAt * 1000), 'yyyy-MM-dd HH:mm') : '—'}</td>
                    <td className="p-2">
                      <span className={t.status === 2 ? 'text-amber-500' : t.status === 3 ? 'text-green-500' : t.status === 4 ? 'text-red-500' : ''}>
                        {TASK_STATUS[t.status ?? 0] ?? '—'} {t.failDesc ?? ''}
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <button type="button" onClick={() => openReport(t.id)} className="text-[var(--color-primary)] hover:underline text-xs">报告</button>
                      {(t.status === 1 || t.status === 2) && (
                        <button type="button" onClick={() => cancelTasks([t.id])} disabled={acting} className="ml-2 text-[var(--color-error)] hover:underline text-xs">终止</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reportTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setReportTaskId(null)}>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium mb-4">任务报告</h3>
            {reportLoading && <p className="text-[var(--color-text-muted)]">加载中…</p>}
            {!reportLoading && reportDetail && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>任务 ID：{reportDetail.id}</div>
                  <div>计划名称：{reportDetail.planName ?? '—'}</div>
                  <div>云手机：{reportDetail.serialName ?? '—'}</div>
                  <div>计划时间：{reportDetail.scheduleAt ? format(new Date(reportDetail.scheduleAt * 1000), 'yyyy-MM-dd HH:mm:ss') : '—'}</div>
                  <div>耗时：{reportDetail.cost != null ? `${reportDetail.cost} 秒` : '—'}</div>
                  <div>状态：{TASK_STATUS[reportDetail.status ?? 0] ?? '—'}</div>
                </div>
                {reportDetail.resultImages && reportDetail.resultImages.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">任务截图</p>
                    <div className="flex flex-wrap gap-2">
                      {reportDetail.resultImages.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`截图 ${i + 1}`} className="max-h-64 rounded border" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="font-medium mb-2">任务日志</p>
                  <pre className="rounded bg-[var(--color-surface)] p-3 text-xs overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">{reportLogs.length ? reportLogs.join('\n') : '无'}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
