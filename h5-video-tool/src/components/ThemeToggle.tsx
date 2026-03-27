/**
 * 主题切换开关：左侧白天、右侧黑夜，点击切换
 */
import { useTheme } from '../context/ThemeContext';

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

interface ThemeToggleProps {
  /** 使用 Geelark 布局的变量（TikTok 矩阵） */
  variant?: 'default' | 'geelark';
}

export function ThemeToggle({ variant = 'default' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const isLight = theme === 'light';

  const base = variant === 'geelark'
    ? 'bg-[var(--geelark-accent)]'
    : 'bg-[var(--color-surface-hover)]';
  const activeBg = variant === 'geelark'
    ? 'bg-[var(--geelark-primary)] text-white'
    : 'bg-[var(--color-primary)] text-white';
  const inactiveText = variant === 'geelark'
    ? 'text-[var(--geelark-muted)]'
    : 'text-[var(--color-text-muted)]';

  return (
    <div
      role="group"
      aria-label="主题切换"
      className={`flex w-full rounded-lg overflow-hidden ${base} p-0.5 shadow-inner`}
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
          isLight ? `${activeBg} shadow-sm` : `${inactiveText} hover:opacity-80`
        }`}
        title="白天模式"
      >
        <SunIcon />
        白天
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
          !isLight ? `${activeBg} shadow-sm` : `${inactiveText} hover:opacity-80`
        }`}
        title="黑夜模式"
      >
        <MoonIcon />
        黑夜
      </button>
    </div>
  );
}
