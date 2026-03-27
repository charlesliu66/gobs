/**
 * TikTok 矩阵布局 - 还原 SJ 原版布局
 * 侧边栏 + 顶栏面包屑 + 主内容区
 */
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

const SEGMENTS: Record<string, string> = {
  '/geelark-batch': '批量评论',
  '/geelark-devices': '设备台',
  '/geelark-tasks': '任务日志',
  '/geelark-settings': '设置',
};

const navItems = [
  { to: '/geelark-batch', label: '批量评论', icon: MessageSquareIcon },
  { to: '/geelark-devices', label: '设备台', icon: SmartphoneIcon },
  { to: '/geelark-tasks', label: '任务日志', icon: FileTextIcon },
  { to: '/geelark-settings', label: '设置', icon: SettingsIcon },
];

function MessageSquareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function SmartphoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}
function FileTextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
export function GeelarkLayout() {
  const location = useLocation();
  const pathname = location.pathname;
  const title = SEGMENTS[pathname] ?? '控制台';

  return (
    <div className="geelark-layout flex min-h-screen w-full bg-[var(--geelark-bg)]">
      {/* 左侧边栏 - SJ 风格 */}
      <aside className="geelark-sidebar w-64 flex-shrink-0 border-r border-[var(--geelark-border)] bg-[var(--geelark-sidebar)]">
        <div className="flex h-screen flex-col">
          {/* Sidebar Header */}
          <div className="flex items-center gap-2 border-b border-[var(--geelark-border)] px-4 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--geelark-primary)]">
              <MessageSquareIcon />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[var(--geelark-foreground)]">TikTok 矩阵</span>
              <span className="text-xs text-[var(--geelark-muted)]">控制台</span>
            </div>
          </div>
          {/* Sidebar Content */}
          <div className="flex-1 overflow-auto py-4">
            <div className="px-3">
              <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--geelark-muted)]">导航</div>
              <nav className="space-y-0.5">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[var(--geelark-accent)] text-[var(--geelark-accent-fg)]'
                          : 'text-[var(--geelark-muted)] hover:bg-[var(--geelark-accent)]/50 hover:text-[var(--geelark-foreground)]'
                      }`
                    }
                  >
                    <Icon />
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
          {/* Sidebar Footer */}
          <div className="border-t border-[var(--geelark-border)] p-4 space-y-3">
            <ThemeToggle variant="geelark" />
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--geelark-secondary)]">
                <span className="text-xs font-medium text-[var(--geelark-secondary-fg)]">AD</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--geelark-foreground)]">Admin User</span>
                <span className="text-xs text-[var(--geelark-muted)]">admin@example.com</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
      {/* 主内容区 */}
      <div className="geelark-main flex flex-1 flex-col overflow-hidden">
        {/* 顶栏 - DashboardHeader */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--geelark-border)] px-4 bg-[var(--geelark-bg)]">
          <Link to="/" className="-ml-1 flex items-center justify-center rounded-lg p-2 text-[var(--geelark-muted)] hover:bg-[var(--geelark-accent)]/30 hover:text-[var(--geelark-foreground)]" title="返回主站">
            <ChevronLeftIcon />
          </Link>
          <div className="h-4 w-px bg-[var(--geelark-border)] mx-2" />
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/geelark-batch" className="text-[var(--geelark-muted)] hover:text-[var(--geelark-foreground)]">控制台</Link>
            <span className="text-[var(--geelark-muted)]">/</span>
            <span className="font-medium text-[var(--geelark-foreground)]">{title}</span>
          </nav>
        </header>
        {/* 主内容 */}
        <main className="flex-1 overflow-auto p-6 bg-[var(--geelark-bg)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
