
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  error: Error;
  resetErrorBoundary?: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: Props) {
  return (
    <div
      role="alert"
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{
        fontFamily: 'system-ui, sans-serif',
        backgroundColor: 'var(--color-surface, #18181b)',
        color: 'var(--color-text, #e4e4e7)',
      }}
    >
      <h1
        className="text-xl font-bold mb-4"
        style={{ color: 'var(--color-error, #f87171)' }}
      >
        页面加载出错
      </h1>
      <pre
        className="text-sm text-left max-w-2xl overflow-auto p-4 rounded-lg mb-6"
        style={{
          backgroundColor: 'var(--color-surface-elevated, #27272a)',
          color: 'var(--color-text-muted, #a1a1aa)',
          border: '1px solid var(--color-border, #3f3f46)',
        }}
      >
        {error.message}
      </pre>
      {resetErrorBoundary && (
        <button
          type="button"
          onClick={resetErrorBoundary}
          className="px-4 py-2 rounded-lg font-medium transition-colors"
          style={{
            backgroundColor: 'var(--color-primary, #7c3aed)',
            color: '#ffffff',
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.85';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '1';
          }}
        >
          重试
        </button>
      )}
    </div>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** 可包裹任意子组件，捕获渲染错误并显示 ErrorFallback */
export class StudioErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Studio 子组件渲染错误:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <ErrorFallback error={this.state.error} resetErrorBoundary={this.reset} />
      );
    }
    return this.props.children;
  }
}

/** 全局级错误边界，包裹整个 App 路由 */
export class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <ErrorFallback error={this.state.error} resetErrorBoundary={this.reset} />
      );
    }
    return this.props.children;
  }
}
