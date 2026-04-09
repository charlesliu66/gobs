import { Link } from 'react-router-dom';
import { usePlatformMemory } from '../context/PlatformMemoryContext';

const memoryLayersMeta = [
  {
    id: 'fact',
    title: '事实记忆 Fact Memory',
    desc: '稳定事实层，记录游戏本身不会频繁变化的设定、版本、阶段、合规边界。',
    stores: ['游戏基础画像', '发行阶段', '地区与语言', '合规规则', '账号/渠道映射'],
    output: '让所有 Agent 有统一上下文',
    health: '稳定' as const,
  },
  {
    id: 'pattern',
    title: '经验记忆 Pattern Memory',
    desc: '把历史成功和失败模式抽出来，不让系统每次都从零判断。',
    stores: ['爆款模板', '高表现钩子', '平台 benchmark', '阶段打法', '渠道偏好'],
    output: '让推荐越来越像有经验的运营负责人',
    health: '建设中' as const,
  },
  {
    id: 'action',
    title: '行为记忆 Action Memory',
    desc: '记录系统建议、人工调整、最终执行动作及其参数。',
    stores: ['Action 建议', '审批记录', '执行日志', '人工修改原因', '风险级别'],
    output: '知道做过什么、被拒绝过什么',
    health: '建设中' as const,
  },
  {
    id: 'feedback',
    title: '反馈记忆 Feedback Memory',
    desc: '把结果数据与动作回绑，形成系统学习所需的监督信号。',
    stores: ['播放/CTR/CVR/CPM', 'ROI 变化', '舆情情绪', '正负反馈', '案例归因'],
    output: '动态调权，持续优化 Action 推荐',
    health: '待接入' as const,
  },
];

function healthStyle(health: string) {
  if (health === '稳定') return 'bg-emerald-500/12 text-emerald-400';
  if (health === '建设中') return 'bg-amber-500/12 text-amber-400';
  return 'bg-white/6 text-[var(--color-text-muted)]';
}

export function PlatformMemory() {
  const { strategies, feedbackLogs, games } = usePlatformMemory();

  const positiveCount = feedbackLogs.filter((item) => item.impact === '正向').length;
  const riskCount = feedbackLogs.filter((item) => item.impact === '风险控制').length;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 pb-10">
      {/* Header */}
      <section className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Memory System
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--color-text)] sm:text-4xl">
              平台记忆系统
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-text-muted)]">
              平台如何记住事实、沉淀经验、记录动作、吸收反馈，再把学习结果回到下一轮建议里。数据与学习实验台共享同一份状态。
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link to="/platform" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)]/35 hover:text-[var(--color-text)]">
              返回平台框架
            </Link>
            <Link to="/platform/learning-lab" className="rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)]">
              去跑学习闭环
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <div className="text-xs text-[var(--color-text-subtle)]">游戏数</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{games.length}</div>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <div className="text-xs text-[var(--color-text-subtle)]">策略数</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{strategies.length}</div>
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

      {/* Memory Layers */}
      <section className="grid gap-6 xl:grid-cols-2">
        {memoryLayersMeta.map((layer, index) => (
          <div key={layer.id} className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-[var(--color-primary)]/12 text-sm font-semibold text-[var(--color-primary)]">L{index + 1}</div>
                <div className="text-base font-semibold text-[var(--color-text)]">{layer.title}</div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${healthStyle(layer.health)}`}>{layer.health}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">{layer.desc}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {layer.stores.map((item) => (
                <span key={item} className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]">{item}</span>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-[var(--color-primary)]/8 px-4 py-3 text-sm text-[var(--color-primary)]">
              输出：{layer.output}
            </div>
          </div>
        ))}
      </section>

      {/* Strategy Weights (live from store) */}
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">策略权重面板（实时）</h2>
          <span className="text-xs text-[var(--color-text-subtle)]">与学习实验台联动</span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {strategies.map((strategy) => (
            <div key={strategy.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--color-text)]">{strategy.name}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-subtle)]">{strategy.scope}</div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${strategy.trend >= 0 ? 'bg-emerald-500/12 text-emerald-400' : 'bg-amber-500/12 text-amber-400'}`}>
                  {strategy.trend >= 0 ? `+${strategy.trend}` : strategy.trend}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-subtle)]">
                    <span>权重</span><span>{strategy.weight}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/6">
                    <div className="h-2 rounded-full bg-[var(--color-primary)]" style={{ width: `${strategy.weight}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-subtle)]">
                    <span>优先级</span><span>{strategy.priority}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/6">
                    <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${strategy.priority}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[var(--color-text-muted)]">{strategy.mode}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feedback Timeline (live from store) */}
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">Feedback Timeline（实时）</h2>
          <span className="text-xs text-[var(--color-text-subtle)]">学习实验台产生的事件会实时出现在这里</span>
        </div>
        {feedbackLogs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
            还没有学习事件。去<Link to="/platform/learning-lab" className="ml-1 text-[var(--color-primary)] underline">学习实验台</Link>跑一次闭环。
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {feedbackLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-text)]">{log.suggestion}</div>
                    <div className="mt-1 text-xs text-[var(--color-text-subtle)]">{log.time} · {log.decision} · {log.outcome}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${log.impact === '正向' ? 'bg-emerald-500/12 text-emerald-400' : log.impact === '负向' ? 'bg-amber-500/12 text-amber-400' : 'bg-rose-500/12 text-rose-400'}`}>
                    {log.impact}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-white/4 px-3 py-3 text-sm">
                    <div className="text-xs text-[var(--color-text-subtle)]">决策</div>
                    <div className="mt-1 text-[var(--color-text)]">{log.decision}</div>
                  </div>
                  <div className="rounded-xl bg-white/4 px-3 py-3 text-sm sm:col-span-2">
                    <div className="text-xs text-[var(--color-text-subtle)]">结果</div>
                    <div className="mt-1 text-[var(--color-text)]">{log.result}</div>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-[var(--color-primary)]/8 px-4 py-3 text-sm text-[var(--color-text)]">
                  学习结果：{log.learning}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
