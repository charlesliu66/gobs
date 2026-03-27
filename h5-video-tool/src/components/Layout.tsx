import { Outlet, NavLink } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

const navItems = [
  { to: '/', label: '首页', icon: HomeIcon },
  { to: '/studio', label: 'Studio', icon: StudioIcon },
  { to: '/materials', label: '素材管理', icon: MaterialsIcon },
  { to: '/history', label: '历史', icon: HistoryIcon },
  { to: '/distribute', label: '视频分发', icon: DistributeIcon },
  { to: '/geelark-batch', label: 'TikTok 矩阵', icon: GeelarkIcon },
];

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function StudioIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
      <line x1="18" y1="6" x2="18.01" y2="6" />
      <line x1="18" y1="18" x2="18.01" y2="18" />
    </svg>
  );
}

function MaterialsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function DistributeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

function GeelarkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-screen bg-[var(--color-surface)]">
      {/* 左侧边栏 */}
      <aside className="w-56 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <div className="sticky top-0 flex h-screen flex-col">
          {/* Logo / 品牌 */}
          <div className="flex items-center justify-center px-4 py-5 border-b border-[var(--color-border)]">
            <img
              src="/logo.png"
              alt="GOBS - GLIMPSE. OBTAIN. BOOST."
              className="h-12 w-auto max-w-full object-contain"
            />
          </div>
          {/* 导航 */}
          <nav className="flex-1 p-3 space-y-0.5">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
                  }`
                }
              >
                <Icon />
                {label}
              </NavLink>
            ))}
          </nav>
          {/* 设置：主题切换 */}
          <div className="p-3 border-t border-[var(--color-border)]">
            <ThemeToggle />
          </div>
        </div>
      </aside>
      {/* 主内容区 - 统一 p-6 与 TikTok 矩阵一致，内容左对齐避免居中造成左右间距不均 */}
      <main className="flex-1 overflow-auto p-6 bg-[var(--color-surface)]">
        <Outlet />
      </main>
    </div>
  );
}
