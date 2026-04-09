/**
 * 全局 Toast 通知系统
 * 使用方式：
 *   import { toast } from '../components/Toast';
 *   toast.success('保存成功');
 *   toast.error('生成失败：xxx');
 *   toast.info('正在上传…');
 *   toast.warning('文件过大');
 */
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
  duration: number;
}

// 全局事件总线
const listeners = new Set<(item: ToastItem) => void>();

function emit(item: ToastItem) {
  listeners.forEach((fn) => fn(item));
}

let idCounter = 0;
function nextId() {
  return `toast_${Date.now()}_${++idCounter}`;
}

export const toast = {
  success: (message: string, duration = 3000) =>
    emit({ id: nextId(), kind: 'success', message, duration }),
  error: (message: string, duration = 5000) =>
    emit({ id: nextId(), kind: 'error', message, duration }),
  info: (message: string, duration = 3000) =>
    emit({ id: nextId(), kind: 'info', message, duration }),
  warning: (message: string, duration = 4000) =>
    emit({ id: nextId(), kind: 'warning', message, duration }),
};

const KIND_STYLES: Record<ToastKind, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: 'bg-[var(--color-surface-elevated)]/95',
    border: 'border-[var(--color-success)]/50',
    icon: '✓',
    text: 'text-[var(--color-success)]',
  },
  error: {
    bg: 'bg-[var(--color-surface-elevated)]/95',
    border: 'border-[var(--color-error)]/50',
    icon: '✕',
    text: 'text-[var(--color-error)]',
  },
  info: {
    bg: 'bg-[var(--color-surface-elevated)]/95',
    border: 'border-[var(--color-primary)]/50',
    icon: 'ℹ',
    text: 'text-[var(--color-primary)]',
  },
  warning: {
    bg: 'bg-[var(--color-surface-elevated)]/95',
    border: 'border-[var(--color-warning)]/50',
    icon: '⚠',
    text: 'text-[var(--color-warning)]',
  },
};

function ToastItem({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const s = KIND_STYLES[item.kind];

  useEffect(() => {
    // 进场动画
    const t1 = setTimeout(() => setVisible(true), 10);
    // 自动消失
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(item.id), 300);
    }, item.duration);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [item.id, item.duration, onRemove]);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-xl max-w-sm w-full transition-all duration-300 ${s.bg} ${s.border} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <span className={`flex-shrink-0 font-bold text-sm mt-0.5 ${s.text}`}>{s.icon}</span>
      <p className="text-sm text-white/90 flex-1 leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          setTimeout(() => onRemove(item.id), 300);
        }}
        className="flex-shrink-0 text-white/40 hover:text-white/80 transition-colors text-xs mt-0.5"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    const handler = (item: ToastItem) => {
      setItems((prev) => [...prev.slice(-4), item]); // 最多同时显示 5 条
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  if (items.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      {items.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastItem item={item} onRemove={remove} />
        </div>
      ))}
    </div>,
    document.body,
  );
}
