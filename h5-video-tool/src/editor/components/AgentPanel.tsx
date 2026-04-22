import { useMemo, useState } from 'react';
import type { EditorAgentJobProgress } from '../../api/editor';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
import type {
  EditorProjectMemoryBucket,
  EditorUserProfileDimensionKey,
} from '../../api/editorMemory';
import {
  normalizeEditorCreativeBriefForRequest,
  type EditorCreativeBrief,
  type EditorCreativeMode,
  type EditorCreativeStrategy,
} from '../../api/editorCreative';
import type { EditorProjectMemory, EditorUserCommunicationProfile } from '../types/agentMemory';
import { AgentMemoryPanel } from './AgentMemoryPanel';

type LogVariant = 'user' | 'agent' | 'progress' | 'token' | 'error' | 'system';

function classifyLogLine(line: string): LogVariant {
  if (line.startsWith('你：') || line.startsWith('You: ') || line.startsWith('Brief：') || line.startsWith('Brief: ')) return 'user';
  if (line.startsWith('Agent：') || line.startsWith('Agent: ') || line.startsWith('助手：') || line.startsWith('Assistant: ')) return 'agent';
  if (line.startsWith('进度：') || line.startsWith('Progress: ')) return 'progress';
  if (line.startsWith('Token')) return 'token';
  if (line.startsWith('错误：') || line.startsWith('Error: ')) return 'error';
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

export interface AgentPanelApplyRequest {
  userMessage?: string;
  creativeBrief?: EditorCreativeBrief;
}

interface AgentPanelProps {
  logs: string[];
  onPushLog: (line: string) => void;
  onApply: (input: AgentPanelApplyRequest) => Promise<void>;
  projectMemory?: EditorProjectMemory | null;
  userCommunicationProfile?: EditorUserCommunicationProfile | null;
  onRememberDraftMemory: (text: string) => Promise<void>;
  onAvoidDraftMemory: (text: string) => Promise<void>;
  onDeleteProjectMemoryItem: (
    bucket: EditorProjectMemoryBucket,
    target: { id?: string; value?: string },
  ) => Promise<void>;
  onWeakenUserProfileDimension: (dimension: EditorUserProfileDimensionKey) => Promise<void>;
  busy: boolean;
  jobProgress?: EditorAgentJobProgress | null;
  selectedCount: number;
  timelineAssetCount: number;
  deliverableMarkdown?: string | null;
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  onAbort?: () => void;
  creativeStrategy?: EditorCreativeStrategy | null;
}

function modeLabel(mode: EditorCreativeMode, uiLocale: 'zh-CN' | 'en'): string {
  return mode === 'tiktok_ua'
    ? (uiLocale === 'en' ? 'TikTok performance' : 'TikTok 买量')
    : (uiLocale === 'en' ? 'TikTok content' : 'TikTok 内容');
}

export function AgentPanel({
  logs,
  onPushLog,
  onApply,
  projectMemory,
  userCommunicationProfile,
  onRememberDraftMemory,
  onAvoidDraftMemory,
  onDeleteProjectMemoryItem,
  onWeakenUserProfileDimension,
  busy,
  jobProgress,
  selectedCount,
  timelineAssetCount,
  deliverableMarkdown,
  chatHistory,
  onAbort,
  creativeStrategy,
}: AgentPanelProps) {
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showBrief, setShowBrief] = useState(true);
  const [mode, setMode] = useState<EditorCreativeMode>('tiktok_content');
  const [objective, setObjective] = useState('');
  const [audience, setAudience] = useState('');
  const [sellingPoints, setSellingPoints] = useState('');
  const [cta, setCta] = useState('');
  const [referenceStyle, setReferenceStyle] = useState('');

  const briefPreview = useMemo(
    () =>
      normalizeEditorCreativeBriefForRequest({
        mode,
        objective,
        audience,
        sellingPoints,
        cta,
        referenceStyle,
      }),
    [mode, objective, audience, sellingPoints, cta, referenceStyle],
  );

  const send = async () => {
    if (busy) return;
    const userMessage = input.trim();
    const creativeBrief = briefPreview;
    if (!userMessage && !creativeBrief) return;

    if (creativeBrief) {
      const pointText =
        creativeBrief.sellingPoints.length > 0
          ? creativeBrief.sellingPoints.slice(0, 3).join(' / ')
          : uiText('未填写卖点', 'No selling points');
      onPushLog(uiText(
        `Brief：${modeLabel(creativeBrief.mode, uiLocale)} · 卖点 ${pointText}`,
        `Brief: ${modeLabel(creativeBrief.mode, uiLocale)} · Selling points ${pointText}`,
      ));
    }
    if (userMessage) {
      onPushLog(uiText(`你：${userMessage}`, `You: ${userMessage}`));
    }

    setInput('');

    try {
      await onApply({ userMessage, creativeBrief });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        onPushLog(uiText('进度：已取消当前 Agent 任务', 'Progress: cancelled the current agent task'));
        return;
      }
      onPushLog(uiText(
        `错误：${error instanceof Error ? error.message : String(error)}`,
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      ));
    }
  };

  const hint =
    selectedCount > 0
      ? uiText(`将针对已选 ${selectedCount} 条素材做创意剪辑`, `Creative editing will focus on the ${selectedCount} selected assets`)
      : timelineAssetCount > 0
        ? uiText(`未勾选时会基于时间轴上的 ${timelineAssetCount} 段素材继续优化`, `With nothing selected, the agent will optimize the ${timelineAssetCount} assets already on the timeline`)
        : uiText('请先勾选素材，或先往时间轴放入视频', 'Select source assets first, or add videos to the timeline');

  const recentHistory = chatHistory && chatHistory.length > 0 ? chatHistory.slice(-10) : [];

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <div className="border-b border-[var(--color-border)] px-3 py-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">{uiText('剪辑 Agent', 'Editing agent')}</h2>
        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">{hint}</p>
      </div>

      <div className="border-b border-[var(--color-border)] px-3 py-2">
        <button
          type="button"
          onClick={() => setShowBrief((value) => !value)}
          className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left"
        >
          <div>
            <div className="text-[11px] font-semibold text-[var(--color-text)]">{uiText('TikTok 创意 Brief', 'TikTok creative brief')}</div>
            <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
              {uiText('先填平台目标和卖点，再让 Agent 自动出剪辑方案', 'Set the goal and selling points first, then let the agent build the edit strategy')}
            </div>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">{showBrief ? uiText('收起', 'Collapse') : uiText('展开', 'Expand')}</span>
        </button>

        {showBrief ? (
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              {(['tiktok_content', 'tiktok_ua'] as EditorCreativeMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={`rounded-full border px-3 py-1 text-[10px] transition ${
                    mode === item
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {modeLabel(item, uiLocale)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <input
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                placeholder={mode === 'tiktok_ua'
                  ? uiText('目标，例如 拉新下载 / CTR', 'Goal, for example drive installs / CTR')
                  : uiText('目标，例如 内容运营 / 角色种草', 'Goal, for example content growth / character spotlight')}
                disabled={busy}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
              />
              <input
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                placeholder="目标受众，例如 anime RPG players / female fantasy fans"
                disabled={busy}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
              />
              <textarea
                value={sellingPoints}
                onChange={(event) => setSellingPoints(event.target.value)}
                rows={3}
                disabled={busy}
                placeholder={uiText(
                  '卖点，每行一个，例如：\nSSR 爆率开局\n冰雪女王角色颜值\nBoss 战爆发感',
                  'Selling points, one per line, for example:\nStrong SSR opening rate\nIce queen character appeal\nExplosive boss-fight payoff',
                )}
                className="w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={cta}
                  onChange={(event) => setCta(event.target.value)}
                  placeholder="CTA，例如 Download now"
                  disabled={busy}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                />
                <input
                  value={referenceStyle}
                  onChange={(event) => setReferenceStyle(event.target.value)}
                  placeholder="参考风格，例如 fast hook + character reveal"
                  disabled={busy}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {creativeStrategy ? (
        <div className="border-b border-[var(--color-border)] px-3 py-2">
          <div className="rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/8 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold text-[var(--color-text)]">{uiText('创意策略卡', 'Creative strategy card')}</div>
                <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                  {modeLabel(creativeStrategy.mode, uiLocale)} · {creativeStrategy.objective}
                </div>
              </div>
              <span className="rounded-full border border-[var(--color-primary)]/30 px-2 py-0.5 text-[10px] text-[var(--color-primary)]">
                {creativeStrategy.cta}
              </span>
            </div>
            <div className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
              <div className="text-[10px] text-[var(--color-text-muted)]">{uiText('推荐 Hook', 'Recommended hook')}</div>
              <div className="mt-1 text-[11px] font-medium text-[var(--color-text)]">
                {creativeStrategy.recommendedHook}
              </div>
            </div>
            {creativeStrategy.hookOptions.length > 1 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {creativeStrategy.hookOptions.map((hook) => (
                  <span
                    key={hook}
                    className="rounded-full border border-sky-500/25 bg-sky-500/8 px-2 py-1 text-[10px] text-sky-200"
                  >
                    {hook}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-text-muted)]">
              {creativeStrategy.rationale}
            </p>
          </div>
        </div>
      ) : null}

      <AgentMemoryPanel
        projectMemory={projectMemory}
        userCommunicationProfile={userCommunicationProfile}
        draftInput={input}
        busy={busy}
        onRememberDraft={onRememberDraftMemory}
        onAvoidDraft={onAvoidDraftMemory}
        onDeleteProjectItem={onDeleteProjectMemoryItem}
        onWeakenProfileDimension={onWeakenUserProfileDimension}
      />

      {recentHistory.length > 0 ? (
        <div className="border-b border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setShowHistory((value) => !value)}
            className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/20"
          >
            <span>{uiText(`最近对话（${Math.floor(recentHistory.length / 2)} 轮）`, `Recent chat (${Math.floor(recentHistory.length / 2)} rounds)`)}</span>
            <span>{showHistory ? uiText('收起', 'Collapse') : uiText('展开', 'Expand')}</span>
          </button>
          {showHistory ? (
            <div className="max-h-40 space-y-1.5 overflow-y-auto bg-black/10 p-2">
              {recentHistory.map((message, index) => (
                <div
                  key={`history-${index}`}
                  className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[92%] rounded-xl px-2.5 py-1.5 text-[10px] leading-relaxed ${
                      message.role === 'user'
                        ? 'border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/15 text-[var(--color-text)]'
                        : 'border border-sky-500/35 bg-sky-500/10 text-[var(--color-text)]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {deliverableMarkdown ? (
        <div className="border-b border-[var(--color-border)] px-3 py-2">
          <div className="text-[10px] font-semibold text-[var(--color-text)]">{uiText('成片说明', 'Deliverable notes')}</div>
          <p className="mt-0.5 text-[9px] text-[var(--color-text-muted)]">
            {uiText('这里会同步展示这次剪辑的结构说明，方便市场和剪辑师对齐。', 'This keeps the edit structure summary visible for both marketers and editors.')}
          </p>
          <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-2 font-mono text-[10px] leading-snug text-[var(--color-text)]">
            {deliverableMarkdown}
          </pre>
        </div>
      ) : null}

      {busy && jobProgress ? (
        <div className="border-b border-[var(--color-border)] px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium text-amber-400/95">{uiText('生成中', 'Working')}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tabular-nums text-[var(--color-text-muted)]">
                {Math.round(jobProgress.percent)}%
              </span>
              {onAbort ? (
                <button
                  type="button"
                  onClick={onAbort}
                  className="rounded border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-500/25"
                >
                  {uiText('停止', 'Stop')}
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
            aria-label={uiText('剪辑任务进度', 'Editing task progress')}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-[width] duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, jobProgress.percent))}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] leading-snug text-[var(--color-text)]">{jobProgress.message}</p>
          <p className="mt-0.5 text-[9px] text-[var(--color-text-muted)]">
            {jobProgress.etaSec != null && jobProgress.etaSec > 0
              ? uiText(`预计剩余约 ${jobProgress.etaSec} 秒`, `About ${jobProgress.etaSec} sec remaining`)
              : uiText('即将完成', 'Almost done')}
          </p>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-black/15 p-2">
        {logs.length === 0 ? (
          <p className="px-1 text-center text-[11px] text-[var(--color-text-muted)]">
            {uiText('对话、创意说明和剪辑结果会显示在这里。', 'Conversation, creative notes, and edit results will appear here.')}
          </p>
        ) : null}
        {logs.map((line, index) => {
          const variant = classifyLogLine(line);
          const isUser = variant === 'user';
          return (
            <div key={`log-${index}`} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-2.5 py-2 text-[11px] leading-relaxed ${bubbleClass[variant]}`}>
                <p className="whitespace-pre-wrap break-words">{line}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-[var(--color-border)] p-2">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder={uiText(
            '补充一句要求，例如：开头更像 TikTok 原生内容，结尾要更强 CTA',
            'Add one more instruction, for example: make the opening feel more native to TikTok and end with a stronger CTA',
          )}
          rows={3}
          disabled={busy}
          className="w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
        />
        <button
          type="button"
          disabled={busy || (!input.trim() && !briefPreview)}
          onClick={() => void send()}
          className="mt-2 w-full rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? uiText('处理中', 'Processing') : briefPreview ? uiText('生成创意剪辑', 'Generate creative edit') : uiText('发送', 'Send')}
        </button>
      </div>
    </div>
  );
}
