import { useState } from 'react';
import type { EditorAgentJobProgress } from '../../api/editor';

type LogVariant = 'user' | 'agent' | 'progress' | 'token' | 'error' | 'system';

function classifyLogLine(line: string): LogVariant {
  if (line.startsWith('你：') || line.startsWith('你:')) return 'user';
  if (line.startsWith('Agent：') || line.startsWith('Agent:')) return 'agent';
  if (line.startsWith('助手：') || line.startsWith('助手:')) return 'agent';
  if (line.startsWith('进度：') || line.startsWith('进度:')) return 'progress';
  if (line.startsWith('Token') || line.includes('Token 合计')) return 'token';
  if (line.startsWith('错误：') || line.startsWith('错误:')) return 'error';
  return 'system';
}

const bubbleClass: Record<LogVariant, string> = {
  user:
    'max-w-[min(92%,20rem)] rounded-2xl rounded-br-md border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/18 text-[var(--color-text)] shadow-sm',
  agent:
    'max-w-[min(96%,22rem)] rounded-2xl rounded-bl-md border border-sky-500/35 bg-sky-500/12 text-[var(--color-text)] shadow-sm',
  progress:
    'max-w-[min(96%,22rem)] rounded-xl border border-amber-500/30 bg-amber-500/10 text-[var(--color-text)]',
  token:
    'max-w-[min(96%,22rem)] rounded-xl border border-violet-500/25 bg-violet-500/8 font-mono text-[10px] text-[var(--color-text-muted)]',
  error:
    'max-w-[min(96%,22rem)] rounded-xl border border-red-500/40 bg-red-500/12 text-red-300',
  system:
    'max-w-[min(96%,22rem)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]',
};

interface AgentPanelProps {
  logs: string[];
  onPushLog: (line: string) => void;
  onApply: (userMessage: string) => Promise<void>;
  busy: boolean;
  /** 剪辑任务流式进度（百分比 + 粗估剩余时间） */
  jobProgress?: EditorAgentJobProgress | null;
  selectedCount: number;
  /** 未勾选时，若时间轴上已有片段，将用时间轴上的素材做「继续调整」 */
  timelineAssetCount: number;
  /** 最近一次 Agent 成功后的成片结构（Markdown 表），对齐竞品「交付说明」 */
  deliverableMarkdown?: string | null;
  /** 本次会话的对话历史（仅 chat 轮次） */
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** busy 期间可调用，请求中止当前 Agent 流式任务 */
  onAbort?: () => void;
}

export function AgentPanel({
  logs,
  onPushLog,
  onApply,
  busy,
  jobProgress,
  selectedCount,
  timelineAssetCount,
  deliverableMarkdown,
  chatHistory,
  onAbort,
}: AgentPanelProps) {
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const send = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || busy) return;
    onPushLog(`你：${t}`);
    setInput('');
    try {
      await onApply(t);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        onPushLog('Agent 任务已取消');
        return;
      }
      onPushLog(`错误：${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const hint =
    selectedCount > 0
      ? `将针对已选 ${selectedCount} 条素材处理`
      : timelineAssetCount > 0
        ? `未勾选时将按时间轴上 ${timelineAssetCount} 段素材继续调整`
        : '请先勾选素材，或先加入时间轴';

  const recentHistory = chatHistory && chatHistory.length > 0
    ? chatHistory.slice(-10)
    : [];

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <div className="border-b border-[var(--color-border)] px-3 py-2">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">剪辑 Agent</h2>
        <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{hint}</p>
      </div>
      {recentHistory.length > 0 && (
        <div className="border-b border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/20"
          >
            <span>📜 历史对话（{Math.floor(recentHistory.length / 2)} 轮）</span>
            <span>{showHistory ? '▲' : '▼'}</span>
          </button>
          {showHistory && (
            <div className="max-h-40 space-y-1.5 overflow-y-auto bg-black/10 p-2">
              {recentHistory.map((msg, i) => (
                <div
                  key={`hist-${i}`}
                  className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[92%] rounded-xl px-2.5 py-1.5 text-[10px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/15 text-[var(--color-text)]'
                        : 'border border-sky-500/35 bg-sky-500/10 text-[var(--color-text)]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {deliverableMarkdown ? (
        <div className="border-b border-[var(--color-border)] px-3 py-2">
          <div className="text-[10px] font-semibold text-[var(--color-text)]">成片说明</div>
          <p className="mt-0.5 text-[9px] text-[var(--color-text-muted)]">
            与成片时间线同步，可复制到文档（对标专业工作流的交付表）。
          </p>
          <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-2 font-mono text-[10px] leading-snug text-[var(--color-text)]">
            {deliverableMarkdown}
          </pre>
        </div>
      ) : null}
      {busy && jobProgress ? (
        <div className="border-b border-[var(--color-border)] px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium text-amber-400/95">生成中</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tabular-nums text-[var(--color-text-muted)]">
                {Math.round(jobProgress.percent)}%
              </span>
              {onAbort ? (
                <button
                  type="button"
                  onClick={onAbort}
                  className="rounded border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-500/25"
                  title="停止当前 Agent 任务"
                >
                  停止
                </button>
              ) : null}
            </div>
          </div>
          <div
            className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]/60"
            role="progressbar"
            aria-valuenow={Math.round(jobProgress.percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="剪辑任务进度"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-[width] duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, jobProgress.percent))}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] leading-snug text-[var(--color-text)]">{jobProgress.message}</p>
          <p className="mt-0.5 text-[9px] text-[var(--color-text-muted)]">
            {jobProgress.etaSec != null && jobProgress.etaSec > 0
              ? `预计剩余约 ${jobProgress.etaSec} 秒（受素材数量与服务器负载影响，仅供参考）`
              : '即将完成…'}
          </p>
        </div>
      ) : busy && !jobProgress ? (
        <div className="border-b border-[var(--color-border)] px-3 py-2 text-[10px] text-[var(--color-text-muted)]">
          {selectedCount > 0 || timelineAssetCount > 0
            ? '正在识别意图或准备对话…'
            : '处理中…'}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-black/15 p-2">
        {logs.length === 0 && (
          <p className="px-1 text-center text-[11px] text-[var(--color-text-muted)]">对话与结果将显示在这里。</p>
        )}
        {logs.map((line, i) => {
          const variant = classifyLogLine(line);
          const isUser = variant === 'user';
          return (
            <div key={`log-${i}`} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-2.5 py-2 text-[11px] leading-relaxed ${bubbleClass[variant]}`}>
                <p className="whitespace-pre-wrap break-words">{line}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-[var(--color-border)] p-2">
        {!busy && logs.length === 0 && (
          <div className="mb-2">
            <p className="mb-1.5 text-[10px] text-[var(--color-text-muted)]">快捷指令</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '战斗混剪 30s', text: '用已选素材做一个30秒的战斗混剪，节奏紧凑' },
                { label: '角色展示', text: '用已选素材做一个角色技能展示视频，突出角色特色' },
                { label: 'TikTok 预告', text: '做一个符合TikTok风格的15秒短预告，开头要抓眼球' },
                { label: '高燃混剪+配乐', text: '做一个30秒高燃战斗混剪，配上史诗感的配乐' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => void send(preset.text)}
                  disabled={busy || (selectedCount === 0 && timelineAssetCount === 0)}
                  className="rounded-md border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/8 px-2 py-1 text-[10px] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/18 disabled:opacity-40"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="描述你想怎么剪…（Shift+Enter 换行）"
          rows={3}
          disabled={busy}
          className="w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void send()}
          className="mt-2 w-full rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? (jobProgress ? '生成中…' : '处理中…') : '发送'}
        </button>
      </div>
    </div>
  );
}
