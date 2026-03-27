import { NavLink } from 'react-router-dom';

const items = [
  { to: '/geelark-batch', label: '批量评论' },
  { to: '/geelark-devices', label: '设备台' },
  { to: '/geelark-tasks', label: '任务日志' },
  { to: '/geelark-settings', label: '代理设置' },
];

export function GeelarkSubNav() {
  return (
    <div className="flex gap-2 mb-4 pb-3 border-b border-[var(--color-border)]">
      {items.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-lg text-sm font-medium ${
              isActive ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </div>
  );
}
