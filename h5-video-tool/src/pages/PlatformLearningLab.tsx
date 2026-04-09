import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlatformMemory, type PlatformDecision, type PlatformOutcome } from '../context/PlatformMemoryContext';

function outcomeStyle(outcome: string) {
  if (outcome === '强正反馈' || outcome === '轻正反馈' || outcome === '正向') return 'bg-emerald-500/12 text-emerald-400';
  if (outcome === '负反馈' || outcome === '负向') return 'bg-amber-500/12 text-amber-400';
  return 'bg-rose-500/12 text-rose-400';
}

export function PlatformLearningLab() {
  const { strategies, feedbackLogs, runLearningCycle } = usePlatformMemory();

  const [selectedId, setSelectedId] = useState(strategies[0]?.id ?? '');
  const [decision, setDecision] = useState<PlatformDecision>('接受');
  const [outcome, setOutcome] = useState<PlatformOutcome>('强正反馈');

  const selected = strategies.find((item) => item.id === selectedId) ?? strategies[0];

  const positiveCount = feedbackLogs.filter((item) => item.impact === '正向').length;
  const riskCount = feedbackLogs.filter((item) => item.impact === '风险控制').length;

  const handleRun = () => {
    if (!selected) return;
    runLearningCycle({ suggestionId: selected.id, decision, outcome });
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 pb-10">
      {/* Header */}
      <section className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Learning Lab
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--color-text)] sm:text-4xl">
              Mock 学习闭环实验台
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-text-muted)]">
              选一个 Action → 做决策 → 模拟结果 → 观察权重和优先级变化。状态与平台框架、记忆系统页共享。
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link to="/platform" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)]/35 hover:text-[var(--color-text)]">
              返回平台框架
            </Link>
            <Link to="/platform/memory" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)]/35 hover:text-[var(--color-text)]">
              去看记忆系统
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <div className="text-xs text-[var(--color-text-subtle)]">累计学习事件</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{feedbackLogs.length}</div>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <div className="text-xs text-[var(--color-text-subtle)]">正向事件</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{positiveCount}</div>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <div className="text-xs text-[var(--color-text-subtle)]">风控事件</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{riskCount}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Selection + Decision */}
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">1. 选择一个 Action</h2>
          <div className="mt-5 space-y-3">
            {strategies.map((item) => {
              const active = item.id === selectedId;
              return (
                <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full rounded-2xl border p-4 text-left transition ${active ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/35'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-text)]">{item.name}</div>
                      <div className="mt-1 text-xs text-[var(--color-text-subtle)]">{item.scope}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.risk === '低风险' ? 'bg-emerald-500/12 text-emerald-400' : item.risk === '中风险' ? 'bg-amber-500/12 text-amber-400' : 'bg-rose-500/12 text-rose-400'}`}>
                      {item.risk}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white/4 px-3 py-3 text-sm">
                      <div className="text-xs text-[var(--color-text-subtle)]">当前权重</div>
                      <div className="mt-1 text-[var(--color-text)]">{item.weight}</div>
                    </div>
                    <div className="rounded-xl bg-white/4 px-3 py-3 text-sm">
                      <div className="text-xs text-[var(--color-text-subtle)]">当前优先级</div>
                      <div className="mt-1 text-[var(--color-text)]">{item.priority}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">2. 模拟决策与结果</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <div className="text-sm font-medium text-[var(--color-text-muted)]">用户决策</div>
              <div className="mt-3 space-y-2">
                {(['接受', '拒绝', '人工修改'] as const).map((item) => (
                  <button key={item} type="button" onClick={() => setDecision(item)} className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${decision === item ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30'}`}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--color-text-muted)]">执行结果</div>
              <div className="mt-3 space-y-2">
                {(['强正反馈', '轻正反馈', '负反馈', '风险规避'] as const).map((item) => (
                  <button key={item} type="button" onClick={() => setOutcome(item)} className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${outcome === item ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30'}`}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {selected && (
            <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="text-sm font-semibold text-[var(--color-text)]">当前模拟对象</div>
              <div className="mt-2 text-sm text-[var(--color-text-muted)]">{selected.name}</div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--color-text-subtle)]">
                <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">决策：{decision}</span>
                <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">结果：{outcome}</span>
              </div>
            </div>
          )}
          <button type="button" onClick={handleRun} className="mt-6 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)]">
            执行一次学习闭环
          </button>
        </div>
      </section>

      {/* Results */}
      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">3. 学习日志</h2>
          <div className="mt-5 space-y-3">
            {feedbackLogs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                还没有学习事件。先在上面点一次"执行一次学习闭环"。
              </div>
            )}
            {feedbackLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-text)]">{log.suggestion}</div>
                    <div className="mt-1 text-xs text-[var(--color-text-subtle)]">{log.time}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${outcomeStyle(log.outcome)}`}>
                    {log.outcome}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/4 px-3 py-3 text-sm">
                    <div className="text-xs text-[var(--color-text-subtle)]">决策</div>
                    <div className="mt-1 text-[var(--color-text)]">{log.decision}</div>
                  </div>
                  <div className="rounded-xl bg-white/4 px-3 py-3 text-sm">
                    <div className="text-xs text-[var(--color-text-subtle)]">权重 / 优先级变化</div>
                    <div className="mt-1 text-[var(--color-text)]">{log.weightDelta >= 0 ? `+${log.weightDelta}` : log.weightDelta} / {log.priorityDelta >= 0 ? `+${log.priorityDelta}` : log.priorityDelta}</div>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-[var(--color-primary)]/8 px-4 py-3 text-sm text-[var(--color-text)]">
                  学习结果：{log.learning}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">4. 学习后的状态变化</h2>
          <div className="mt-5 space-y-3">
            {strategies.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-text)]">{item.name}</div>
                    <div className="mt-1 text-xs text-[var(--color-text-subtle)]">{item.scope}</div>
                  </div>
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]">{item.risk}</span>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-subtle)]">
                      <span>策略权重</span><span>{item.weight}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/6">
                      <div className="h-2 rounded-full bg-[var(--color-primary)]" style={{ width: `${item.weight}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-subtle)]">
                      <span>推荐优先级</span><span>{item.priority}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/6">
                      <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${item.priority}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
