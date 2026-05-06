import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createKnowledgeSource,
  importKnowledgeTemplate,
  listCampaignKnowledgePacks,
  type CampaignKnowledgePack,
  type CampaignKnowledgePackType,
} from '../api/campaignKnowledge';

import {
  formatDateTime,
  getInitialUiLocale,
  readStoredUiLocale,
  type UiLocale,
} from '../i18n/locale.ts';

export type PlatformDecision = '接受' | '拒绝' | '人工修改';
export type PlatformOutcome = '强正反馈' | '轻正反馈' | '负反馈' | '风险规避';

export type PlatformGame = {
  id: string;
  name: string;
  genre: string;
  stage: '预约期' | '首发期' | '爬坡期' | '稳定运营';
  region: string;
  status: '待补资料' | '分析中' | '已就绪';
  assets: number;
  docs: number;
  goals: PlatformGoal[];
};

export type PlatformGoal = {
  id: string;
  title: string;
  metric?: string;
  children?: PlatformGoal[];
};

export type PlatformStrategy = {
  id: string;
  gameId: string;
  name: string;
  scope: string;
  risk: '低风险' | '中风险' | '高风险';
  weight: number;
  priority: number;
  trend: number;
  reason: string;
  mode: '自动提升' | '自动降低' | '人工锁定';
  goalChain: string[];
  agentType: AgentType;
  approvalLevel: '自动执行' | '通知可否决' | '人工批准';
};

export type AgentType = '内容生产' | '买量投放' | '社区舆情' | 'KOL管理' | '产品优化';

export type AgentBudget = {
  agentType: AgentType;
  monthlyBudget: number;
  spent: number;
  unit: string;
  actionCount: number;
  avgCost: number;
  status: '正常' | '预警' | '已超限';
};

export type HeartbeatLog = {
  id: string;
  time: string;
  gameId: string;
  source: string;
  summary: string;
  insightsGenerated: number;
  actionsGenerated: number;
  status: '完成' | '运行中' | '失败';
};

export type PlatformFeedbackLog = {
  id: string;
  time: string;
  gameId: string;
  suggestionId: string;
  suggestion: string;
  decision: PlatformDecision;
  outcome: PlatformOutcome;
  result: string;
  learning: string;
  impact: '正向' | '负向' | '风险控制';
  weightDelta: number;
  priorityDelta: number;
};

type PlatformMemoryContextValue = {
  games: PlatformGame[];
  selectedGameId: string;
  setSelectedGameId: (id: string) => void;
  addGame: (payload: { name: string; genre: string; stage: PlatformGame['stage'] }) => void;
  uploadedFiles: string[];
  addUploadedFile: (fileName?: string) => void;
  strategies: PlatformStrategy[];
  feedbackLogs: PlatformFeedbackLog[];
  runLearningCycle: (input: { suggestionId: string; decision: PlatformDecision; outcome: PlatformOutcome }) => void;
  agentBudgets: AgentBudget[];
  heartbeatLogs: HeartbeatLog[];
  triggerHeartbeat: () => void;
  knowledgePacks: CampaignKnowledgePack[];
  knowledgeLoading: boolean;
  knowledgeError: string | null;
  knowledgeGameSupported: boolean;
  refreshKnowledgePacks: () => Promise<void>;
  importFastpublishKnowledge: () => Promise<void>;
  addKnowledgeSource: (input: { title: string; content: string; packType: CampaignKnowledgePackType }) => Promise<void>;
};

const PlatformMemoryContext = createContext<PlatformMemoryContextValue | null>(null);

const initialGames: PlatformGame[] = [
  {
    id: 'g1',
    name: 'Project Nova Arena',
    genre: 'SLG',
    stage: '首发期',
    region: 'SEA',
    status: '已就绪',
    assets: 34,
    docs: 12,
    goals: [
      {
        id: 'goal-1',
        title: '首发 30 天 DAU 突破 50 万',
        metric: 'DAU ≥ 500K',
        children: [
          {
            id: 'goal-1-1',
            title: 'TikTok 内容矩阵覆盖 SEA 3 个市场',
            metric: '3 市场各 ≥ 5 个爆款视频',
            children: [
              { id: 'goal-1-1-1', title: '版本卖点混剪本地化扩量' },
              { id: 'goal-1-1-2', title: '角色剧情向内容测试' },
            ],
          },
          {
            id: 'goal-1-2',
            title: 'Meta Ads CPI 控制在 US$0.8 以内',
            metric: 'CPI ≤ $0.8',
            children: [
              { id: 'goal-1-2-1', title: '素材 AB 测试与疲劳检测' },
            ],
          },
          {
            id: 'goal-1-3',
            title: '舆情零重大事件',
            metric: '无需官方道歉或下架',
          },
        ],
      },
    ],
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
    goals: [
      {
        id: 'goal-2',
        title: '爬坡期月流水突破 US$200K',
        metric: 'Revenue ≥ $200K/月',
        children: [
          { id: 'goal-2-1', title: '付费转化率提升到 3.5%' },
          { id: 'goal-2-2', title: 'KOL 合作覆盖 TH/ID 头部 10 位' },
        ],
      },
    ],
  },
];

const initialStrategies: PlatformStrategy[] = [
  {
    id: 'a1',
    gameId: 'g1',
    name: '复用"版本卖点混剪"模板扩展到泰语市场',
    scope: 'SLG / 首发期 / TikTok',
    risk: '低风险',
    weight: 78,
    priority: 84,
    trend: 12,
    reason: '近 7 天 CTR 与 CVR 连续优于均值',
    mode: '自动提升',
    goalChain: ['首发 30 天 DAU 突破 50 万', 'TikTok 内容矩阵覆盖 SEA 3 个市场', '版本卖点混剪本地化扩量'],
    agentType: '内容生产',
    approvalLevel: '自动执行',
  },
  {
    id: 'a2',
    gameId: 'g1',
    name: '针对评论争议自动生成统一回复并发布',
    scope: '社区管理 / 对外表达',
    risk: '高风险',
    weight: 34,
    priority: 28,
    trend: -8,
    reason: '高风险对外动作需人工介入',
    mode: '人工锁定',
    goalChain: ['首发 30 天 DAU 突破 50 万', '舆情零重大事件'],
    agentType: '社区舆情',
    approvalLevel: '人工批准',
  },
  {
    id: 'a3',
    gameId: 'g2',
    name: '继续加大旧素材在 Meta Ads 的预算',
    scope: 'Meta Ads / 全阶段',
    risk: '中风险',
    weight: 49,
    priority: 52,
    trend: -18,
    reason: '素材疲劳导致 CPM 上升、ROI 下滑',
    mode: '自动降低',
    goalChain: ['爬坡期月流水突破 US$200K', '付费转化率提升到 3.5%'],
    agentType: '买量投放',
    approvalLevel: '通知可否决',
  },
];

const initialBudgets: AgentBudget[] = [
  { agentType: '内容生产', monthlyBudget: 5000, spent: 1840, unit: 'tokens/视频', actionCount: 23, avgCost: 80, status: '正常' },
  { agentType: '买量投放', monthlyBudget: 20000, spent: 14200, unit: 'USD', actionCount: 8, avgCost: 1775, status: '预警' },
  { agentType: '社区舆情', monthlyBudget: 2000, spent: 420, unit: 'tokens', actionCount: 12, avgCost: 35, status: '正常' },
  { agentType: 'KOL管理', monthlyBudget: 8000, spent: 3100, unit: 'USD', actionCount: 5, avgCost: 620, status: '正常' },
  { agentType: '产品优化', monthlyBudget: 1000, spent: 180, unit: 'tokens', actionCount: 3, avgCost: 60, status: '正常' },
];

const initialHeartbeats: HeartbeatLog[] = [
  { id: 'hb-1', time: '今天 08:00', gameId: 'g1', source: '定时心跳', summary: '拉取 TikTok/Meta/YouTube 24h 数据，生成 2 条洞察、1 条 Action。', insightsGenerated: 2, actionsGenerated: 1, status: '完成' },
  { id: 'hb-2', time: '今天 08:00', gameId: 'g2', source: '定时心跳', summary: '拉取 Meta Ads 数据，检测到素材疲劳信号。', insightsGenerated: 1, actionsGenerated: 1, status: '完成' },
  { id: 'hb-3', time: '昨天 20:00', gameId: 'g1', source: '事件触发', summary: '评论负面情绪急升触发舆情检测。', insightsGenerated: 1, actionsGenerated: 1, status: '完成' },
];

const initialUploadedFiles = ['世界观设定.pdf', '版本卖点整理.docx', '近30天素材表现.xlsx'];
const stableKnowledgeGameIds = new Set(initialGames.map((game) => game.id));

function getCurrentUiLocale(): UiLocale {
  if (typeof window === 'undefined') return getInitialUiLocale(null, null);
  return readStoredUiLocale(window.localStorage);
}

function nowLabel() {
  return formatDateTime(new Date(), getCurrentUiLocale(), {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isStableKnowledgeGameId(gameId: string): boolean {
  return stableKnowledgeGameIds.has(gameId);
}

export function PlatformMemoryProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<PlatformGame[]>(initialGames);
  const [selectedGameId, setSelectedGameId] = useState<string>(initialGames[0].id);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(initialUploadedFiles);
  const [strategies, setStrategies] = useState<PlatformStrategy[]>(initialStrategies);
  const [feedbackLogs, setFeedbackLogs] = useState<PlatformFeedbackLog[]>([]);
  const [agentBudgets, setAgentBudgets] = useState<AgentBudget[]>(initialBudgets);
  const [heartbeatLogs, setHeartbeatLogs] = useState<HeartbeatLog[]>(initialHeartbeats);
  const [knowledgePacks, setKnowledgePacks] = useState<CampaignKnowledgePack[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);

  const knowledgeGameSupported = isStableKnowledgeGameId(selectedGameId);

  const addGame = (payload: { name: string; genre: string; stage: PlatformGame['stage'] }) => {
    const name = payload.name.trim();
    if (!name) return;
    const next: PlatformGame = {
      id: `g${Date.now()}`, name, genre: payload.genre, stage: payload.stage,
      region: '待设置', status: '待补资料', assets: 0, docs: 0,
      goals: [{ id: `goal-${Date.now()}`, title: `${name} 核心目标（待设定）` }],
    };
    setGames((prev) => [next, ...prev]);
    setSelectedGameId(next.id);
  };

  const addUploadedFile = (fileName?: string) => {
    const next = fileName?.trim() || `资料_${uploadedFiles.length + 1}.pdf`;
    setUploadedFiles((prev) => [next, ...prev]);
    setGames((prev) =>
      prev.map((game) =>
        game.id === selectedGameId
          ? { ...game, docs: game.docs + 1, status: game.docs + 1 >= 10 ? '已就绪' : game.docs + 1 >= 6 ? '分析中' : '待补资料' }
          : game,
      ),
    );
  };

  const triggerHeartbeat = () => {
    const insights = 1 + Math.floor(Math.random() * 3);
    const actions = Math.floor(Math.random() * 2);
    setHeartbeatLogs((prev) => [
      {
        id: `hb-${Date.now()}`,
        time: nowLabel(),
        gameId: selectedGameId,
        source: '手动触发',
        summary: `拉取最新数据，生成 ${insights} 条洞察${actions > 0 ? `、${actions} 条 Action 建议` : ''}。`,
        insightsGenerated: insights,
        actionsGenerated: actions,
        status: '完成',
      },
      ...prev,
    ]);
  };

  const runLearningCycle = (input: { suggestionId: string; decision: PlatformDecision; outcome: PlatformOutcome }) => {
    const strategy = strategies.find((item) => item.id === input.suggestionId);
    if (!strategy) return;

    let weightDelta = 0;
    let priorityDelta = 0;
    let learning = '';
    let result = '';
    let impact: PlatformFeedbackLog['impact'] = '正向';

    if (input.decision === '拒绝') {
      weightDelta = strategy.risk === '高风险' ? -2 : -6;
      priorityDelta = -10;
      learning = '用户拒绝该类 Action，系统应降低推荐频次，并重新判断风险门槛。';
      result = '该建议未被采纳，系统记录为人工监督信号。';
      impact = strategy.risk === '高风险' ? '风险控制' : '负向';
    } else if (input.decision === '人工修改') {
      weightDelta = input.outcome === '强正反馈' ? 6 : input.outcome === '轻正反馈' ? 3 : -5;
      priorityDelta = input.outcome === '风险规避' ? -4 : 2;
      learning = '人工修改说明原建议方向可能正确，但执行参数需要修正。';
      result = input.outcome === '风险规避' ? '人工改写后规避了风险。' : '人工改写后得到新的执行反馈。';
      impact = input.outcome === '风险规避' ? '风险控制' : input.outcome === '负反馈' ? '负向' : '正向';
    } else {
      if (input.outcome === '强正反馈') { weightDelta = 12; priorityDelta = 10; learning = '该策略被验证有效，应提升模板权重与相似建议优先级。'; result = '核心指标明显优于基线。'; impact = '正向'; }
      else if (input.outcome === '轻正反馈') { weightDelta = 5; priorityDelta = 4; learning = '该策略有效但收益一般，继续保留并观察。'; result = '指标小幅优于基线。'; impact = '正向'; }
      else if (input.outcome === '负反馈') { weightDelta = -14; priorityDelta = -11; learning = '执行后效果变差，应显著降权。'; result = 'ROI 或效率指标低于预期。'; impact = '负向'; }
      else { weightDelta = strategy.risk === '高风险' ? 4 : -3; priorityDelta = -6; learning = '规避了高风险事件，应优先走人工审核门。'; result = '避免了可能的舆情或品牌风险。'; impact = '风险控制'; }
    }

    setAgentBudgets((prev) =>
      prev.map((budget) =>
        budget.agentType === strategy.agentType
          ? {
              ...budget,
              spent: budget.spent + budget.avgCost,
              actionCount: budget.actionCount + 1,
              status:
                (budget.spent + budget.avgCost) / budget.monthlyBudget > 0.9
                  ? '已超限'
                  : (budget.spent + budget.avgCost) / budget.monthlyBudget > 0.7
                    ? '预警'
                    : '正常',
            }
          : budget,
      ),
    );

    setStrategies((prev) =>
      prev.map((item) =>
        item.id === input.suggestionId
          ? {
              ...item,
              weight: Math.max(0, Math.min(100, item.weight + weightDelta)),
              priority: Math.max(0, Math.min(100, item.priority + priorityDelta)),
              trend: weightDelta,
              reason: learning,
              mode: input.decision === '拒绝' ? '人工锁定' : weightDelta >= 0 ? '自动提升' : '自动降低',
            }
          : item,
      ),
    );

    setFeedbackLogs((prev) => [
      { id: `${input.suggestionId}-${Date.now()}`, time: nowLabel(), gameId: strategy.gameId, suggestionId: strategy.id, suggestion: strategy.name, decision: input.decision, outcome: input.outcome, result, learning, impact, weightDelta, priorityDelta },
      ...prev,
    ]);
  };

  const refreshKnowledgePacks = async () => {
    if (!knowledgeGameSupported) {
      setKnowledgePacks([]);
      setKnowledgeError(null);
      return;
    }
    setKnowledgeLoading(true);
    setKnowledgeError(null);
    try {
      const result = await listCampaignKnowledgePacks(selectedGameId);
      setKnowledgePacks(result.packs);
    } catch (error) {
      setKnowledgeError(error instanceof Error ? error.message : '加载知识包失败');
    } finally {
      setKnowledgeLoading(false);
    }
  };

  const importFastpublishKnowledge = async () => {
    if (!knowledgeGameSupported) return;
    setKnowledgeLoading(true);
    setKnowledgeError(null);
    try {
      const result = await importKnowledgeTemplate(selectedGameId);
      setKnowledgePacks(result.packs);
    } catch (error) {
      setKnowledgeError(error instanceof Error ? error.message : '导入知识包失败');
    } finally {
      setKnowledgeLoading(false);
    }
  };

  const addKnowledgeSource = async (input: { title: string; content: string; packType: CampaignKnowledgePackType }) => {
    if (!knowledgeGameSupported) return;
    setKnowledgeLoading(true);
    setKnowledgeError(null);
    try {
      const result = await createKnowledgeSource(selectedGameId, input);
      setKnowledgePacks(result.packs);
    } catch (error) {
      setKnowledgeError(error instanceof Error ? error.message : '新增知识源失败');
    } finally {
      setKnowledgeLoading(false);
    }
  };

  useEffect(() => {
    void refreshKnowledgePacks();
  }, [selectedGameId]);

  const value = useMemo<PlatformMemoryContextValue>(() => ({
    games, selectedGameId, setSelectedGameId, addGame, uploadedFiles, addUploadedFile,
    strategies, feedbackLogs, runLearningCycle, agentBudgets, heartbeatLogs, triggerHeartbeat,
    knowledgePacks, knowledgeLoading, knowledgeError, knowledgeGameSupported,
    refreshKnowledgePacks, importFastpublishKnowledge, addKnowledgeSource,
  }), [
    games,
    selectedGameId,
    uploadedFiles,
    strategies,
    feedbackLogs,
    agentBudgets,
    heartbeatLogs,
    knowledgePacks,
    knowledgeLoading,
    knowledgeError,
    knowledgeGameSupported,
  ]);

  return <PlatformMemoryContext.Provider value={value}>{children}</PlatformMemoryContext.Provider>;
}

export function usePlatformMemory() {
  const context = useContext(PlatformMemoryContext);
  if (!context) throw new Error('usePlatformMemory must be used within PlatformMemoryProvider');
  return context;
}
