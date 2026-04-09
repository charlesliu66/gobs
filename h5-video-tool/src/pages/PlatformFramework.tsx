import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type GameProfile = {
  id: string;
  name: string;
  genre: string;
  stage: '预约期' | '首发期' | '爬坡期' | '稳定运营';
  region: string;
  status: '待补资料' | '分析中' | '已就绪';
  assets: number;
  docs: number;
};

type ActionCard = {
  id: string;
  title: string;
  channel: string;
  level: '低风险' | '中风险' | '高风险';
  reason: string;
  owner: string;
  eta: string;
};

type MemoryLayer = {
  title: string;
  desc: string;
  stores: string[];
  output: string;
};

type FeedbackEvent = {
  id: string;
  trigger: string;
  action: string;
  result: string;
  learning: string;
  weight: '增强' | '降低' | '人工复核';
};

const gamesSeed: GameProfile[] = [
  {
    id: 'g1',
    name: 'Project Nova Arena',
    genre: 'SLG',
    stage: '首发期',
    region: 'SEA',
    status: '已就绪',
    assets: 34,
    docs: 12,
  },
  {
    id: 'g2',
    name: 'Idle Kingdom Go',
    genre: 'Idle RPG',
    stage: '爬坡期',
    region: 'TH / ID',
    status: '分析中',
    assets: 21,
    docs: 8,
  },
];

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

const actionsSeed: ActionCard[] = [
  {
    id: 'a1',
    title: '把「版本卖点混剪」扩成 3 个语言版本并复用爆点模板',
    channel: '内容生产 Agent',
    level: '低风险',
    reason: '该素材 CTR/CVR 同时高于近 7 天均值，适合快速扩量。',
    owner: '自动执行 / 人可改',
    eta: '今天内',
  },
  {
    id: 'a2',
    title: '针对 Meta Ads 出一组前 3 秒钩子 AB 素材',
    channel: '买量辅助 Agent',
    level: '中风险',
    reason: '当前 CPM 上升且素材疲劳明显，需要先做低成本测试。',
    owner: '运营确认后执行',
    eta: '24h',
  },
  {
    id: 'a3',
    title: '对负面评论集中的版本痛点生成 FAQ 与客服话术',
    channel: '舆情 / 社区 Agent',
    level: '高风险',
    reason: '涉及舆情与官方对外表达，必须先人工审核。',
    owner: '人工审核',
    eta: '随时触发',
  },
];

const brainBlocks = [
  {
    title: '游戏基础知识库',
    desc: '版本、世界观、角色、卖点、活动节奏、区域发行信息。',
    status: '已自动生成 78%',
  },
  {
    title: '内容与素材知识库',
    desc: '历史爆款、模板、镜头语言、账号画像、渠道偏好。',
    status: '等待用户补充素材文件',
  },
  {
    title: '外部环境知识库',
    desc: '竞品、KOL、平台 benchmark、评论舆情、热点事件。',
    status: '先接假数据，后续可接 API',
  },
];

const memoryLayers: MemoryLayer[] = [
  {
    title: 'L1 事实记忆（Fact Memory）',
    desc: '沉淀不会频繁变化的基础事实，作为所有 Agent 的底座。',
    stores: ['游戏设定 / 版本信息', '地区发行配置', '合规规则', '账号与渠道映射'],
    output: '稳定的游戏认知与上下文调用',
  },
  {
    title: 'L2 经验记忆（Pattern Memory）',
    desc: '记录什么内容、什么渠道、什么人群、什么时间组合更容易出效果。',
    stores: ['爆款模板', '高表现素材特征', '不同阶段推荐策略', '平台 benchmark'],
    output: '下次建议更像“有经验的人”',
  },
  {
    title: 'L3 行为记忆（Action Memory）',
    desc: '每一次建议、执行、拒绝、人工修改，都要留痕。',
    stores: ['Action 建议', '是否采纳', '执行参数', '人工改动原因'],
    output: '知道用户偏好、知道哪些建议不该再乱推',
  },
  {
    title: 'L4 反馈记忆（Feedback Memory）',
    desc: '把结果数据和之前的动作连起来，形成可学习闭环。',
    stores: ['播放 / CTR / CVR / CPM', '评论情绪', 'ROI 增量', '负反馈与失败案例'],
    output: '动态调权，越来越准',
  },
];

const feedbackEvents: FeedbackEvent[] = [
  {
    id: 'f1',
    trigger: '系统建议把爆款混剪扩成泰语 / 印尼语版本',
    action: '运营接受建议，自动生成 2 个本地化视频并分发',
    result: '泰语版本 24h CTR +21%，印尼语版本持平',
    learning: '首发期可优先复用强卖点模板，但语言本地化要按市场分别调权',
    weight: '增强',
  },
  {
    id: 'f2',
    trigger: '系统建议对争议评论做统一外部回复',
    action: '用户拒绝执行，改成人工审核回复',
    result: '避免潜在舆情升级',
    learning: '涉及官方对外话术的舆情动作默认风险应提升，进入人工审核门',
    weight: '人工复核',
  },
  {
    id: 'f3',
    trigger: '系统推荐继续加大某组疲劳素材投放',
    action: '投放后 CPM 上升，CVR 下滑',
    result: 'ROI 明显恶化',
    learning: '当素材疲劳信号出现时，扩量权重应该下降，优先触发新钩子 AB 测试',
    weight: '降低',
  },
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
  const navigate = useNavigate();
  const [games, setGames] = useState<GameProfile[]>(gamesSeed);
  const [selectedGameId, setSelectedGameId] = useState<string>(gamesSeed[0].id);
  const [newGameName, setNewGameName] = useState('');
  const [newGameGenre, setNewGameGenre] = useState('SLG');
  const [newGameStage, setNewGameStage] = useState<GameProfile['stage']>('首发期');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([
    '世界观设定.pdf',
    '版本卖点整理.docx',
    '近30天素材表现.xlsx',
  ]);

  const selectedGame = useMemo(
    () => games.find((game) => game.id === selectedGameId) ?? games[0],
    [games, selectedGameId],
  );

  const handleCreateGame = () => {
    const name = newGameName.trim();
    if (!name) return;
    const next: GameProfile = {
      id: `g${Date.now()}`,
      name,
      genre: newGameGenre,
      stage: newGameStage,
      region: '待设置',
      status: '待补资料',
      assets: 0,
      docs: 0,
    };
    setGames((prev) => [next, ...prev]);
    setSelectedGameId(next.id);
    setNewGameName('');
  };

  const handleFakeUpload = () => {
    const next = `资料_${uploadedFiles.length + 1}.pdf`;
    setUploadedFiles((prev) => [next, ...prev]);
    setGames((prev) =>
      prev.map((game) =>
        game.id === selectedGameId
          ? { ...game, docs: game.docs + 1, status: game.docs + 1 >= 6 ? '分析中' : '待补资料' }
          : game,
      ),
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 pb-10">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.35),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(34,197,94,0.16),transparent_24%),linear-gradient(135deg,#11111a_0%,#0b0b12_55%,#12121b_100%)] p-6 sm:p-8">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_0.9fr] lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-[var(--color-primary)] uppercase">
              GOBS Platform Framework
            </div>
            <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-white sm:text-5xl">
              先把平台主框架搭起来：<br className="hidden sm:block" />
              游戏绑定 → 资料沉淀 → 数据看板 → 洞察 → Action
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/72 sm:text-base">
              我这里先做的是一个可落地的前端骨架，不动你们已完成的功能。用户登录后，先进入平台总览，再去绑定/切换游戏、上传资料生成“大脑”、看内外部数据、接收洞察和 Action 建议。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/platform/bind')}
                className="rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--color-primary)]/25 transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)]"
              >
                从游戏绑定开始
              </button>
              <Link
                to="/platform/memory"
                className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/8 hover:text-white"
              >
                去看记忆系统
              </Link>
              <Link
                to="/platform/learning-lab"
                className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/8 hover:text-white"
              >
                去跑学习闭环 Demo
              </Link>
              <Link
                to="/studio"
                className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/8 hover:text-white"
              >
                已有功能继续保持原样 → 去旧工作台
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ['已保留现有模块', 'QuickFilm / Studio / 素材库 / 分发 / TikTok Matrix'],
              ['本次先补的模块', '平台首页、游戏绑定、知识库生成、数据看板、洞察Action'],
              ['下一步可接后端', '真实登录态、文件上传、项目/游戏API、外部数据源'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">{title}</div>
                <div className="mt-2 text-sm leading-6 text-white/82">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: '游戏数', value: `${games.length}`, sub: '支持多游戏切换' },
          { title: '知识库状态', value: '3 / 4', sub: '已能展示自动生成进度' },
          { title: '数据来源', value: '内外双路', sub: '先接静态示意，后换真实 API' },
          { title: 'Action 流', value: '建议→审核→执行', sub: '把成熟度分级预留出来' },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
            <div className="text-sm text-[var(--color-text-muted)]">{item.title}</div>
            <div className="mt-3 text-3xl font-semibold text-[var(--color-text)]">{item.value}</div>
            <div className="mt-2 text-xs text-[var(--color-text-subtle)]">{item.sub}</div>
          </div>
        ))}
      </section>

      <section id="platform-overview" className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <SectionTitle
            title="平台主路径"
            desc="把你昨天那套方案先翻成清晰的用户操作流。"
          />
          <div className="mt-6 grid gap-4 md:grid-cols-5">
            {[
              '1. 登录进入平台首页',
              '2. 绑定/切换游戏',
              '3. 上传游戏资料，生成大脑',
              '4. 看数据与外部情报',
              '5. 收洞察与 Action 建议',
            ].map((step, index) => (
              <div key={step} className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)]/14 text-sm font-semibold text-[var(--color-primary)]">
                  0{index + 1}
                </div>
                <p className="text-sm leading-6 text-[var(--color-text)]">{step}</p>
                {index < 4 && <div className="mt-4 hidden h-px bg-[var(--color-border)] md:block" />}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <SectionTitle
            title="建设策略"
            desc="先把简单的、能跑通业务叙事的前端模块放进去。"
          />
          <div className="mt-6 space-y-3">
            {[
              '保留现有成熟模块的入口，不拆、不重构核心业务。',
              '新增平台框架层，统一用户进入后的主视角。',
              '先用 mock 数据和本地状态把流程跑通，便于内部演示。',
              '后续每块都可以替换成真实 API，不需要推翻重做前端结构。',
            ].map((line) => (
              <div key={line} className="flex gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
                <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-[var(--color-primary)]" />
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="bind-game" className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <SectionTitle
            title="游戏绑定 / 切换"
            desc="登录后第一件事先明确当前服务哪一个游戏。"
            action={<span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">Step 1</span>}
          />
          <div className="mt-6 space-y-3">
            {games.map((game) => {
              const active = game.id === selectedGameId;
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setSelectedGameId(game.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold text-[var(--color-text)]">{game.name}</div>
                      <div className="mt-1 text-sm text-[var(--color-text-muted)]">{game.genre} · {game.stage} · {game.region}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      game.status === '已就绪'
                        ? 'bg-emerald-500/12 text-emerald-400'
                        : game.status === '分析中'
                          ? 'bg-amber-500/12 text-amber-400'
                          : 'bg-white/6 text-[var(--color-text-muted)]'
                    }`}>
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
              <input
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                placeholder="例如：Legend of Dawn"
                className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)]"
              />
            </label>
            <label className="text-sm text-[var(--color-text-muted)]">
              品类
              <select
                value={newGameGenre}
                onChange={(e) => setNewGameGenre(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)]"
              >
                <option>SLG</option>
                <option>Idle RPG</option>
                <option>MMO</option>
                <option>塔防</option>
                <option>卡牌</option>
              </select>
            </label>
            <label className="text-sm text-[var(--color-text-muted)] sm:col-span-2">
              发行阶段
              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                {(['预约期', '首发期', '爬坡期', '稳定运营'] as const).map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setNewGameStage(stage)}
                    className={`rounded-xl border px-3 py-3 text-sm transition ${
                      newGameStage === stage
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40'
                    }`}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </label>
          </div>
          <button
            type="button"
            onClick={handleCreateGame}
            className="mt-6 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
          >
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

      <section id="knowledge-brain" className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <SectionTitle
            title="上传资料 → 自动生成游戏大脑"
            desc="先做一个资料沉淀入口，让用户把能给的文件一次丢进来。"
            action={<span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">Step 2</span>}
          />
          <div className="mt-6 rounded-3xl border border-dashed border-[var(--color-primary)]/40 bg-[var(--color-primary)]/6 p-6 text-center">
            <div className="text-base font-semibold text-[var(--color-text)]">拖拽资料到这里，或者点击上传</div>
            <div className="mt-2 text-sm text-[var(--color-text-muted)]">支持 PRD、世界观、角色设定、投放复盘、历史素材、竞品观察、活动方案等。</div>
            <button
              type="button"
              onClick={handleFakeUpload}
              className="mt-5 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/12 px-4 py-3 text-sm font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/18"
            >
              模拟上传一份资料
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {uploadedFiles.map((file, index) => (
              <div key={`${file}-${index}`} className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-[var(--color-text)]">{file}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-subtle)]">已入库，可用于摘要 / 标签 / 知识提取</div>
                </div>
                <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs text-emerald-400">已接收</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <SectionTitle title="自动生成的大脑结构" desc="这个区块是关键：先把知识库分层展示出来。" />
          <div className="mt-6 space-y-4">
            {brainBlocks.map((block, index) => (
              <div key={block.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)]/12 text-sm font-semibold text-[var(--color-primary)]">{index + 1}</div>
                    <div className="text-base font-semibold text-[var(--color-text)]">{block.title}</div>
                  </div>
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]">{block.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{block.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="data-dashboard" className="space-y-6">
        <SectionTitle
          title="数据看板骨架"
          desc="一部分看游戏内/官号/投放数据，一部分看外部渠道和素材表现。"
        />
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
                      <td className="px-3 py-4">
                        <span className="rounded-full bg-white/6 px-2.5 py-1 text-xs text-[var(--color-text-muted)]">{item.status}</span>
                      </td>
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
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.trend.startsWith('+') ? 'bg-emerald-500/12 text-emerald-400' : 'bg-rose-500/12 text-rose-400'}`}>
                      {item.trend}
                    </span>
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

      <section id="memory-system" className="space-y-6">
        <SectionTitle
          title="记忆与反馈系统架构"
          desc="这块就是平台真正变聪明的地方：不是做过一次 Action 就结束，而是把建议、执行、结果、人工反馈都沉淀下来。"
        />
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">平台记忆分层</h3>
              <span className="text-xs text-[var(--color-text-subtle)]">Memory System</span>
            </div>
            <div className="space-y-4">
              {memoryLayers.map((layer, index) => (
                <div key={layer.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-[var(--color-primary)]/12 text-sm font-semibold text-[var(--color-primary)]">
                      L{index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold text-[var(--color-text)]">{layer.title}</div>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{layer.desc}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {layer.stores.map((item) => (
                          <span key={item} className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]">
                            {item}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 rounded-2xl bg-[var(--color-primary)]/8 px-4 py-3 text-sm text-[var(--color-primary)]">
                        输出：{layer.output}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">闭环机制</h3>
              <span className="text-xs text-[var(--color-text-subtle)]">Action → Result → Learn</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                'AI 给出 Action 建议',
                '用户接受 / 修改 / 拒绝',
                '系统执行内容生产/分发/投放/社区动作',
                '回收曝光、点击、转化、评论情绪、成本',
                '归因分析动作和结果的关系',
                '更新策略权重 / 模板优先级 / 风险等级',
              ].map((step, index) => (
                <div key={step} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">环节 {index + 1}</div>
                  <div className="mt-2 text-sm leading-6 text-[var(--color-text)]">{step}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/8 p-5">
              <div className="text-sm font-semibold text-[var(--color-primary)]">核心原则</div>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                平台不是只记录“做了什么”，而是要记录“为什么做、谁改了、结果如何、以后要不要继续这么做”。
                这样它才不是知识库，而是真正的运营记忆系统。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="feedback-system" className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <SectionTitle
            title="Feedback System"
            desc="把每次动作后的效果回写进系统，做成学习事件。"
          />
          <div className="mt-6 space-y-4">
            {feedbackEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[var(--color-text)]">{event.trigger}</div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    event.weight === '增强'
                      ? 'bg-emerald-500/12 text-emerald-400'
                      : event.weight === '降低'
                        ? 'bg-amber-500/12 text-amber-400'
                        : 'bg-rose-500/12 text-rose-400'
                  }`}>
                    {event.weight}
                  </span>
                </div>
                <div className="mt-3 text-sm text-[var(--color-text-muted)]">执行：{event.action}</div>
                <div className="mt-2 text-sm text-[var(--color-text-muted)]">结果：{event.result}</div>
                <div className="mt-3 rounded-2xl bg-white/4 px-4 py-3 text-sm leading-6 text-[var(--color-text)]">
                  学习结果：{event.learning}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <SectionTitle
            title="建议的数据表设计"
            desc="这部分不是 UI 花活，是后面真要跑起来时最关键的数据结构。"
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              {
                title: 'memory_game_profile',
                desc: '每个游戏的基础事实、阶段、地区、规则、目标。',
              },
              {
                title: 'memory_content_pattern',
                desc: '爆款模板、素材标签、镜头结构、渠道偏好。',
              },
              {
                title: 'memory_action_log',
                desc: '每次 Action 的建议、执行人、参数、状态、风险级。',
              },
              {
                title: 'memory_performance_snapshot',
                desc: '动作前后对应的数据快照，方便归因。',
              },
              {
                title: 'memory_feedback_event',
                desc: '接受/拒绝/修改/失败/超预期等学习事件。',
              },
              {
                title: 'memory_strategy_weight',
                desc: '策略权重、模板权重、风险等级、推荐优先级。',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="text-sm font-semibold text-[var(--color-text)]">{item.title}</div>
                <div className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="insights-actions" className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <SectionTitle
            title="洞察引擎输出"
            desc="这里承接数据与大脑，生成阶段感知 + ROI 感知的建议。"
            action={<span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">Step 4</span>}
          />
          <div className="mt-6 space-y-4">
            {[
              {
                title: '阶段判断：当前属于首发期扩量窗口',
                desc: '基于近 7 天新素材爆量速度、评论情绪和付费转化，建议偏向放大可复制爆点，而不是追求复杂品牌叙事。',
              },
              {
                title: 'ROI 观察：Meta 素材疲劳先于流量衰减出现',
                desc: '播放量没明显掉，但 CPM 已上升，说明问题更可能出在素材前链路吸引力下降。',
              },
              {
                title: '外部机会：竞品角色剧情向内容热度走高',
                desc: '可以让内容生产 Agent 快速复用「角色冲突 + 反转」模板，做本地化变体。',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="text-sm font-semibold text-[var(--color-text)]">{item.title}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <SectionTitle
            title="Action 建议清单"
            desc="低风险先自动，越高风险越要人工审核。前端先把这个决策层表达清楚。"
            action={<span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">Step 5</span>}
          />
          <div className="mt-6 space-y-4">
            {actionsSeed.map((action) => (
              <div key={action.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-base font-semibold text-[var(--color-text)]">{action.title}</div>
                    <div className="mt-2 text-sm text-[var(--color-text-muted)]">{action.channel}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    action.level === '低风险'
                      ? 'bg-emerald-500/12 text-emerald-400'
                      : action.level === '中风险'
                        ? 'bg-amber-500/12 text-amber-400'
                        : 'bg-rose-500/12 text-rose-400'
                  }`}>
                    {action.level}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">{action.reason}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--color-text-subtle)]">
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">执行方式：{action.owner}</span>
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">预计：{action.eta}</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]">接受建议</button>
                  <button type="button" className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)]/40 hover:text-[var(--color-text)]">先不执行</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
