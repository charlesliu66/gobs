/**
 * TikTok 批量评论定时发布（SJ 功能整合）
 */
import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { parseBatchPaste } from '../lib/parseBatchPaste';

const API = '/api/sj';
const TIMEZONES = ['UTC+8', 'UTC+9', 'UTC+7', 'UTC+0', 'UTC-5', 'UTC-8', 'UTC+1', 'UTC-6'];

interface Task {
  id: string;
  selected: boolean;
  deviceName: string;
  deviceId: string;
  videoLink: string;
  comment: string;
  scheduleDate: Date | undefined;
  scheduleTime: string;
  timezone: string;
}

interface Device {
  id: string;
  serialName?: string;
  serialNo?: string;
}

function newEmptyTask(defaultTimezone: string): Task {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    selected: false,
    deviceName: '',
    deviceId: '',
    videoLink: '',
    comment: '',
    scheduleDate: undefined,
    scheduleTime: '14:30',
    timezone: defaultTimezone,
  };
}

export function GeelarkBatch() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [defaultTimezone, setDefaultTimezone] = useState('UTC+8');
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [geelarkOk, setGeelarkOk] = useState<boolean | null>(null);
  const [geelarkMessage, setGeelarkMessage] = useState('');
  const [batchPasteText, setBatchPasteText] = useState('');
  const [submitResult, setSubmitResult] = useState<{ ok: number; fail: number; detail?: string } | null>(null);
  const [aiDialog, setAiDialog] = useState<{ taskId: string; suggestions: string[] } | null>(null);
  const [selectedComment, setSelectedComment] = useState('');
  const [useAsia, setUseAsia] = useState(true);
  const [batchNameDialog, setBatchNameDialog] = useState<{
    taskIds: string[];
    links: string[];
    items: { taskId?: string; error?: string; link?: string }[];
  } | null>(null);
  const [batchNameInput, setBatchNameInput] = useState('');

  useEffect(() => {
    fetch(`${API}/geelark-status`)
      .then((r) => r.json())
      .then((s: { ok?: boolean; message?: string }) => {
        setGeelarkOk(!!s.ok);
        setGeelarkMessage(s.message || '');
        return fetch(`${API}/phones`);
      })
      .then((r) => r.json())
      .then((data: unknown) => {
        setDevices(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        setGeelarkOk(false);
        setGeelarkMessage(e instanceof Error ? e.message : '请求失败');
        setDevices([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tasks.length === 0 && devices.length > 0) {
      setTasks([{
        ...newEmptyTask(defaultTimezone),
        deviceId: devices[0]?.id ?? '',
        deviceName: devices[0]?.serialName ?? devices[0]?.serialNo ?? '',
      }]);
    }
  }, [devices.length, defaultTimezone]);

  const resolveDevice = useCallback((deviceIdOrName?: string): { id: string; name: string } => {
    const first = { id: devices[0]?.id ?? '', name: devices[0]?.serialName || devices[0]?.serialNo || '' };
    if (!deviceIdOrName?.trim()) return first;
    const key = deviceIdOrName.trim();
    const found = devices.find((d) => d.id === key || d.serialName === key || String(d.serialNo) === key);
    if (found) return { id: found.id, name: found.serialName || String(found.serialNo ?? found.id) };
    return first;
  }, [devices]);

  const handleBatchPaste = useCallback(() => {
    const rows = parseBatchPaste(batchPasteText, { now: new Date(), defaultTimezone });
    if (rows.length === 0) {
      alert('未解析到有效行。格式：每行 Tab 分隔。可选首列设备ID或名称，然后：视频链接、评论、发布日期、发布时间、时区。');
      return;
    }
    const newTasks: Task[] = rows.map((r) => {
      const { id: deviceId, name: deviceName } = resolveDevice(r.deviceIdOrName);
      return {
        ...newEmptyTask(r.timezone || defaultTimezone),
        videoLink: r.videoLink,
        comment: r.comment,
        scheduleDate: r.scheduleDate,
        scheduleTime: r.scheduleTime || '14:30',
        timezone: r.timezone || defaultTimezone,
        deviceId,
        deviceName,
      };
    });
    setTasks(newTasks);
    setBatchPasteText('');
  }, [batchPasteText, defaultTimezone, resolveDevice]);

  const handleScheduleAll = useCallback(async () => {
    const valid = tasks.filter((t) => t.deviceId && t.videoLink && t.comment && (t.scheduleDate || t.scheduleTime));
    if (valid.length === 0) {
      alert('请至少填写一行完整信息：云手机、视频链接、评论、发布时间');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: valid.map((t) => ({
            phoneId: t.deviceId,
            videoLink: t.videoLink,
            comment: t.comment,
            scheduleDate: t.scheduleDate ? format(t.scheduleDate, 'yyyy-MM-dd') : undefined,
            scheduleTime: t.scheduleTime || '14:30',
            timezone: t.timezone || defaultTimezone,
            useAsia,
          })),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const results = data.results || [];
      const ok = results.filter((r: { taskId?: string }) => r.taskId).length;
      const fail = results.filter((r: { error?: string }) => r.error).length;
      const items = results.map((r: { taskId?: string; error?: string }, i: number) => ({
        taskId: r.taskId,
        error: r.error,
        link: valid[i]?.videoLink ?? '',
      }));
      setBatchNameDialog({
        taskIds: items.map((it: { taskId?: string }) => it.taskId).filter(Boolean) as string[],
        links: items.map((it: { link?: string }) => it.link ?? ''),
        items,
      });
      setBatchNameInput('');
      setSubmitResult({
        ok,
        fail,
        detail: results.filter((r: { error?: string }) => r.error).map((r: { error?: string }, i: number) => `第${i + 1}条: ${r.error}`).join('；'),
      });
      alert(`提交完成：成功 ${ok} 条，失败 ${fail} 条。请为本次任务命名。`);
    } catch (e) {
      setSubmitResult({ ok: 0, fail: 1, detail: e instanceof Error ? e.message : '提交失败' });
      alert(e instanceof Error ? e.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  }, [tasks, defaultTimezone, useAsia]);

  const confirmBatchName = useCallback(() => {
    if (!batchNameDialog) return;
    const name = (batchNameInput || '批量评论').trim();
    try {
      const key = 'geelark_batch_tasks';
      const prev = JSON.parse(localStorage.getItem(key) || '[]');
      prev.unshift({
        batchId: `batch-${Date.now()}`,
        taskIds: batchNameDialog.taskIds,
        links: batchNameDialog.links,
        items: batchNameDialog.items,
        createdAt: Date.now(),
        planName: name,
      });
      localStorage.setItem(key, JSON.stringify(prev.slice(0, 200)));
    } catch {}
    setBatchNameDialog(null);
    setBatchNameInput('');
  }, [batchNameDialog, batchNameInput]);

  const filteredTasks = tasks.filter(
    (t) =>
      t.videoLink.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.deviceName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="page-title">批量评论定时发布</h1>
        <p className="page-subtitle">多视频链接、多评论，支持批量粘贴（Tab 分隔）</p>
      </div>

      {geelarkOk === false && (
        <div className="rounded-lg border border-[var(--color-error)]/50 bg-[var(--color-error)]/10 p-4 text-[var(--color-error)]">
          GeeLark 未连接：{geelarkMessage}。请在 h5-video-tool-api 的 .env 中配置 GEELARK_BEARER_TOKEN 后重启。
        </div>
      )}

      {submitResult != null && (
        <div className={`rounded-lg border p-4 ${submitResult.fail > 0 ? 'border-[var(--color-error)]/50' : 'border-[var(--color-border)]'}`}>
          <p className="text-sm">提交结果：成功 {submitResult.ok} 条，失败 {submitResult.fail} 条。</p>
          {submitResult.detail && <p className="mt-2 text-xs text-[var(--color-text-muted)]">失败原因：{submitResult.detail}</p>}
          <button type="button" onClick={() => setSubmitResult(null)} className="mt-2 text-sm text-[var(--color-primary)] hover:underline">关闭</button>
        </div>
      )}

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
        <p className="card-title">批量粘贴</p>
        <p className="label-muted mb-2">
          每行 Tab 分隔。可选首列设备ID或名称，然后：视频链接、评论、发布日期(2026/7/7)、发布时间(18:10)、时区(UTC+7)。
        </p>
        <textarea
          value={batchPasteText}
          onChange={(e) => setBatchPasteText(e.target.value)}
          placeholder="设备名或ID	https://www.tiktok.com/@xxx/video/123	评论	2026/7/7	18:10	UTC+8"
          className="w-full min-h-[100px] px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-mono text-xs"
        />
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={handleBatchPaste} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-surface-hover)]">
            解析并填入下方表格
          </button>
          <button type="button" onClick={() => { setBatchPasteText(''); setSubmitResult(null); setTasks(devices.length ? [{ ...newEmptyTask(defaultTimezone), deviceId: devices[0].id, deviceName: devices[0].serialName || devices[0].serialNo || '' }] : []); }} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-surface-hover)]">
            清空
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-[var(--color-text-muted)]">默认时区：</span>
        <select value={defaultTimezone} onChange={(e) => setDefaultTimezone(e.target.value)} className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm">
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={useAsia} onChange={(e) => setUseAsia(e.target.checked)} className="rounded" />
          <span className="text-sm text-[var(--color-text-muted)]">使用亚洲版 API</span>
        </label>
        <div className="flex-1" />
        <button type="button" onClick={() => setTasks([...tasks, { ...newEmptyTask(defaultTimezone), deviceId: devices[0]?.id ?? '', deviceName: devices[0]?.serialName || devices[0]?.serialNo || '' }])} className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-surface-hover)]">
          + 添加一行
        </button>
        <button type="button" onClick={handleScheduleAll} disabled={submitting || geelarkOk === false} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:bg-[var(--color-primary-hover)] disabled:opacity-50">
          {submitting ? '提交中…' : '批量提交定时任务'}
        </button>
      </div>

      <input
        type="text"
        placeholder="按链接、评论或设备搜索..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full max-w-md px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
      />

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">加载云手机列表中...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                <th className="text-left p-2 w-8"><input type="checkbox" /></th>
                <th className="text-left p-2">云手机</th>
                <th className="text-left p-2">视频链接</th>
                <th className="text-left p-2">评论</th>
                <th className="text-left p-2">日期</th>
                <th className="text-left p-2">时间</th>
                <th className="text-left p-2">时区</th>
                <th className="text-left p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((t) => (
                <tr key={t.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                  <td className="p-2"><input type="checkbox" checked={t.selected} onChange={(e) => setTasks(tasks.map((x) => x.id === t.id ? { ...x, selected: e.target.checked } : x))} /></td>
                  <td className="p-2">
                    <select value={t.deviceId} onChange={(e) => { const d = devices.find((x) => x.id === e.target.value); setTasks(tasks.map((x) => x.id === t.id ? { ...x, deviceId: d?.id ?? '', deviceName: d?.serialName || d?.serialNo || '' } : x)); }} className="w-32 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs">
                      {devices.map((d) => (
                        <option key={d.id} value={d.id}>{d.serialName || d.serialNo || d.id}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2"><input type="text" value={t.videoLink} onChange={(e) => setTasks(tasks.map((x) => x.id === t.id ? { ...x, videoLink: e.target.value } : x))} placeholder="TikTok 链接" className="w-48 px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-xs" /></td>
                  <td className="p-2"><input type="text" value={t.comment} onChange={(e) => setTasks(tasks.map((x) => x.id === t.id ? { ...x, comment: e.target.value } : x))} placeholder="评论" className="w-32 px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-xs" /></td>
                  <td className="p-2"><input type="date" value={t.scheduleDate ? format(t.scheduleDate, 'yyyy-MM-dd') : ''} onChange={(e) => setTasks(tasks.map((x) => x.id === t.id ? { ...x, scheduleDate: e.target.value ? new Date(e.target.value) : undefined } : x))} className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-xs" /></td>
                  <td className="p-2"><input type="time" value={t.scheduleTime} onChange={(e) => setTasks(tasks.map((x) => x.id === t.id ? { ...x, scheduleTime: e.target.value } : x))} className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-xs" /></td>
                  <td className="p-2">
                    <select value={t.timezone} onChange={(e) => setTasks(tasks.map((x) => x.id === t.id ? { ...x, timezone: e.target.value } : x))} className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs">
                      {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <button type="button" onClick={async () => { try { const r = await fetch(`${API}/generate-comment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: t.videoLink || 'https://www.tiktok.com/' }) }); const d = await r.json(); setAiDialog({ taskId: t.id, suggestions: d.suggestions || ['Nice!'] }); setSelectedComment(d.suggestions?.[0] || 'Nice!'); } catch { setAiDialog({ taskId: t.id, suggestions: ['Nice!', 'So good!'] }); setSelectedComment('Nice!'); } }} className="text-[var(--color-primary)] hover:underline text-xs">AI 生成</button>
                    <button type="button" onClick={() => setTasks(tasks.filter((x) => x.id !== t.id))} className="ml-2 text-[var(--color-error)] hover:underline text-xs">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
        <span>任务总数：{tasks.length}</span>
        <span>已选：{tasks.filter((t) => t.selected).length}</span>
        <span>云手机在线：{devices.length}</span>
      </div>

      {aiDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setAiDialog(null)}>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium mb-2">选择或编辑评论</p>
            <ul className="list-disc pl-4 space-y-1 max-h-32 overflow-y-auto mb-2">
              {aiDialog.suggestions.map((s, i) => (
                <li key={i} className="cursor-pointer text-sm hover:bg-[var(--color-surface-hover)] rounded px-2 py-1" onClick={() => setSelectedComment(s)}>{s}</li>
              ))}
            </ul>
            <input value={selectedComment} onChange={(e) => setSelectedComment(e.target.value)} className="w-full px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] mb-4" />
            <button type="button" onClick={() => { setTasks(tasks.map((x) => x.id === aiDialog.taskId ? { ...x, comment: selectedComment } : x)); setAiDialog(null); }} className="w-full py-2 rounded-lg bg-[var(--color-primary)] text-white">使用该评论</button>
          </div>
        </div>
      )}

      {batchNameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setBatchNameDialog(null)}>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium mb-2">为本次任务命名</p>
            <input value={batchNameInput} onChange={(e) => setBatchNameInput(e.target.value)} placeholder="例如：3月18日亚洲区评论" className="w-full px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] mb-4" onKeyDown={(e) => e.key === 'Enter' && confirmBatchName()} />
            <button type="button" onClick={confirmBatchName} className="w-full py-2 rounded-lg bg-[var(--color-primary)] text-white">确认并记录到任务日志</button>
          </div>
        </div>
      )}
    </div>
  );
}
