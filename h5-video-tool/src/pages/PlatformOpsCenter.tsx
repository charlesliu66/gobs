import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePlatformMemory, type PlatformGoal } from '../context/PlatformMemoryContext';

function GoalTree({ goals, depth = 0 }: { goals: PlatformGoal[]; depth?: number }) {
  return (
    <div className={depth > 0 ? 'ml-6 mt-2 border-l-2 border-[var(--color-primary)]/20 pl-4' : ''}>
      {goals.map((goal) => (
        <div key={goal.id} className="mb-3">
          <div className="flex items-start gap-3">
            <div className={`mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-semibold ${depth === 0 ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]' : depth === 1 ? 'bg-amber-500/12 text-amber-400' : 'bg-emerald-500/12 text-emerald-400'}`}>
              {depth === 0 ? '🎯' : depth === 1 ? '📌' : '→'}
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--color-text)]">{goal.title}</div>
              {goal.metric && <div className="mt-1 text-xs text-[var(--color-text-subtle)]">{goal.metric}</div>}
            </div>
          </div>
          {goal.children && <GoalTree goals={goal.children} depth={depth + 1} />}
        </div>
      ))}
    </div>
  );
}

function budgetColor(pct: number) {
  if (pct > 0.9) return 'bg-rose-500';
  if (pct > 0.7) return 'bg-amber-400';
  return 'bg-[var(--color-primary)]';
}

function statusBadge(status: string) {
  if (status === '已超限') return 'bg-rose-500/12 text-rose-400';
  if (status === '预警') return 'bg-amber-500/12 text-amber-400';
  return 'bg-emerald-500/12 text-emerald-400';
}

const actionDispatchCards = [
  {
    lane: 'Live Ops',
    items: ['Bug 反馈接 Jira', '产品建议需求池', '常规活动落地'],
    now: '人工确认后派单',
    next: '按影响面与SLA自动分发',
  },
  {
    lane: 'MKT',
    items: ['素材生成与分发', '社媒运营增强', '客服与本地化'],
    now: '按模板/规则执行',
    next: '按渠道ROI动态调度',
  },
];

export function PlatformOpsCenter() {
  const { games, selectedGameId, strategies, agentBudgets, heartbeatLogs, triggerHeartbeat, feedbackLogs } = usePlatformMemory();

  const selectedGame = useMemo(
    () => games.find((g) => g.id === selectedGameId) ?? games[0],
    [games, selectedGameId],
  );

  const gameStrategies = strategies.filter((s) => s.gameId === selectedGameId);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 pb-10">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.3),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.15),transparent_25%),linear-gradient(135deg,#11111a_0%,#0b0b12_55%,#12121b_100%)] p-6 sm:p-8">
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-emerald-400 uppercase">
                Ops Center · Paperclip-Inspired
              </div>
              <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
                运营中心
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
                主讲第2页：把“目标对齐、预算治理、心跳调度、审批分级、Action分发、学习闭环”放在同一操作台，展示系统如何 24h 持续运行并自我成长。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/platform" className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/8 hover:text-white">平台框架</Link>
              <Link to="/platform/memory" className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/8 hover:text-white">记忆系统</Link>
              <Link to="/platform/learning-lab" className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/8 hover:text-white">学习实验台</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Boss demo cockpit */}
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">运营中枢总览（老板主讲）</h2>
          <span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
            Now + Next
          </span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['数据洞察', 'Ingame + Out-of-game 双引擎，支持 channel/asset/tag 切片。'],
            ['发行方案', 'Campaign proactive：主方案 + Sub方案，并给出风险与预算影响。'],
            ['Action分发', 'Live Ops 与 MKT 双通道分发，执行后自动回传状态。'],
            ['学习闭环', '结果回写记忆系统，策略调权并影响下一轮建议。'],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="text-sm font-semibold text-[var(--color-text)]">{title}</div>
              <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Goal Ancestry */}
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-text)]">目标对齐链</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">每个 Action 都能追溯到游戏级目标。来自 Paperclip 的 Goal Ancestry 思路。</p>
            </div>
            <span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">{selectedGame.name}</span>
          </div>
          <div className="mt-6">
            <GoalTree goals={selectedGame.goals} />
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">Action → 目标追溯</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">不只看"建议做什么"，还看"为什么建议这个"。</p>
          <div className="mt-6 space-y-4">
            {gameStrategies.map((strategy) => (
              <div key={strategy.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-[var(--color-text)]">{strategy.name}</div>
                  <div className="flex gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${strategy.approvalLevel === '自动执行' ? 'bg-emerald-500/12 text-emerald-400' : strategy.approvalLevel === '通知可否决' ? 'bg-amber-500/12 text-amber-400' : 'bg-rose-500/12 text-rose-400'}`}>
                      {strategy.approvalLevel}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 overflow-x-auto text-xs">
                  {strategy.goalChain.map((goal, index) => (
                    <div key={goal} className="flex items-center gap-2 flex-shrink-0">
                      <span className={`rounded-full px-2.5 py-1 border border-[var(--color-border)] ${index === 0 ? 'bg-[var(--color-primary)]/8 text-[var(--color-primary)]' : index === strategy.goalChain.length - 1 ? 'bg-emerald-500/8 text-emerald-400' : 'text-[var(--color-text-muted)]'}`}>
                        {goal}
                      </span>
                      {index < strategy.goalChain.length - 1 && <span className="text-[var(--color-text-subtle)]">→</span>}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-text-subtle)]">
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">{strategy.agentType}</span>
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">{strategy.risk}</span>
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">权重 {strategy.weight}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent Budgets */}
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-text)]">Agent 预算面板</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">每个 Agent 类型有月度配额，花完就停。来自 Paperclip 的 Budget Enforcement。</p>
          </div>
          <span className="text-xs text-[var(--color-text-subtle)]">本月</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {agentBudgets.map((budget) => {
            const pct = budget.spent / budget.monthlyBudget;
            return (
              <div key={budget.agentType} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[var(--color-text)]">{budget.agentType}</div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(budget.status)}`}>{budget.status}</span>
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-subtle)]">
                    <span>{budget.spent.toLocaleString()} / {budget.monthlyBudget.toLocaleString()}</span>
                    <span>{Math.round(pct * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/6">
                    <div className={`h-2 rounded-full transition-all ${budgetColor(pct)}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-white/4 px-3 py-2">
                    <div className="text-[var(--color-text-subtle)]">执行次数</div>
                    <div className="mt-1 text-sm font-semibold text-[var(--color-text)]">{budget.actionCount}</div>
                  </div>
                  <div className="rounded-xl bg-white/4 px-3 py-2">
                    <div className="text-[var(--color-text-subtle)]">均次成本</div>
                    <div className="mt-1 text-sm font-semibold text-[var(--color-text)]">{budget.avgCost} {budget.unit}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Heartbeat */}
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-text)]">心跳调度</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">按计划拉数据、跑分析、推建议。来自 Paperclip 的 Heartbeat 模式。</p>
            </div>
            <button type="button" onClick={triggerHeartbeat} className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]">
              手动触发一次心跳
            </button>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: '心跳调度频率', value: '每日 08:00 + 20:00', note: '+ 事件触发' },
              { label: '本日心跳次数', value: `${heartbeatLogs.filter((l) => l.time.includes('今天')).length}`, note: '定时 + 手动' },
              { label: '累计生成洞察', value: `${heartbeatLogs.reduce((s, l) => s + l.insightsGenerated, 0)}`, note: '含 Action' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
                <div className="text-xs text-[var(--color-text-subtle)]">{item.label}</div>
                <div className="mt-2 text-xl font-semibold text-[var(--color-text)]">{item.value}</div>
                <div className="mt-1 text-xs text-[var(--color-text-subtle)]">{item.note}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">心跳日志</h2>
          <div className="mt-5 space-y-3">
            {heartbeatLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-[var(--color-text)]">{log.summary}</div>
                    <div className="mt-1 text-xs text-[var(--color-text-subtle)]">{log.time} · {log.source} · {games.find((g) => g.id === log.gameId)?.name}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${log.status === '完成' ? 'bg-emerald-500/12 text-emerald-400' : log.status === '运行中' ? 'bg-amber-500/12 text-amber-400' : 'bg-rose-500/12 text-rose-400'}`}>
                    {log.status}
                  </span>
                </div>
                <div className="mt-3 flex gap-2 text-xs text-[var(--color-text-subtle)]">
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">洞察 {log.insightsGenerated}</span>
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">Action {log.actionsGenerated}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Action dispatch */}
      <section className="grid gap-6 xl:grid-cols-2">
        {actionDispatchCards.map((card) => (
          <div key={card.lane} className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
            <h2 className="text-xl font-semibold text-[var(--color-text)]">{card.lane} Action 通道</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {card.items.map((it) => (
                <span key={it} className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]">
                  {it}
                </span>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-[var(--color-primary)]/8 px-4 py-3 text-sm text-[var(--color-text)]">
              <span className="font-medium text-[var(--color-primary)]">Now：</span>
              {card.now}
            </div>
            <div className="mt-2 rounded-xl bg-emerald-500/8 px-4 py-3 text-sm text-[var(--color-text)]">
              <span className="font-medium text-emerald-400">Next：</span>
              {card.next}
            </div>
          </div>
        ))}
      </section>

      {/* Approval Gates */}
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-text)]">审批分级</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">按风险级别决定执行方式。来自 Paperclip 的 Approval Gates + GOBS 自动化分级模型。</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { level: '自动执行', desc: '低风险 Action，系统自动执行，事后审计。', color: 'emerald', examples: ['内容本地化扩量', '模板复用', '标签更新'], icon: '⚡' },
            { level: '通知可否决', desc: '中风险 Action，执行前通知运营，N 分钟内可否决。', color: 'amber', examples: ['投放预算调整', '新渠道测试', 'KOL 联系'], icon: '🔔' },
            { level: '人工批准', desc: '高风险 Action，必须人工批准才能执行。', color: 'rose', examples: ['舆情回复', '官方对外声明', '危机处理'], icon: '🛡️' },
          ].map((item) => (
            <div key={item.level} className={`rounded-2xl border border-${item.color}-500/20 bg-${item.color}-500/5 p-5`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div className={`text-base font-semibold text-${item.color}-400`}>{item.level}</div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{item.desc}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.examples.map((ex) => (
                  <span key={ex} className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]">{ex}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent feedback (cross-page) */}
      {feedbackLogs.length > 0 && (
        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">最近学习事件</h2>
          <div className="mt-5 space-y-3">
            {feedbackLogs.slice(0, 3).map((log) => (
              <div key={log.id} className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div>
                  <div className="text-sm font-semibold text-[var(--color-text)]">{log.suggestion}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-subtle)]">{log.time} · {log.decision} · {log.outcome}</div>
                  <div className="mt-2 text-sm text-[var(--color-text-muted)]">{log.learning}</div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${log.impact === '正向' ? 'bg-emerald-500/12 text-emerald-400' : log.impact === '负向' ? 'bg-amber-500/12 text-amber-400' : 'bg-rose-500/12 text-rose-400'}`}>
                  {log.impact}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
