import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type Decision = '接受' | '拒绝' | '人工修改';
type Outcome = '强正反馈' | '轻正反馈' | '负反馈' | '风险规避';

type ActionSuggestion = {
  id: string;
  game: string;
  title: string;
  type: string;
  risk: '低风险' | '中风险' | '高风险';
  baselineWeight: number;
  baselinePriority: number;
  note: string;
};

type SimulationLog = {
  id: string;
  time: string;
  suggestion: string;
  decision: Decision;
  outcome: Outcome;
  weightDelta: number;
  priorityDelta: number;
  learning: string;
};

const suggestionsSeed: ActionSuggestion[] = [
  {
    id: 'a1',
    game: 'Project Nova Arena',
    title: '复用“版本卖点混剪”模板扩展到泰语市场',
    type: '内容生产 / 分发',
    risk: '低风险',
    baselineWeight: 78,
    baselinePriority: 84,
    note: '适合演示正向学习',
  },
  {
    id: 'a2',
    game: 'Project Nova Arena',
    title: '针对评论争议自动生成统一回复并发布',
    type: '舆情动作',
    risk: '高风险',
    baselineWeight: 34,
    baselinePriority: 28,
    note: '适合演示风险拦截',
  },
  {
    id: 'a3',
    game: 'Idle Kingdom Go',
    title: '继续加大旧素材在 Meta Ads 的预算',
    type: '买量放量',
    risk: '中风险',
    baselineWeight: 49,
    baselinePriority: 52,
    note: '适合演示负反馈后降权',
  },
];

function nowLabel() {
  return new Date().toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function outcomeStyle(outcome: Outcome) {
  if (outcome === '强正反馈' || outcome === '轻正反馈') return 'bg-emerald-500/12 text-emerald-400';
  if (outcome === '负反馈') return 'bg-amber-500/12 text-amber-400';
  return 'bg-rose-500/12 text-rose-400';
}

export function PlatformLearningLab() {
  const [selectedId, setSelectedId] = useState(suggestionsSeed[0].id);
  const [decision, setDecision] = useState<Decision>('接受');
  const [outcome, setOutcome] = useState<Outcome>('强正反馈');
  const [logs, setLogs] = useState<SimulationLog[]>([]);
  const [strategyWeight, setStrategyWeight] = useState<Record<string, number>>(
    Object.fromEntries(suggestionsSeed.map((item) => [item.id, item.baselineWeight])),
  );
  const [priorityMap, setPriorityMap] = useState<Record<string, number>>(
    Object.fromEntries(suggestionsSeed.map((item) => [item.id, item.baselinePriority])),
  );

  const selected = useMemo(
    () => suggestionsSeed.find((item) => item.id === selectedId) ?? suggestionsSeed[0],
    [selectedId],
  );

  const simulationSummary = useMemo(() => {
    const positive = logs.filter((item) => item.outcome === '强正反馈' || item.outcome === '轻正反馈').length;
    const negative = logs.filter((item) => item.outcome === '负反馈').length;
    const risk = logs.filter((item) => item.outcome === '风险规避').length;
    return { positive, negative, risk };
  }, [logs]);

  const runSimulation = () => {
    const currentWeight = strategyWeight[selected.id] ?? selected.baselineWeight;
    const currentPriority = priorityMap[selected.id] ?? selected.baselinePriority;

    let weightDelta = 0;
    let priorityDelta = 0;
    let learning = '';

    if (decision === '拒绝') {
      weightDelta = selected.risk === '高风险' ? -2 : -6;
      priorityDelta = -10;
      learning = '用户拒绝该类 Action，系统应降低推荐频次，并重新判断风险门槛。';
    } else if (decision === '人工修改') {
      weightDelta = outcome === '强正反馈' ? 6 : outcome === '轻正反馈' ? 3 : -5;
      priorityDelta = outcome === '风险规避' ? -4 : 2;
      learning = '人工修改说明原建议不够完善，系统要学习“建议方向对，但执行参数需要改”。';
    } else {
      if (outcome === '强正反馈') {
        weightDelta = 12;
        priorityDelta = 10;
        learning = '该策略被验证有效，应提升模板权重与相似建议优先级。';
      } else if (outcome === '轻正反馈') {
        weightDelta = 5;
        priorityDelta = 4;
        learning = '该策略有效但收益一般，继续保留，并观察在不同市场是否稳定复现。';
      } else if (outcome === '负反馈') {
        weightDelta = -14;
        priorityDelta = -11;
        learning = '执行后效果变差，应显著降权，并把“替代策略”提前推荐。';
      } else {
        weightDelta = selected.risk === '高风险' ? 4 : -3;
        priorityDelta = -6;
        learning = '虽然没有增长，但规避了高风险事件；这类场景应优先走人工审核门。';
      }
    }

    const nextWeight = Math.max(0, Math.min(100, currentWeight + weightDelta));
    const nextPriority = Math.max(0, Math.min(100, currentPriority + priorityDelta));

    setStrategyWeight((prev) => ({ ...prev, [selected.id]: nextWeight }));
    setPriorityMap((prev) => ({ ...prev, [selected.id]: nextPriority }));
    setLogs((prev) => [
      {
        id: `${selected.id}-${Date.now()}`,
        time: nowLabel(),
        suggestion: selected.title,
        decision,
        outcome,
        weightDelta,
        priorityDelta,
        learning,
      },
      ...prev,
    ]);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 pb-10">
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
              这页不是纯展示，而是能直接演示：系统给出 Action → 用户做决策 → 执行动作 → 结果回写 → 权重和优先级更新。
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              to="/platform"
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)]/35 hover:text-[var(--color-text)]"
            >
              返回平台框架
            </Link>
            <Link
              to="/platform/memory"
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)]/35 hover:text-[var(--color-text)]"
            >
              去看记忆系统
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <div className="text-xs text-[var(--color-text-subtle)]">累计学习事件</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{logs.length}</div>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <div className="text-xs text-[var(--color-text-subtle)]">正向事件</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{simulationSummary.positive}</div>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <div className="text-xs text-[var(--color-text-subtle)]">风险规避事件</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{simulationSummary.risk}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">1. 选择一个 Action</h2>
          <div className="mt-5 space-y-3">
            {suggestionsSeed.map((item) => {
              const active = item.id === selectedId;
              const weight = strategyWeight[item.id] ?? item.baselineWeight;
              const priority = priorityMap[item.id] ?? item.baselinePriority;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/35'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-text)]">{item.title}</div>
                      <div className="mt-1 text-xs text-[var(--color-text-subtle)]">{item.game} · {item.type}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.risk === '低风险' ? 'bg-emerald-500/12 text-emerald-400' : item.risk === '中风险' ? 'bg-amber-500/12 text-amber-400' : 'bg-rose-500/12 text-rose-400'}`}>
                      {item.risk}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white/4 px-3 py-3 text-sm text-[var(--color-text-muted)]">
                      <div className="text-xs text-[var(--color-text-subtle)]">当前权重</div>
                      <div className="mt-1 text-[var(--color-text)]">{weight}</div>
                    </div>
                    <div className="rounded-xl bg-white/4 px-3 py-3 text-sm text-[var(--color-text-muted)]">
                      <div className="text-xs text-[var(--color-text-subtle)]">当前优先级</div>
                      <div className="mt-1 text-[var(--color-text)]">{priority}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-[var(--color-text-subtle)]">{item.note}</div>
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
                  <button
                    key={item}
                    type="button"
                    onClick={() => setDecision(item)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${decision === item ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--color-text-muted)]">执行结果</div>
              <div className="mt-3 space-y-2">
                {(['强正反馈', '轻正反馈', '负反馈', '风险规避'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setOutcome(item)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${outcome === item ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="text-sm font-semibold text-[var(--color-text)]">当前模拟对象</div>
            <div className="mt-2 text-sm text-[var(--color-text-muted)]">{selected.title}</div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--color-text-subtle)]">
              <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">决策：{decision}</span>
              <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">结果：{outcome}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={runSimulation}
            className="mt-6 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            执行一次学习闭环
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">3. 学习日志</h2>
          <div className="mt-5 space-y-3">
            {logs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                还没有学习事件。先在上面点一次“执行一次学习闭环”。
              </div>
            )}
            {logs.map((log) => (
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
                  <div className="rounded-xl bg-white/4 px-3 py-3 text-sm text-[var(--color-text-muted)]">
                    <div className="text-xs text-[var(--color-text-subtle)]">用户决策</div>
                    <div className="mt-1 text-[var(--color-text)]">{log.decision}</div>
                  </div>
                  <div className="rounded-xl bg-white/4 px-3 py-3 text-sm text-[var(--color-text-muted)]">
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
            {suggestionsSeed.map((item) => {
              const weight = strategyWeight[item.id] ?? item.baselineWeight;
              const priority = priorityMap[item.id] ?? item.baselinePriority;
              return (
                <div key={item.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-text)]">{item.title}</div>
                      <div className="mt-1 text-xs text-[var(--color-text-subtle)]">{item.game}</div>
                    </div>
                    <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]">{item.risk}</span>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-subtle)]">
                        <span>策略权重</span>
                        <span>{weight}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/6">
                        <div className="h-2 rounded-full bg-[var(--color-primary)]" style={{ width: `${weight}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-subtle)]">
                        <span>推荐优先级</span>
                        <span>{priority}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/6">
                        <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${priority}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
