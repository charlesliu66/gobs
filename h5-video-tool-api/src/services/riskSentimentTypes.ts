/**
 * 风控大师 · 类型定义
 * 从 riskSentimentService.ts 提取，供多个子模块共享。
 */

export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export type RiskVideo = {
  id: string;
  coverUrl?: string;
  title: string;
  author: string;
  followers?: number;
  publishedAt?: string;
  likes: number;
  comments: number;
  shares: number;
  sentiment: SentimentLabel;
  riskTag: '高风险' | '可借势' | '建议覆盖' | '持续观察';
  url: string;
  topComments?: Array<{ text: string; likeCount: number }>;
  analysis?: {
    summary: string;
    reasons: string[];
    risks: string[];
    hotCommentsSummary?: string;
    strategies?: { positive?: string; neutral?: string; clarify?: string };
  };
};

export type RiskCreator = {
  id: string;
  nickname: string;
  followers: number;
  recentVideoCount: number;
  avgEngagementRate: number;
  contentTendency: string;
  tendencyDetail?: string;
  strengths?: string;
  collaborationSuggestion?: string;
  potentialScore: number;
  sampleUrl?: string;
  status: '未跟进' | '已观察' | '已投放' | '合作中';
};

export type CommentAttitude = '正面引导' | '中性互动' | '防御缓冲' | '纠偏澄清';

export type CommentTask = {
  id: string;
  videoId: string;
  videoUrl: string;
  authorNickname: string;
  sentiment: SentimentLabel;
  attitude: CommentAttitude;
  lang: string;
  candidates: string[];
  selectedIndex: number;
  editedText?: string;
  executionNature: 'attack' | 'defense';
  /** @deprecated 不再下发；仅兼容旧快照 */
  meaningZh?: string;
};

export type StrategyProfileKey = 'balanced' | 'conservative' | 'aggressive';

export type RiskExecutionProgram = {
  codename: string;
  directionSummary: string;
  attackPct: number;
  defensePct: number;
  expectedEffect: string;
};

export type RiskStrategyBlock = {
  conclusion: string;
  level: '低风险' | '中风险' | '高风险';
  narrative: string;
  riskPoints: string[];
  actions: string[];
  nextFocus?: string;
  commentToneSummary?: string;
};

export type RiskStrategyVariant = RiskStrategyBlock & {
  recommendControlComment: boolean;
  executionProgram?: RiskExecutionProgram;
};

export type RiskSnapshot = {
  game: string;
  days: 7 | 14 | 30;
  keywords: string[];
  limit: number;
  updatedAt: number;
  overview: {
    score: number;
    positivePct: number;
    neutralPct: number;
    negativePct: number;
    helperText: string;
    positiveSummary?: string;
    neutralSummary?: string;
    negativeSummary?: string;
  };
  topics: Array<{ term: string; count: number }>;
  videos: RiskVideo[];
  creators: RiskCreator[];
  strategy: RiskStrategyBlock;
  commentTasks: CommentTask[];
  strategyProfiles?: Record<StrategyProfileKey, RiskStrategyVariant>;
  commentTasksByProfile?: Record<StrategyProfileKey, CommentTask[]>;
  lastRefreshStatus: 'idle' | 'ok' | 'error';
  lastError?: string;
  apifyUsedMock?: boolean;
  effectiveKeywords?: string[];
  keywordMatrix: Array<{ category: string; keywords: string[]; monitorNote?: string }>;
  listeningAlerts: Array<{
    level: '绿' | '黄' | '橙' | '红';
    title: string;
    detail: string;
    responseWithin?: string;
  }>;
  recentTrends: {
    summary: string;
    risingItems: Array<{ topic: string; whyRising: string; tieToGame: string }>;
  };
};

export type RiskExecutionLogEntry = {
  id: string;
  at: number;
  profile?: StrategyProfileKey;
  game?: string;
  ok: boolean;
  message: string;
  taskIds: string[];
  errors: string[];
  items: Array<{ videoUrl: string; comment: string; envId: string; deviceName?: string }>;
};

export type GeelarkPhone = { id: string; name: string; serialNo?: string; status?: number };
