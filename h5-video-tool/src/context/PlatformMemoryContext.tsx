import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

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

const initialStrategies: PlatformStrategy[] = [
  {
    id: 'a1',
    gameId: 'g1',
    name: '复用“版本卖点混剪”模板扩展到泰语市场',
    scope: 'SLG / 首发期 / TikTok',
    risk: '低风险',
    weight: 78,
    priority: 84,
    trend: 12,
    reason: '近 7 天 CTR 与 CVR 连续优于均值',
    mode: '自动提升',
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
  },
];

const initialUploadedFiles = ['世界观设定.pdf', '版本卖点整理.docx', '近30天素材表现.xlsx'];

function nowLabel() {
  return new Date().toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PlatformMemoryProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<PlatformGame[]>(initialGames);
  const [selectedGameId, setSelectedGameId] = useState<string>(initialGames[0].id);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(initialUploadedFiles);
  const [strategies, setStrategies] = useState<PlatformStrategy[]>(initialStrategies);
  const [feedbackLogs, setFeedbackLogs] = useState<PlatformFeedbackLog[]>([]);

  const addGame = (payload: { name: string; genre: string; stage: PlatformGame['stage'] }) => {
    const name = payload.name.trim();
    if (!name) return;
    const next: PlatformGame = {
      id: `g${Date.now()}`,
      name,
      genre: payload.genre,
      stage: payload.stage,
      region: '待设置',
      status: '待补资料',
      assets: 0,
      docs: 0,
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
          ? {
              ...game,
              docs: game.docs + 1,
              status: game.docs + 1 >= 10 ? '已就绪' : game.docs + 1 >= 6 ? '分析中' : '待补资料',
            }
          : game,
      ),
    );
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
      if (input.outcome === '强正反馈') {
        weightDelta = 12;
        priorityDelta = 10;
        learning = '该策略被验证有效，应提升模板权重与相似建议优先级。';
        result = '核心指标明显优于基线。';
        impact = '正向';
      } else if (input.outcome === '轻正反馈') {
        weightDelta = 5;
        priorityDelta = 4;
        learning = '该策略有效但收益一般，继续保留并观察在不同市场是否稳定复现。';
        result = '指标小幅优于基线。';
        impact = '正向';
      } else if (input.outcome === '负反馈') {
        weightDelta = -14;
        priorityDelta = -11;
        learning = '执行后效果变差，应显著降权，并把替代策略提前推荐。';
        result = 'ROI 或效率指标低于预期。';
        impact = '负向';
      } else {
        weightDelta = strategy.risk === '高风险' ? 4 : -3;
        priorityDelta = -6;
        learning = '虽然没有增长，但规避了高风险事件；这类场景应优先走人工审核门。';
        result = '避免了可能的舆情或品牌风险。';
        impact = '风险控制';
      }
    }

    setStrategies((prev) =>
      prev.map((item) =>
        item.id === input.suggestionId
          ? {
              ...item,
              weight: Math.max(0, Math.min(100, item.weight + weightDelta)),
              priority: Math.max(0, Math.min(100, item.priority + priorityDelta)),
              trend: weightDelta,
              reason: learning,
              mode:
                input.decision === '拒绝'
                  ? '人工锁定'
                  : weightDelta >= 0
                    ? '自动提升'
                    : '自动降低',
            }
          : item,
      ),
    );

    setFeedbackLogs((prev) => [
      {
        id: `${input.suggestionId}-${Date.now()}`,
        time: nowLabel(),
        gameId: strategy.gameId,
        suggestionId: strategy.id,
        suggestion: strategy.name,
        decision: input.decision,
        outcome: input.outcome,
        result,
        learning,
        impact,
        weightDelta,
        priorityDelta,
      },
      ...prev,
    ]);
  };

  const value = useMemo<PlatformMemoryContextValue>(() => ({
    games,
    selectedGameId,
    setSelectedGameId,
    addGame,
    uploadedFiles,
    addUploadedFile,
    strategies,
    feedbackLogs,
    runLearningCycle,
  }), [games, selectedGameId, uploadedFiles, strategies, feedbackLogs]);

  return <PlatformMemoryContext.Provider value={value}>{children}</PlatformMemoryContext.Provider>;
}

export function usePlatformMemory() {
  const ctx = useContext(PlatformMemoryContext);
  if (!ctx) throw new Error('usePlatformMemory must be used within PlatformMemoryProvider');
  return ctx;
}
