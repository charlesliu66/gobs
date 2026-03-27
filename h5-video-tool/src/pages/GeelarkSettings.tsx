/**
 * 代理管理（SJ 功能整合）
 */
import { useCallback, useEffect, useState } from 'react';

const API = '/api/sj';
const SCHEMES = ['socks5', 'http', 'https'];

interface ProxyItem {
  id: string;
  scheme: string;
  server: string;
  port: number;
  username?: string;
  password?: string;
}

export function GeelarkSettings() {
  const [list, setList] = useState<ProxyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<ProxyItem | null>(null);
  const [form, setForm] = useState({ scheme: 'socks5', server: '', port: 8000, username: '', password: '' });

  const load = useCallback((p = page) => {
    setLoading(true);
    setError(null);
    fetch(`${API}/proxies?page=${p}&pageSize=${pageSize}`)
      .then((r) => r.json())
      .then((data: { list?: ProxyItem[]; total?: number } | { error?: string }) => {
        if ((data as { error?: string }).error) {
          setError((data as { error: string }).error);
          setList([]);
        } else {
          setList((data as { list?: ProxyItem[] }).list ?? []);
          setTotal((data as { total?: number }).total ?? 0);
        }
      })
      .catch((e) => {
        setError(e?.message || '请求失败');
        setList([]);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  useEffect(() => {
    load(page);
  }, [load, page]);

  const openAdd = () => {
    setForm({ scheme: 'socks5', server: '', port: 8000, username: '', password: '' });
    setEditing(null);
    setModal('add');
  };

  const openEdit = (item: ProxyItem) => {
    setEditing(item);
    setForm({ scheme: item.scheme, server: item.server, port: item.port, username: item.username ?? '', password: item.password ?? '' });
    setModal('edit');
  };

  const saveAdd = async () => {
    if (!form.server.trim()) {
      alert('请填写代理地址');
      return;
    }
    setActing(true);
    try {
      const res = await fetch(`${API}/proxies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list: [{ scheme: form.scheme, server: form.server.trim(), port: Number(form.port) || 8000, username: form.username.trim() || undefined, password: form.password.trim() || undefined }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setModal(null);
      load(1);
      setPage(1);
    } catch (e) {
      alert(e instanceof Error ? e.message : '添加失败');
    } finally {
      setActing(false);
    }
  };

  const saveEdit = async () => {
    if (!editing || !form.server.trim()) return;
    setActing(true);
    try {
      const res = await fetch(`${API}/proxies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          scheme: form.scheme,
          server: form.server.trim(),
          port: Number(form.port) || 8000,
          username: form.username.trim() || undefined,
          password: form.password.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setModal(null);
      setEditing(null);
      load(page);
    } catch (e) {
      alert(e instanceof Error ? e.message : '更新失败');
    } finally {
      setActing(false);
    }
  };

  const doDelete = async (id: string) => {
    if (!confirm('确定删除该代理？')) return;
    setActing(true);
    try {
      const res = await fetch(`${API}/proxies?ids=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      load(page);
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除失败');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">代理管理</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => load(page)} disabled={loading} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-surface-hover)]">
            刷新
          </button>
          <button type="button" onClick={openAdd} className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:bg-[var(--color-primary-hover)]">
            新增代理
          </button>
        </div>
      </div>
      {error && <div className="rounded-lg border border-[var(--color-error)]/50 p-4 text-[var(--color-error)]">{error}</div>}
      <p className="text-sm text-[var(--color-text-muted)]">按 GeeLark 文档参数：scheme（socks5/http/https）、server、port、username、password。</p>
      {loading && list.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">加载中…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                <th className="text-left p-2">类型</th>
                <th className="text-left p-2">地址</th>
                <th className="text-left p-2">端口</th>
                <th className="text-left p-2">用户名</th>
                <th className="text-left p-2">密码</th>
                <th className="text-right p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                  <td className="p-2 font-medium">{p.scheme}</td>
                  <td className="p-2">{p.server}</td>
                  <td className="p-2">{p.port}</td>
                  <td className="p-2 max-w-[120px] truncate">{p.username ?? '—'}</td>
                  <td className="p-2 max-w-[120px] truncate">{p.password ? '••••••' : '—'}</td>
                  <td className="p-2 text-right">
                    <button type="button" onClick={() => openEdit(p)} disabled={acting} className="text-[var(--color-primary)] hover:underline mr-2">编辑</button>
                    <button type="button" onClick={() => doDelete(p.id)} disabled={acting} className="text-[var(--color-error)] hover:underline">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {total > pageSize && (
        <div className="flex justify-between text-sm text-[var(--color-text-muted)]">
          <span>共 {total} 条</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 rounded border border-[var(--color-border)] disabled:opacity-50">上一页</button>
            <button type="button" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 rounded border border-[var(--color-border)] disabled:opacity-50">下一页</button>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setModal(null); setEditing(null); }}>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium mb-4">{modal === 'add' ? '新增代理' : '编辑代理'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">类型 (scheme)</label>
                <select value={form.scheme} onChange={(e) => setForm((f) => ({ ...f, scheme: e.target.value }))} className="w-full px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
                  {SCHEMES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">地址 (server)</label>
                <input value={form.server} onChange={(e) => setForm((f) => ({ ...f, server: e.target.value }))} placeholder="192.3.8.1" className="w-full px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)]" />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">端口 (port)</label>
                <input type="number" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: parseInt(e.target.value, 10) || 0 }))} placeholder="8000" className="w-full px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)]" />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">用户名 (选填)</label>
                <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="admin" className="w-full px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)]" />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">密码 (选填)</label>
                <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••" className="w-full px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)]" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => { setModal(null); setEditing(null); }} className="flex-1 py-2 rounded-lg border border-[var(--color-border)]">取消</button>
              {modal === 'add' ? (
                <button type="button" onClick={saveAdd} disabled={acting} className="flex-1 py-2 rounded-lg bg-[var(--color-primary)] text-white">添加</button>
              ) : (
                <button type="button" onClick={saveEdit} disabled={acting} className="flex-1 py-2 rounded-lg bg-[var(--color-primary)] text-white">保存</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
