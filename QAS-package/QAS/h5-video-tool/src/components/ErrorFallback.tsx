
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  error: Error;
  resetErrorBoundary?: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: Props) {
  return (
    <div
      role="alert"
      className="min-h-screen flex flex-col items-center justify-center p-8 bg-zinc-900 text-zinc-100"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      <h1 className="text-xl font-bold text-red-400 mb-4">页面加载出错</h1>
      <pre className="text-sm text-left max-w-2xl overflow-auto p-4 bg-zinc-800 rounded-lg mb-6">
        {error.message}
      </pre>
      {resetErrorBoundary && (
        <button
          type="button"
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
        >
          重试
        </button>
      )}
    </div>
  );
}

/** 可包裹任意子组件，捕获渲染错误并显示 ErrorFallback */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

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
