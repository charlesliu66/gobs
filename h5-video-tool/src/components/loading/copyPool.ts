/**
 * H5 地牢主题 Loading 体验 — 角色化文案池
 *
 * 每个场景绑定一个主说话人，文案按毒度分级，支持三段递进。
 * 24h 内同场景同文案不重复超过 2 次。
 */
import type { LoadingScene, LoadingCopy, ProgressiveChain, Speaker, CopyTone } from './types';

// ─── 文案库 ──────────────────────────────────────────────

const COPY_POOL: Record<LoadingScene, LoadingCopy[]> = {
  'dungeon-entrance': [
    { text: '门闩卡住了。你先别冲，我先骂两句木匠。', tone: 'light', speaker: 'gatekeeper' },
    { text: '急什么？上一个勇士的盔甲还挂门把上呢。', tone: 'light', speaker: 'gatekeeper' },
    { text: '别拍门，门会紧张。', tone: 'light', speaker: 'gatekeeper' },
    { text: '你是今天第三个说"这把稳了"的人。前两个没回来。', tone: 'medium', speaker: 'gatekeeper' },
    { text: '开门中。提醒你，里面不接受退货。', tone: 'medium', speaker: 'gatekeeper' },
    { text: '门快开了，你的勇气呢？', tone: 'medium', speaker: 'gatekeeper' },
    { text: '要不你先写遗言？我帮你润色。', tone: 'heavy', speaker: 'gatekeeper' },
    { text: '再敲我就让门开慢点。', tone: 'heavy', speaker: 'gatekeeper' },
  ],
  tavern: [
    { text: '队友在路上了，先坐。', tone: 'light', speaker: 'bartender' },
    { text: '来杯麦酒？反正你待会儿也要"再来一把"。', tone: 'light', speaker: 'bartender' },
    { text: '先等等，命运在给你配对手。', tone: 'light', speaker: 'bartender' },
    { text: '队友已发车，脑子可能没上车。', tone: 'medium', speaker: 'bartender' },
    { text: '他们可能在争谁当肉盾。', tone: 'medium', speaker: 'bartender' },
    { text: '上一桌四个人进去，回来俩。另外俩？别问。', tone: 'medium', speaker: 'bartender' },
    { text: '我看你今天运气不错，适合破产。', tone: 'heavy', speaker: 'bartender' },
    { text: '要不你自己去？反正结局差不多。', tone: 'heavy', speaker: 'bartender' },
  ],
  blacksmith: [
    { text: '刀给你磨好了，手抖我可不包售后。', tone: 'light', speaker: 'blacksmith' },
    { text: '你这把剑很亮，怪物看到会先笑再砍。', tone: 'light', speaker: 'blacksmith' },
    { text: '正在打磨你的装备，顺便打磨你的期望值。', tone: 'medium', speaker: 'blacksmith' },
    { text: '武器已开刃，智商请自备。', tone: 'medium', speaker: 'blacksmith' },
    { text: '好消息：装备满耐久。坏消息：你不是。', tone: 'medium', speaker: 'blacksmith' },
    { text: '剑已交付，能砍到谁看你人品。', tone: 'heavy', speaker: 'blacksmith' },
  ],
  settlement: [
    { text: '正在清点你的战利品。', tone: 'light', speaker: 'clerk' },
    { text: '恭喜存活。奖励正在计算。', tone: 'light', speaker: 'clerk' },
    { text: '数量有点多… 确认不是偷的？', tone: 'medium', speaker: 'clerk' },
    { text: '战利品清点中，别催，少一件算你的。', tone: 'medium', speaker: 'clerk' },
    { text: '撤离成功。地牢表示：下次不会这么客气。', tone: 'medium', speaker: 'clerk' },
    { text: '算完了，税后可能让你失望。', tone: 'heavy', speaker: 'clerk' },
    { text: '结算中。提醒：贪多嚼不烂，你今天嚼了不少。', tone: 'heavy', speaker: 'clerk' },
    { text: '扣税另算。别看我，规矩不是我定的。', tone: 'heavy', speaker: 'clerk' },
  ],
  reconnect: [
    { text: '连接断了，地牢没断。你还在里面。', tone: 'light', speaker: 'narrator' },
    { text: '正在重连，你的角色在原地发呆。', tone: 'light', speaker: 'narrator' },
    { text: '怪物发现你掉线了，正在围观。', tone: 'medium', speaker: 'narrator' },
    { text: '重连中。好消息：你还活着。坏消息：暂时的。', tone: 'medium', speaker: 'narrator' },
    { text: '地牢迷路了。你可以重试，或者先回大厅整备。', tone: 'heavy', speaker: 'narrator' },
    { text: '怪物先到了，数据晚点到。点击重连再战。', tone: 'heavy', speaker: 'narrator' },
  ],
};

const FALLBACK_COPIES: LoadingCopy[] = [
  { text: '地牢管理员临时通知：今天怪物心情不好，建议你也别太好。', tone: 'medium', speaker: 'narrator' },
  { text: '等久了？放心，进去会死得很快。', tone: 'heavy', speaker: 'narrator' },
  { text: '正在加载你的下一次阵亡现场。', tone: 'heavy', speaker: 'narrator' },
  { text: '进度条：慢是慢点，送是你送的。', tone: 'heavy', speaker: 'narrator' },
  { text: '欢迎回来，今天也请优雅暴毙。', tone: 'heavy', speaker: 'narrator' },
];

// ─── 三段递进链 ──────────────────────────────────────────

const PROGRESSIVE_CHAINS: ProgressiveChain[] = [
  {
    scene: 'dungeon-entrance',
    speaker: 'gatekeeper',
    steps: [
      { delayMs: 2000, text: '守门人：别拍门，门会紧张。' },
      { delayMs: 5000, text: '守门人：好消息，门快开了；坏消息，门后不是惊喜。' },
      { delayMs: 8000, text: '守门人：要不你先写遗言？我帮你润色。' },
    ],
  },
  {
    scene: 'tavern',
    speaker: 'bartender',
    steps: [
      { delayMs: 2000, text: '酒馆老板：队友在路上了，先坐。' },
      { delayMs: 5000, text: '酒馆老板：他们可能在争谁当肉盾。' },
      { delayMs: 8000, text: '酒馆老板：要不你自己去？反正结局差不多。' },
    ],
  },
  {
    scene: 'blacksmith',
    speaker: 'blacksmith',
    steps: [
      { delayMs: 2000, text: '铁匠：正在打磨你的装备…' },
      { delayMs: 5000, text: '铁匠：顺便打磨你的期望值。' },
      { delayMs: 8000, text: '铁匠：好消息：装备满耐久。坏消息：你不是。' },
    ],
  },
  {
    scene: 'settlement',
    speaker: 'clerk',
    steps: [
      { delayMs: 2000, text: '结算吏：正在清点你的战利品。' },
      { delayMs: 5000, text: '结算吏：数量有点多… 确认不是偷的？' },
      { delayMs: 8000, text: '结算吏：算完了，税后可能让你失望。' },
    ],
  },
  {
    scene: 'reconnect',
    speaker: 'narrator',
    steps: [
      { delayMs: 2000, text: '连接断了，地牢没断。你还在里面。' },
      { delayMs: 5000, text: '怪物发现你掉线了，正在围观。' },
      { delayMs: 8000, text: '怪物先到了，数据晚点到。点击重连再战。' },
    ],
  },
];

// ─── 去重管理 ─────────────────────────────────────────────

const usageMap = new Map<string, { count: number; lastUsed: number }>();
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REPEAT = 2;

function canUse(scene: LoadingScene, text: string): boolean {
  const key = `${scene}::${text}`;
  const record = usageMap.get(key);
  if (!record) return true;
  if (Date.now() - record.lastUsed > DEDUP_WINDOW_MS) return true;
  return record.count < MAX_REPEAT;
}

function markUsed(scene: LoadingScene, text: string) {
  const key = `${scene}::${text}`;
  const record = usageMap.get(key);
  if (!record || Date.now() - record.lastUsed > DEDUP_WINDOW_MS) {
    usageMap.set(key, { count: 1, lastUsed: Date.now() });
  } else {
    record.count++;
    record.lastUsed = Date.now();
  }
}

// ─── 公开 API ─────────────────────────────────────────────

export const SPEAKER_NAMES: Record<Speaker, string> = {
  gatekeeper: '守门人',
  bartender: '酒馆老板',
  blacksmith: '铁匠',
  narrator: '地牢旁白',
  clerk: '结算吏',
};

export function getSceneSpeaker(scene: LoadingScene): Speaker {
  const map: Record<LoadingScene, Speaker> = {
    'dungeon-entrance': 'gatekeeper',
    tavern: 'bartender',
    blacksmith: 'blacksmith',
    settlement: 'clerk',
    reconnect: 'narrator',
  };
  return map[scene];
}

/**
 * 按毒度偏好过滤获取一条文案（自带去重）
 * @param maxTone 最大允许毒度: light=温和, medium=中等, heavy=全量
 */
export function pickCopy(
  scene: LoadingScene,
  maxTone: CopyTone = 'medium',
): LoadingCopy {
  const toneOrder: CopyTone[] = ['light', 'medium', 'heavy'];
  const maxIdx = toneOrder.indexOf(maxTone);
  const pool = (COPY_POOL[scene] || []).filter(
    (c) => toneOrder.indexOf(c.tone) <= maxIdx && canUse(scene, c.text),
  );

  if (pool.length === 0) {
    return FALLBACK_COPIES[Math.floor(Math.random() * FALLBACK_COPIES.length)];
  }

  const pick = pool[Math.floor(Math.random() * pool.length)];
  markUsed(scene, pick.text);
  return pick;
}

/** 获取三段递进链 */
export function getProgressiveChain(scene: LoadingScene): ProgressiveChain | null {
  return PROGRESSIVE_CHAINS.find((c) => c.scene === scene) ?? null;
}

/** 15s+ 异常态兜底文案 */
export function getFallbackCopy(): LoadingCopy {
  return FALLBACK_COPIES[Math.floor(Math.random() * FALLBACK_COPIES.length)];
}
