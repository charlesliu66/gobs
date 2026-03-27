/**
 * 云手机设备台（SJ 功能整合）
 */
import { useCallback, useEffect, useState } from 'react';

const API = '/api/sj';
const STATUS_MAP: Record<number, string> = { 0: '已启动', 1: '启动中', 2: '已关机' };

interface Phone {
  id: string;
  serialName?: string;
  serialNo?: string;
  status?: number;
  group?: { id: string; name: string };
  remark?: string;
  proxy?: { type?: string; server?: string; port?: number };
}

interface ProxyItem {
  id: string;
  scheme: string;
  server: string;
  port: number;
}

export function GeelarkDevices() {
  const [phones, setPhones] = useState<Phone[]>([]);
  const [proxies, setProxies] = useState<ProxyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<Phone | null>(null);
  const [editName, setEditName] = useState('');
  const [editRemark, setEditRemark] = useState('');
  const [editProxyId, setEditProxyId] = useState('_');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setActionResult(null);
    Promise.all([
      fetch(`${API}/phones`).then((r) => r.json()),
      fetch(`${API}/proxies?page=1&pageSize=100`).then((r) => r.json()),
    ])
      .then(([phonesData, proxiesData]) => {
        setPhones(Array.isArray(phonesData) ? phonesData : []);
        setProxies(proxiesData?.list ?? []);
        if (!Array.isArray(phonesData) && phonesData?.error) setError(phonesData.error);
      })
      .catch((e) => setError(e?.message || '请求失败'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const doAction = async (action: 'start' | 'stop' | 'delete', ids: string[]) => {
    if (ids.length === 0) return;
    setActing(true);
    setActionResult(null);
    try {
      const res = await fetch(`${API}/phones/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (action === 'delete') {
        setPhones((p) => p.filter((x) => !ids.includes(x.id)));
        setActionResult('已删除');
      } else {
        const ok = data.successAmount ?? 0;
        const fail = data.failAmount ?? 0;
        setActionResult(ok > 0 ? `成功 ${ok} 台` + (fail > 0 ? `，失败 ${fail} 台` : '') : (fail > 0 ? `失败` : '无变化'));
        load();
      }
    } catch (e) {
      setActionResult(e instanceof Error ? e.message : '操作失败');
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setActing(false);
    }
  };

  const openEdit = (p: Phone) => {
    setEditModal(p);
    setEditName(p.serialName ?? p.serialNo ?? '');
    setEditRemark(p.remark ?? '');
    setEditProxyId('_');
  };

  const saveEdit = async () => {
    if (!editModal) return;
    setActing(true);
    try {
      const res = await fetch(`${API}/phones/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editModal.id,
          name: editName || undefined,
          remark: editRemark || undefined,
          proxyId: editProxyId !== '_' ? editProxyId : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPhones((p) => p.map((x) => (x.id === editModal.id ? { ...x, serialName: editName || x.serialName, remark: editRemark || x.remark } : x)));
      setEditModal(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存失败');
    } finally {
      setActing(false);
    }
  };

  const proxyLabel = (p: Phone['proxy']) => (p ? [p.type, p.server, p.port].filter(Boolean).join(':') || '—' : '—');

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">云手机列表</h1>
        <button type="button" onClick={load} disabled={loading} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-surface-hover)] disabled:opacity-50">
          {loading ? '加载中…' : '刷新'}
        </button>
      </div>
      {error && <div className="rounded-lg border border-[var(--color-error)]/50 bg-[var(--color-error)]/10 p-4 text-[var(--color-error)]">{error}</div>}
      {actionResult && (
        <div className="rounded-lg border border-[var(--color-border)] p-4 flex items-center justify-between">
          <span>{actionResult}</span>
          <button type="button" onClick={() => setActionResult(null)} className="text-sm text-[var(--color-primary)] hover:underline">关闭</button>
        </div>
      )}
      {loading && phones.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">加载中…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                <th className="text-left p-2">名称/序列号</th>
                <th className="text-left p-2">状态</th>
                <th className="text-left p-2">分组</th>
                <th className="text-left p-2">代理</th>
                <th className="text-left p-2">备注</th>
                <th className="text-right p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {phones.map((p) => (
                <tr key={p.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                  <td className="p-2 font-medium">{p.serialName ?? p.serialNo ?? p.id}</td>
                  <td className="p-2">{STATUS_MAP[p.status ?? 2] ?? '—'}</td>
                  <td className="p-2">{p.group?.name ?? '—'}</td>
                  <td className="p-2 max-w-[220px] truncate text-[var(--color-text-muted)]" title={proxyLabel(p.proxy)}>{proxyLabel(p.proxy)}</td>
                  <td className="p-2 max-w-[200px] truncate">{p.remark ?? '—'}</td>
                  <td className="p-2 text-right space-x-1">
                    <button type="button" onClick={() => doAction('start', [p.id])} disabled={acting} className="p-1.5 rounded hover:bg-[var(--color-surface-hover)]" title="启动">▶</button>
                    <button type="button" onClick={() => doAction('stop', [p.id])} disabled={acting} className="p-1.5 rounded hover:bg-[var(--color-surface-hover)]" title="关机">⏹</button>
                    <button type="button" onClick={() => openEdit(p)} disabled={acting} className="p-1.5 rounded hover:bg-[var(--color-surface-hover)]" title="编辑">✎</button>
                    <button type="button" onClick={() => confirm('确定删除？') && doAction('delete', [p.id])} disabled={acting} className="p-1.5 rounded hover:bg-[var(--color-error)]/20 text-[var(--color-error)]" title="删除">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditModal(null)}>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium mb-4">编辑云手机</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">名称</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)]" />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">备注</label>
                <input value={editRemark} onChange={(e) => setEditRemark(e.target.value)} className="w-full px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)]" />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">代理</label>
                <select value={editProxyId} onChange={(e) => setEditProxyId(e.target.value)} className="w-full px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <option value="_">不修改代理</option>
                  {proxies.map((px) => (
                    <option key={px.id} value={px.id}>{px.scheme} {px.server}:{px.port}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setEditModal(null)} className="flex-1 py-2 rounded-lg border border-[var(--color-border)]">取消</button>
              <button type="button" onClick={saveEdit} disabled={acting} className="flex-1 py-2 rounded-lg bg-[var(--color-primary)] text-white">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
