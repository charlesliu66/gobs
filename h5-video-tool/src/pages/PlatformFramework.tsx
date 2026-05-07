import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlatformMemory, type PlatformGame } from '../context/PlatformMemoryContext';
import { CampaignKnowledgePackCard } from '../components/campaign/CampaignKnowledgePackCard';

const channelMetrics = [
  { channel: 'TikTok 官号', views: '128.4万', completion: '23.8%', cpm: 'US$3.7', status: '正常偏优' },
  { channel: 'YouTube Shorts', views: '46.2万', completion: '18.1%', cpm: 'US$4.9', status: '可优化' },
  { channel: 'Meta Ads', views: '89.7万', completion: '31.2%', cpm: 'US$5.3', status: '素材疲劳' },
  { channel: 'KOL 联投', views: '52.8万', completion: '27.4%', cpm: 'US$6.1', status: '投放稳定' },
];

const creativeMetrics = [
  { name: '版本卖点混剪', format: '15s 视频', views: '42.8万', ctr: '2.9%', cvr: '4.2%', trend: '+18%' },
  { name: '角色剧情向', format: '30s 视频', views: '31.5万', ctr: '2.1%', cvr: '3.6%', trend: '+7%' },
  { name: 'KOL 试玩切片', format: 'UGC', views: '19.2万', ctr: '1.4%', cvr: '2.5%', trend: '-9%' },
  { name: '礼包强转化素材', format: 'Static/Video', views: '27.9万', ctr: '3.4%', cvr: '5.1%', trend: '+23%' },
];

const brainBlocks = [
  { title: '游戏基础知识库', desc: '版本、世界观、角色、卖点、活动节奏、区域发行信息。', status: '已自动生成 78%' },
  { title: '内容与素材知识库', desc: '历史爆款、模板、镜头语言、账号画像、渠道偏好。', status: '等待用户补充素材文件' },
  { title: '外部环境知识库', desc: '竞品、KOL、平台 benchmark、评论舆情、热点事件。', status: '先接假数据，后续可接 API' },
];

const futurePipeline = [
  {
    title: '先绑定游戏',
    now: '已支持游戏绑定/切换，后续数据与策略都挂在当前游戏上下文。',
    next: '接入项目主数据与权限体系，自动继承地区、阶段、预算口径。',
  },
  {
    title: '数据洞察（双引擎）',
    now: '已展示 Ingame + Out-of-game 的骨架看板与素材表现。',
    next: '接入真实数据源与 crawl，支持按 channel / asset / tag 切片。',
  },
  {
    title: 'Campaign Proactive',
    now: '已产出 Action 建议与风险分级，支持策略权重联动。',
    next: '自动生成主方案 + Sub 方案，并给出置信度与预算影响。',
  },
  {
    title: '传到 Action',
    now: '已建立建议到执行的桥梁，可进入学习实验台模拟。',
    next: '按 Live Ops / MKT 双通道自动分发，支持审批门与SLA。',
  },
  {
    title: '学习飞轮',
    now: '已形成反馈回写与策略调权闭环。',
    next: '24h 心跳自治运行，跨渠道自优化并输出下一轮计划。',
  },
];

const outOfGameSlices = [
  { group: '官方/非官方', items: ['官方账号表现', '民间传播热度', '竞品关联内容'] },
  { group: '按渠道', items: ['TikTok', 'YouTube Shorts', 'Meta', 'KOL 社区'] },
  { group: '按素材', items: ['角色向', '卖点向', '剧情向', '活动向'] },
  { group: '按标签', items: ['题材标签', '情绪标签', '受众标签', '风险标签'] },
];

function SectionTitle({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-[var(--color-text)] tracking-tight">{title}</h2>
        {desc && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function PlatformFramework() {
  const {
    games,
    selectedGameId,
    setSelectedGameId,
    addGame,
    uploadedFiles,
    strategies,
    feedbackLogs,
    knowledgePacks,
    knowledgeLoading,
    knowledgeError,
    knowledgeGameSupported,
    importFastpublishKnowledge,
  } = usePlatformMemory();

  const [newGameName, setNewGameName] = useState('');
  const [newGameGenre, setNewGameGenre] = useState('SLG');
  const [newGameStage, setNewGameStage] = useState<PlatformGame['stage']>('首发期');

  const selectedGame = useMemo(
    () => games.find((game) => game.id === selectedGameId) ?? games[0],
    [games, selectedGameId],
  );

  const handleCreateGame = () => {
    addGame({ name: newGameName, genre: newGameGenre, stage: newGameStage });
    setNewGameName('');
  };

  const positiveCount = feedbackLogs.filter((item) => item.impact === '正向').length;
  const riskCount = feedbackLogs.filter((item) => item.impact === '风险控制').length;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 pb-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.35),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(34,197,94,0.16),transparent_24%),linear-gradient(135deg,#11111a_0%,#0b0b12_55%,#12121b_100%)] p-6 sm:p-8">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_0.9fr] lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-[var(--color-primary)] uppercase">
              GOBS Platform Framework
            </div>
            <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-white sm:text-5xl">
              从“工具集合”升级为“自治发行系统”
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/72 sm:text-base">
              主讲路径：先绑游戏 → 数据洞察（Ingame + Out-of-game）→ Campaign proactive → 传到 Action → 学习飞轮。现在先证明“已能跑”，再展示“24h 自成长”。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => document.getElementById('bind-game')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--color-primary)]/25 transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)]">
                从游戏绑定开始
              </button>
              <Link to="/platform/memory" className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/8 hover:text-white">
                记忆系统（备份页）
              </Link>
              <Link to="/platform/learning-lab" className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/8 hover:text-white">
                学习试验台（备份页）
              </Link>
              <Link to="/platform/ops" className="rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-400/14 hover:text-emerald-200">
                运营中心（主讲第2页）
              </Link>
              <Link to="/studio" className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/8 hover:text-white">
                去旧工作台
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ['Now（可运行）', '游戏绑定、数据看板、洞察建议、学习调权、运营治理'],
              ['Next（可扩展）', 'Ingame/Outgame真实数据、自动方案编排、Action自动分发'],
              ['North Star', '24小时心跳运行 + 可解释决策 + 自我成长飞轮'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">{title}</div>
                <div className="mt-2 text-sm leading-6 text-white/82">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: '游戏数', value: `${games.length}`, sub: '支持多游戏切换' },
          { title: '学习事件', value: `${feedbackLogs.length}`, sub: `正向 ${positiveCount} · 风控 ${riskCount}` },
          { title: '策略数', value: `${strategies.length}`, sub: '权重随反馈变化' },
          { title: '知识包', value: `${knowledgePacks.length}`, sub: knowledgeGameSupported ? '当前游戏已持久化的 Knowledge Packs' : '当前游戏暂不支持持久化大脑' },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
            <div className="text-sm text-[var(--color-text-muted)]">{item.title}</div>
            <div className="mt-3 text-3xl font-semibold text-[var(--color-text)]">{item.value}</div>
            <div className="mt-2 text-xs text-[var(--color-text-subtle)]">{item.sub}</div>
          </div>
        ))}
      </section>

      {/* Main storyline */}
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <SectionTitle
          title="老板主讲链路（Now + Next）"
          desc="用一张链路图讲清楚“今天能跑什么、明天会进化什么”。"
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-5">
          {futurePipeline.map((node, idx) => (
            <div key={node.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold text-[var(--color-text)]">{node.title}</div>
                <span className="text-xs text-[var(--color-text-subtle)]">#{idx + 1}</span>
              </div>
              <div className="mt-3 rounded-xl bg-[var(--color-primary)]/8 px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-primary)]">Now</div>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text)]">{node.now}</p>
              </div>
              <div className="mt-2 rounded-xl bg-emerald-500/8 px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-400">Next</div>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text)]">{node.next}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bind game */}
      <section id="bind-game" className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <SectionTitle title="游戏绑定 / 切换" desc="登录后第一件事先明确当前服务哪一个游戏。" action={<span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">Step 1</span>} />
          <div className="mt-6 space-y-3">
            {games.map((game) => {
              const active = game.id === selectedGameId;
              return (
                <button key={game.id} type="button" onClick={() => setSelectedGameId(game.id)} className={`w-full rounded-2xl border p-4 text-left transition ${active ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold text-[var(--color-text)]">{game.name}</div>
                      <div className="mt-1 text-sm text-[var(--color-text-muted)]">{game.genre} · {game.stage} · {game.region}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${game.status === '已就绪' ? 'bg-emerald-500/12 text-emerald-400' : game.status === '分析中' ? 'bg-amber-500/12 text-amber-400' : 'bg-white/6 text-[var(--color-text-muted)]'}`}>
                      {game.status}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--color-text-subtle)]">
                    <span className="rounded-full border border-[var(--color-border)] px-2 py-1">素材 {game.assets}</span>
                    <span className="rounded-full border border-[var(--color-border)] px-2 py-1">资料 {game.docs}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <SectionTitle title="新增一个游戏" desc="先做轻量绑定表单，后面再接真实项目库。" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-[var(--color-text-muted)]">
              游戏名
              <input value={newGameName} onChange={(e) => setNewGameName(e.target.value)} placeholder="例如：Legend of Dawn" className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)]" />
            </label>
            <label className="text-sm text-[var(--color-text-muted)]">
              品类
              <select value={newGameGenre} onChange={(e) => setNewGameGenre(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)]">
                <option>SLG</option><option>Idle RPG</option><option>MMO</option><option>塔防</option><option>卡牌</option>
              </select>
            </label>
            <label className="text-sm text-[var(--color-text-muted)] sm:col-span-2">
              发行阶段
              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                {(['预约期', '首发期', '爬坡期', '稳定运营'] as const).map((stage) => (
                  <button key={stage} type="button" onClick={() => setNewGameStage(stage)} className={`rounded-xl border px-3 py-3 text-sm transition ${newGameStage === stage ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40'}`}>
                    {stage}
                  </button>
                ))}
              </div>
            </label>
          </div>
          <button type="button" onClick={handleCreateGame} className="mt-6 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)]">
            绑定并进入该游戏
          </button>
          {selectedGame && (
            <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">当前上下文</div>
              <div className="mt-2 text-lg font-semibold text-[var(--color-text)]">{selectedGame.name}</div>
              <div className="mt-1 text-sm text-[var(--color-text-muted)]">后面上传资料、看数据、接 Action 都会默认挂在这个游戏下。</div>
            </div>
          )}
        </div>
      </section>

      {/* Upload + Brain */}
      <section id="knowledge-brain" className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <SectionTitle title="Gold and Glory Brain（真实 fastpublish 接入）" desc="把 fastpublishing 中已整理的品牌、市场、人群、活动和卖点知识灌进持久化脑子。" action={<span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">Step 2</span>} />
          <div className="mt-6 rounded-3xl border border-dashed border-[var(--color-primary)]/40 bg-[var(--color-primary)]/6 p-6 text-center">
            <div className="text-base font-semibold text-[var(--color-text)]">
              {knowledgeGameSupported ? '导入 Gold and Glory canonical fastpublish brain' : '当前选中的新建游戏暂不支持持久化 Knowledge Brain'}
            </div>
            <div className="mt-2 text-sm text-[var(--color-text-muted)]">
              {knowledgeGameSupported
                ? '会生成 8 类可选择 knowledge packs：品牌语气、合规、视觉、马来西亚市场、人群、活动日历、活动复盘、卖点 playbook。'
                : '本轮只支持内置稳定游戏 ID 的知识包持久化。新增游戏入口先继续作为 demo 流程展示，避免刷新后丢失知识上下文。'}
            </div>
            <button type="button" disabled={!knowledgeGameSupported || knowledgeLoading} onClick={() => void importFastpublishKnowledge()} className="mt-5 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/12 px-4 py-3 text-sm font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/18 disabled:cursor-not-allowed disabled:opacity-50">
              {knowledgeLoading ? '导入中...' : '导入 GNG Brain'}
            </button>
          </div>
          {knowledgeError ? (
            <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {knowledgeError}
            </div>
          ) : null}
          {!knowledgeGameSupported ? (
            <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
              当前仍可查看这页其它框架内容，但 Knowledge Brain 的真实持久化只对默认内置游戏开放。
            </div>
          ) : uploadedFiles.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <div className="text-sm font-medium text-[var(--color-text)]">现阶段说明</div>
              <div className="mt-1 text-xs leading-6 text-[var(--color-text-subtle)]">
                页面其它区块仍保留历史 mock 资料提示；Knowledge Brain 区块本身已经改为 API 持久化数据源。
              </div>
            </div>
          ) : null}
        </div>
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <SectionTitle title="当前游戏的知识包" desc="这里不再展示假结构，而是直接展示当前游戏已落库的 packs。" />
          <div className="mt-6 space-y-4">
            {knowledgeLoading ? (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-text-muted)]">
                正在加载当前游戏的 Knowledge Brain...
              </div>
            ) : knowledgePacks.length > 0 ? (
              knowledgePacks.map((pack) => (
                <CampaignKnowledgePackCard key={pack.packId} pack={pack} />
              ))
            ) : (
              brainBlocks.map((block, index) => (
                <div key={block.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)]/12 text-sm font-semibold text-[var(--color-primary)]">{index + 1}</div>
                      <div className="text-base font-semibold text-[var(--color-text)]">{block.title}</div>
                    </div>
                    <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]">等待导入</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{block.desc}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Data Dashboard */}
      <section id="data-dashboard" className="space-y-6">
        <SectionTitle title="数据看板骨架" desc="一部分看游戏内/官号/投放数据，一部分看外部渠道和素材表现。" />
        <div className="grid gap-4 xl:grid-cols-4">
          {outOfGameSlices.map((slice) => (
            <div key={slice.group} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
              <div className="text-sm font-semibold text-[var(--color-text)]">{slice.group}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {slice.items.map((it) => (
                  <span key={it} className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]">
                    {it}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">渠道数据</h3>
              <span className="text-xs text-[var(--color-text-subtle)]">Step 3</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-subtle)]">
                    <th className="px-3 py-3 font-medium">渠道</th>
                    <th className="px-3 py-3 font-medium">播放量</th>
                    <th className="px-3 py-3 font-medium">完播率</th>
                    <th className="px-3 py-3 font-medium">CPM</th>
                    <th className="px-3 py-3 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {channelMetrics.map((item) => (
                    <tr key={item.channel} className="border-b border-[var(--color-border)]/50 last:border-b-0">
                      <td className="px-3 py-4 text-[var(--color-text)]">{item.channel}</td>
                      <td className="px-3 py-4 text-[var(--color-text-muted)]">{item.views}</td>
                      <td className="px-3 py-4 text-[var(--color-text-muted)]">{item.completion}</td>
                      <td className="px-3 py-4 text-[var(--color-text-muted)]">{item.cpm}</td>
                      <td className="px-3 py-4"><span className="rounded-full bg-white/6 px-2.5 py-1 text-xs text-[var(--color-text-muted)]">{item.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">素材表现</h3>
              <span className="text-xs text-[var(--color-text-subtle)]">内外部合并视角</span>
            </div>
            <div className="space-y-3">
              {creativeMetrics.map((item) => (
                <div key={item.name} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-text)]">{item.name}</div>
                      <div className="mt-1 text-xs text-[var(--color-text-subtle)]">{item.format}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.trend.startsWith('+') ? 'bg-emerald-500/12 text-emerald-400' : 'bg-rose-500/12 text-rose-400'}`}>{item.trend}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl bg-white/4 px-3 py-2">
                      <div className="text-[var(--color-text-subtle)]">播放</div>
                      <div className="mt-1 text-sm font-semibold text-[var(--color-text)]">{item.views}</div>
                    </div>
                    <div className="rounded-xl bg-white/4 px-3 py-2">
                      <div className="text-[var(--color-text-subtle)]">CTR</div>
                      <div className="mt-1 text-sm font-semibold text-[var(--color-text)]">{item.ctr}</div>
                    </div>
                    <div className="rounded-xl bg-white/4 px-3 py-2">
                      <div className="text-[var(--color-text-subtle)]">CVR</div>
                      <div className="mt-1 text-sm font-semibold text-[var(--color-text)]">{item.cvr}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Insights + Actions */}
      <section id="insights-actions" className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <SectionTitle title="洞察引擎输出" desc="这里承接数据与大脑，生成阶段感知 + ROI 感知的建议。" action={<span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">Step 4</span>} />
          <div className="mt-6 space-y-4">
            {[
              { title: '阶段判断：当前属于首发期扩量窗口', desc: '基于近 7 天新素材爆量速度、评论情绪和付费转化，建议偏向放大可复制爆点，而不是追求复杂品牌叙事。' },
              { title: 'ROI 观察：Meta 素材疲劳先于流量衰减出现', desc: '播放量没明显掉，但 CPM 已上升，说明问题更可能出在素材前链路吸引力下降。' },
              { title: '外部机会：竞品角色剧情向内容热度走高', desc: '可以让内容生产 Agent 快速复用「角色冲突 + 反转」模板，做本地化变体。' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="text-sm font-semibold text-[var(--color-text)]">{item.title}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <SectionTitle title="Action 建议清单" desc="低风险先自动，越高风险越要人工审核。" action={<span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">Step 5</span>} />
          <div className="mt-6 space-y-4">
            {strategies.map((strategy) => (
              <div key={strategy.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-base font-semibold text-[var(--color-text)]">{strategy.name}</div>
                    <div className="mt-2 text-sm text-[var(--color-text-muted)]">{strategy.scope}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${strategy.risk === '低风险' ? 'bg-emerald-500/12 text-emerald-400' : strategy.risk === '中风险' ? 'bg-amber-500/12 text-amber-400' : 'bg-rose-500/12 text-rose-400'}`}>
                    {strategy.risk}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">{strategy.reason}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--color-text-subtle)]">
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">权重：{strategy.weight}</span>
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">优先级：{strategy.priority}</span>
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">{strategy.mode}</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to="/platform/learning-lab" className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]">去学习实验台模拟</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent feedback logs */}
      {feedbackLogs.length > 0 && (
        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <SectionTitle title="最近学习事件" desc="在学习实验台里产生的反馈会直接反映在这里。" />
          <div className="mt-6 space-y-3">
            {feedbackLogs.slice(0, 5).map((log) => (
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
