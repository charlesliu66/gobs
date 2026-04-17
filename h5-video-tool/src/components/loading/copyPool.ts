/**
 * 百老汇筑梦师 Loading 体验 — 角色化文案池
 *
 * 每个场景绑定一个主说话人（剧院幕后角色），文案按语气分级，支持三段递进。
 * 24h 内同场景同文案不重复超过 2 次。
 */
import type { LoadingScene, LoadingCopy, ProgressiveChain, Speaker, CopyTone } from './types';

// ─── 文案库 ──────────────────────────────────────────────

const COPY_POOL: Record<LoadingScene, LoadingCopy[]> = {
  'writers-room': [
    { text: '联合编剧正在构思下一幕……', tone: 'light', speaker: 'co-writer' },
    { text: '灵感正在发酵，别催，好剧本急不来。', tone: 'light', speaker: 'co-writer' },
    { text: '编剧正在润色台词，逐字逐句。', tone: 'light', speaker: 'co-writer' },
    { text: '联合编剧说："等等，我有个更好的想法……"', tone: 'medium', speaker: 'co-writer' },
    { text: '创意在碰撞中——编剧室的咖啡已经续了第三杯。', tone: 'medium', speaker: 'co-writer' },
    { text: '剧本快写完了，结局还在挣扎。', tone: 'medium', speaker: 'co-writer' },
    { text: '编剧把草稿揉成团又展开了，这是好兆头。', tone: 'heavy', speaker: 'co-writer' },
    { text: '灵感之神目前堵在路上，预计马上到。', tone: 'heavy', speaker: 'co-writer' },
  ],
  rehearsal: [
    { text: '摄影师在找最佳角度……', tone: 'light', speaker: 'cinematographer' },
    { text: '灯光师在调整光位，氛围马上就到。', tone: 'light', speaker: 'lighting' },
    { text: '演员正在走位，请保持安静。', tone: 'light', speaker: 'stage-manager' },
    { text: '道具组在布景——每个细节都不能马虎。', tone: 'medium', speaker: 'props-master' },
    { text: '摄影师说再给他一分钟，上一个镜头太完美需要消化一下。', tone: 'medium', speaker: 'cinematographer' },
    { text: '灯光师和摄影师在讨论色温，这很重要。', tone: 'medium', speaker: 'lighting' },
    { text: '舞台监督提醒：完美需要时间，天才需要更多。', tone: 'heavy', speaker: 'stage-manager' },
    { text: '导演喊了一声 Action——然后又喊了 Cut，重来。', tone: 'heavy', speaker: 'stage-manager' },
  ],
  'fine-cut': [
    { text: '剪辑师正在拼接片段……', tone: 'light', speaker: 'editor' },
    { text: '作曲家正在谱曲，旋律呼之欲出。', tone: 'light', speaker: 'composer' },
    { text: '剪辑师在微调每一帧的节奏。', tone: 'light', speaker: 'editor' },
    { text: '作曲家灵感迸发，整个精修室都在震动。', tone: 'medium', speaker: 'composer' },
    { text: '剪辑师说这个转场再磨一磨就完美了。', tone: 'medium', speaker: 'editor' },
    { text: '配乐快好了，剪辑师已经在跟着节拍点头。', tone: 'medium', speaker: 'composer' },
    { text: '精修是一门手艺——剪辑师正在施展。', tone: 'heavy', speaker: 'editor' },
    { text: '作曲家推翻了第三版，说第四版才是命运之作。', tone: 'heavy', speaker: 'composer' },
  ],
  premiere: [
    { text: '舞台经理在做最后检查……', tone: 'light', speaker: 'stage-manager' },
    { text: '大幕即将拉开，一切就绪。', tone: 'light', speaker: 'stage-manager' },
    { text: '首演前的紧张——连灯光师的手都在抖。', tone: 'medium', speaker: 'lighting' },
    { text: '舞台经理确认：道具就位、灯光就位、信心就位。', tone: 'medium', speaker: 'stage-manager' },
    { text: '观众席正在安静下来……', tone: 'medium', speaker: 'usher' },
    { text: '制片人在后台来回踱步，这是好迹象。', tone: 'heavy', speaker: 'producer' },
    { text: '首演夜的空气里有电——和一点焦虑。', tone: 'heavy', speaker: 'stage-manager' },
    { text: '深呼吸，你的作品马上就要和世界见面了。', tone: 'heavy', speaker: 'producer' },
  ],
  'on-tour': [
    { text: '经纪人在写宣传文案……', tone: 'light', speaker: 'agent' },
    { text: '经纪人正在为每个平台量身定制推广策略。', tone: 'light', speaker: 'agent' },
    { text: '海报正在印刷，全世界的剧院都在等。', tone: 'medium', speaker: 'agent' },
    { text: '经纪人说："这部作品值得更大的舞台。"', tone: 'medium', speaker: 'agent' },
    { text: '巡演路线规划中——下一站，全世界。', tone: 'heavy', speaker: 'agent' },
    { text: '经纪人挂了六个电话，每个平台都想要首发权。', tone: 'heavy', speaker: 'agent' },
  ],
  lobby: [
    { text: '引座员在整理海报墙……', tone: 'light', speaker: 'usher' },
    { text: '剧院大厅正在亮灯，请稍候。', tone: 'light', speaker: 'usher' },
    { text: '引座员确认：你的专属位置已经准备好了。', tone: 'medium', speaker: 'usher' },
    { text: '穹顶灯正在暖场，氛围即将就位。', tone: 'medium', speaker: 'usher' },
    { text: '大厅里的每一张海报都在向你招手。', tone: 'heavy', speaker: 'usher' },
    { text: '引座员："贵宾到——开灯！"', tone: 'heavy', speaker: 'usher' },
  ],
  'props-room': [
    { text: '道具师在整理素材……', tone: 'light', speaker: 'props-master' },
    { text: '道具间忙碌中——每件道具都要归位。', tone: 'light', speaker: 'props-master' },
    { text: '化妆师在给角色定妆，不能急。', tone: 'medium', speaker: 'makeup' },
    { text: '道具师说这批素材质量不错，值得仔细整理。', tone: 'medium', speaker: 'props-master' },
    { text: '化妆师："完美的妆容需要耐心，就像好的表演。"', tone: 'heavy', speaker: 'makeup' },
    { text: '道具间快满了——你的创作素材真不少。', tone: 'heavy', speaker: 'props-master' },
  ],
};

const FALLBACK_COPIES: LoadingCopy[] = [
  { text: '后台正在紧张筹备，请在观众席稍候。', tone: 'light', speaker: 'usher' },
  { text: '幕布后面很忙，但一切都在掌控之中。', tone: 'medium', speaker: 'stage-manager' },
  { text: '制片人说：好作品不怕等，观众会记住的。', tone: 'medium', speaker: 'producer' },
  { text: '整个剧组都在为你的作品奔波——稍安勿躁。', tone: 'heavy', speaker: 'producer' },
  { text: '舞台监督确认：延迟不是问题，质量才是。', tone: 'heavy', speaker: 'stage-manager' },
];

// ─── 三段递进链 ──────────────────────────────────────────

const PROGRESSIVE_CHAINS: ProgressiveChain[] = [
  {
    scene: 'writers-room',
    speaker: 'co-writer',
    steps: [
      { delayMs: 2000, text: '联合编剧：灵感正在发酵……' },
      { delayMs: 6000, text: '联合编剧："等等，我有个更好的想法……"' },
      { delayMs: 12000, text: '联合编剧把草稿揉成团又展开了——是好兆头。' },
    ],
  },
  {
    scene: 'rehearsal',
    speaker: 'cinematographer',
    steps: [
      { delayMs: 2000, text: '摄影师在调整机位……' },
      { delayMs: 6000, text: '灯光师和摄影师在讨论色温，氛围快到了。' },
      { delayMs: 12000, text: '导演喊了一声 Action——画面正在生成。' },
    ],
  },
  {
    scene: 'fine-cut',
    speaker: 'editor',
    steps: [
      { delayMs: 2000, text: '剪辑师正在拼接素材……' },
      { delayMs: 6000, text: '作曲家灵感迸发，配乐呼之欲出。' },
      { delayMs: 12000, text: '精修接近尾声——每一帧都值得。' },
    ],
  },
  {
    scene: 'premiere',
    speaker: 'stage-manager',
    steps: [
      { delayMs: 2000, text: '舞台经理在做最后检查……' },
      { delayMs: 5000, text: '灯光就位、道具就位——一切准备就绪。' },
      { delayMs: 8000, text: '大幕即将拉开——深呼吸。' },
    ],
  },
  {
    scene: 'on-tour',
    speaker: 'agent',
    steps: [
      { delayMs: 2000, text: '经纪人在研究各平台规则……' },
      { delayMs: 5000, text: '宣传文案打磨中——每个字都要打动人。' },
      { delayMs: 8000, text: '经纪人："准备好了，下一站——全世界。"' },
    ],
  },
  {
    scene: 'lobby',
    speaker: 'usher',
    steps: [
      { delayMs: 2000, text: '引座员正在整理海报墙……' },
      { delayMs: 4000, text: '穹顶灯暖场中，氛围即将就位。' },
      { delayMs: 6000, text: '引座员："贵宾到——开灯！"' },
    ],
  },
  {
    scene: 'props-room',
    speaker: 'props-master',
    steps: [
      { delayMs: 2000, text: '道具师在清点素材……' },
      { delayMs: 5000, text: '每件道具都要归位，不能马虎。' },
      { delayMs: 8000, text: '道具间整理完毕——随时可以开拍。' },
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
  'co-writer': '联合编剧',
  cinematographer: '摄影师',
  lighting: '灯光师',
  'stage-manager': '舞台监督',
  producer: '制片人',
  editor: '剪辑师',
  composer: '作曲家',
  makeup: '化妆师',
  'props-master': '道具师',
  agent: '经纪人',
  usher: '引座员',
};

export function getSceneSpeaker(scene: LoadingScene): Speaker {
  const map: Record<LoadingScene, Speaker> = {
    'writers-room': 'co-writer',
    rehearsal: 'cinematographer',
    'fine-cut': 'editor',
    premiere: 'stage-manager',
    'on-tour': 'agent',
    lobby: 'usher',
    'props-room': 'props-master',
  };
  return map[scene];
}

/**
 * 按语气偏好过滤获取一条文案（自带去重）
 * @param maxTone 最大允许语气: light=温和, medium=中等, heavy=全量
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
