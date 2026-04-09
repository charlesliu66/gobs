import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type MemoryLayer = {
  id: string;
  title: string;
  desc: string;
  stores: string[];
  output: string;
  health: '稳定' | '建设中' | '待接入';
};

type StrategyWeight = {
  id: string;
  name: string;
  scope: string;
  weight: number;
  trend: number;
  reason: string;
  mode: '自动提升' | '自动降低' | '人工锁定';
};

type FeedbackEvent = {
  id: string;
  time: string;
  game: string;
  trigger: string;
  decision: '接受' | '拒绝' | '人工修改';
  result: string;
  learning: string;
  impact: '正向' | '负向' | '风险控制';
};

const memoryLayers: MemoryLayer[] = [
  {
    id: 'fact',
    title: '事实记忆 Fact Memory',
    desc: '稳定事实层，记录游戏本身不会频繁变化的设定、版本、阶段、合规边界。',
    stores: ['游戏基础画像', '发行阶段', '地区与语言', '合规规则', '账号/渠道映射'],
    output: '让所有 Agent 有统一上下文',
    health: '稳定',
  },
  {
    id: 'pattern',
    title: '经验记忆 Pattern Memory',
    desc: '把历史成功和失败模式抽出来，不让系统每次都从零判断。',
    stores: ['爆款模板', '高表现钩子', '平台 benchmark', '阶段打法', '渠道偏好'],
    output: '让推荐越来越像有经验的运营负责人',
    health: '建设中',
  },
  {
    id: 'action',
    title: '行为记忆 Action Memory',
    desc: '记录系统建议、人工调整、最终执行动作及其参数。',
    stores: ['Action 建议', '审批记录', '执行日志', '人工修改原因', '风险级别'],
    output: '知道做过什么、被拒绝过什么',
    health: '建设中',
  },
  {
    id: 'feedback',
    title: '反馈记忆 Feedback Memory',
    desc: '把结果数据与动作回绑，形成系统学习所需的监督信号。',
    stores: ['播放/CTR/CVR/CPM', 'ROI 变化', '舆情情绪', '正负反馈', '案例归因'],
    output: '动态调权，持续优化 Action 推荐',
    health: '待接入',
  },
];

const strategySeed: StrategyWeight[] = [
  {
    id: 's1',
    name: '首发期卖点混剪模板',
    scope: 'SLG / 首发期 / TikTok',
    weight: 82,
    trend: 12,
    reason: '近 7 天 CTR 与 CVR 连续优于均值',
    mode: '自动提升',
  },
  {
    id: 's2',
    name: '旧素材继续扩量',
    scope: 'Meta Ads / 全阶段',
    weight: 41,
    trend: -18,
    reason: '素材疲劳导致 CPM 上升、ROI 下滑',
    mode: '自动降低',
  },
  {
    id: 's3',
    name: '舆情统一自动回复',
    scope: '社区管理 / 对外表达',
    weight: 25,
    trend: -8,
    reason: '高风险对外动作需人工介入',
    mode: '人工锁定',
  },
];

const feedbackSeed: FeedbackEvent[] = [
  {
    id: 'f1',
    time: '今天 09:15',
    game: 'Project Nova Arena',
    trigger: '系统建议扩展爆款混剪到泰语版本',
    decision: '接受',
    result: '24h CTR +21%，完播率 +8%',
    learning: '首发期卖点混剪对 TH 市场可继续加权',
    impact: '正向',
  },
  {
    id: 'f2',
    time: '今天 08:20',
    game: 'Project Nova Arena',
    trigger: '系统建议自动回复争议评论',
    decision: '拒绝',
    result: '避免潜在舆情升级',
    learning: '公开舆情类动作默认提升至人工审核',
    impact: '风险控制',
  },
  {
    id: 'f3',
    time: '昨天 19:40',
    game: 'Idle Kingdom Go',
    trigger: '系统建议继续放大一组旧素材投放',
    decision: '人工修改',
    result: '改成 AB 测试后，CPM 下降 6%',
    learning: '检测到疲劳信号时，应优先触发新钩子测试而非继续硬扩',
    impact: '负向',
  },
];

function impactStyle(impact: FeedbackEvent['impact']) {
  if (impact === '正向') return 'bg-emerald-500/12 text-emerald-400';
  if (impact === '负向') return 'bg-amber-500/12 text-amber-400';
  return 'bg-rose-500/12 text-rose-400';
}

function healthStyle(health: MemoryLayer['health']) {
  if (health === '稳定') return 'bg-emerald-500/12 text-emerald-400';
  if (health === '建设中') return 'bg-amber-500/12 text-amber-400';
  return 'bg-white/6 text-[var(--color-text-muted)]';
}

export function PlatformMemory() {
  const [selectedLayerId, setSelectedLayerId] = useState(memoryLayers[0].id);
  const [events] = useState<FeedbackEvent[]>(feedbackSeed);
  const [strategies] = useState<StrategyWeight[]>(strategySeed);

  const selectedLayer = useMemo(
    () => memoryLayers.find((layer) => layer.id === selectedLayerId) ?? memoryLayers[0],
    [selectedLayerId],
  );

  const positiveCount = events.filter((item) => item.impact === '正向').length;
  const riskCount = events.filter((item) => item.impact === '风险控制').length;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 pb-10">
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
              这页不是资料库展示，而是平台如何记住事实、沉淀经验、记录动作、吸收反馈，再把这些学习结果回到下一轮建议里的控制中心。
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
              to="/platform/learning-lab"
              className="rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
            >
              去跑学习闭环
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <div className="text-xs text-[var(--color-text-subtle)]">记忆层数</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--color-text)]">4</div>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <div className="text-xs text-[var(--color-text-subtle)]">正向学习事件</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{positiveCount}</div>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <div className="text-xs text-[var(--color-text-subtle)]">风险控制事件</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{riskCount}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">记忆分层</h2>
          <div className="mt-5 space-y-3">
            {memoryLayers.map((layer, index) => {
              const active = layer.id === selectedLayerId;
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/35'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">Layer {index + 1}</div>
                      <div className="mt-1 text-base font-semibold text-[var(--color-text)]">{layer.title}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${healthStyle(layer.health)}`}>
                      {layer.health}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{layer.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">当前层详情</h2>
          <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-[var(--color-text)]">{selectedLayer.title}</div>
                <div className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{selectedLayer.desc}</div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${healthStyle(selectedLayer.health)}`}>
                {selectedLayer.health}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {selectedLayer.stores.map((item) => (
                <span key={item} className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]">
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-5 rounded-2xl bg-[var(--color-primary)]/8 px-4 py-3 text-sm text-[var(--color-primary)]">
              输出：{selectedLayer.output}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              '每个游戏一份事实记忆基线',
              '不同阶段共享经验，但要允许区域差异',
              '所有 Action 都要有执行前后快照',
              '拒绝与人工修改是高价值监督信号',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-[var(--color-text)]">策略权重面板</h2>
            <span className="text-xs text-[var(--color-text-subtle)]">Strategy Weight</span>
          </div>
          <div className="mt-5 space-y-3">
            {strategies.map((strategy) => (
              <div key={strategy.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-text)]">{strategy.name}</div>
                    <div className="mt-1 text-xs text-[var(--color-text-subtle)]">{strategy.scope}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${strategy.trend >= 0 ? 'bg-emerald-500/12 text-emerald-400' : 'bg-amber-500/12 text-amber-400'}`}>
                    {strategy.trend >= 0 ? `+${strategy.trend}` : strategy.trend}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-subtle)]">
                    <span>当前权重</span>
                    <span>{strategy.weight}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/6">
                    <div className="h-2 rounded-full bg-[var(--color-primary)]" style={{ width: `${strategy.weight}%` }} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[var(--color-text-muted)]">{strategy.mode}</span>
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[var(--color-text-muted)]">{strategy.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-[var(--color-text)]">Feedback Timeline</h2>
            <span className="text-xs text-[var(--color-text-subtle)]">Recent Learning Events</span>
          </div>
          <div className="mt-5 space-y-4">
            {events.map((event) => (
              <div key={event.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-text)]">{event.trigger}</div>
                    <div className="mt-1 text-xs text-[var(--color-text-subtle)]">{event.time} · {event.game}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${impactStyle(event.impact)}`}>
                    {event.impact}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-white/4 px-3 py-3 text-sm text-[var(--color-text-muted)]">
                    <div className="text-xs text-[var(--color-text-subtle)]">决策</div>
                    <div className="mt-1 text-[var(--color-text)]">{event.decision}</div>
                  </div>
                  <div className="rounded-xl bg-white/4 px-3 py-3 text-sm text-[var(--color-text-muted)] sm:col-span-2">
                    <div className="text-xs text-[var(--color-text-subtle)]">结果</div>
                    <div className="mt-1 text-[var(--color-text)]">{event.result}</div>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-[var(--color-primary)]/8 px-4 py-3 text-sm text-[var(--color-text)]">
                  学习结果：{event.learning}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
