export interface StoryboardDurationBand {
  key: string;
  label: string;
  minSec: number;
  maxSec: number;
  guidance: string;
}

export interface ProductionStoryboardRuleset {
  version: string;
  sources: string[];
  platformDurationRangeSec: { min: number; max: number };
  durationBands: StoryboardDurationBand[];
  mergeSplitGuidance: {
    shortCandidateSec: number;
    longCandidateSec: number;
    shortCandidateRule: string;
    longCandidateRule: string;
  };
}

const RULESET: ProductionStoryboardRuleset = {
  version: 'production-storyboard-rules-v1',
  sources: ['storyboard-studio', 'video-director', 'project-policy'],
  platformDurationRangeSec: { min: 4, max: 15 },
  durationBands: [
    {
      key: 'establishing',
      label: '建立镜/大全景/空间交代镜',
      minSec: 4,
      maxSec: 6,
      guidance: '用于交代地点、时间、空间关系，优先保证环境辨识度，不要空耗时长。',
    },
    {
      key: 'narrative_medium',
      label: '中景叙事镜/常规动作镜',
      minSec: 4,
      maxSec: 8,
      guidance: '用于人物推进、基础行动和清晰叙事，时长应覆盖一个完整动作意图。',
    },
    {
      key: 'complex_blocking',
      label: '复杂调度镜/多动作信息镜',
      minSec: 6,
      maxSec: 10,
      guidance: '当镜头内包含多阶段动作、显著运镜或多人调度时，适度延长以容纳信息。',
    },
    {
      key: 'emotion_hold',
      label: '强情绪停留镜/重要展示镜',
      minSec: 5,
      maxSec: 8,
      guidance: '用于关键情绪或视觉展示，停留要有目的，避免冗长拖镜。',
    },
    {
      key: 'reaction_insert',
      label: '反应镜/补充镜/过渡镜',
      minSec: 4,
      maxSec: 5,
      guidance: '这类镜头应短促清楚，优先承担补充和节奏衔接功能。',
    },
    {
      key: 'max_complexity',
      label: '极端复杂长镜头',
      minSec: 8,
      maxSec: 15,
      guidance: '仅当镜头确实承载复杂动作或重要转折时才拉长，默认不要超过 15 秒。',
    },
  ],
  mergeSplitGuidance: {
    shortCandidateSec: 4,
    longCandidateSec: 15,
    shortCandidateRule:
      '低于 4 秒的镜头通常说明内容过碎，除非是极少数极短反应镜，否则应在叙事阶段减少此类镜头。',
    longCandidateRule:
      '超过 15 秒的镜头通常说明单镜头承载内容过多，优先拆成多个 narrative shots，而不是硬拉长。',
  },
};

function renderDurationBands(): string {
  return RULESET.durationBands
    .map(
      (band) =>
        `- ${band.label}：建议 ${band.minSec}-${band.maxSec}s；${band.guidance}`,
    )
    .join('\n');
}

export function getProductionStoryboardRuleset(): ProductionStoryboardRuleset {
  return RULESET;
}

export function buildStoryboardGenerationRulesContext(): string {
  const { platformDurationRangeSec, mergeSplitGuidance, version } = RULESET;
  return [
    `[Production Storyboard Rules ${version}]`,
    '请按电影分镜逻辑规划 narrative shots，优先保证每个镜头都能独立成立并适合后续 AI 视频生成。',
    `平台执行时长约束：单镜头优先落在 ${platformDurationRangeSec.min}-${platformDurationRangeSec.max} 秒。`,
    '时长判断原则：镜头信息越多、运镜越复杂、动作调度越多，时长可以更长；简单反应镜、补充镜、过渡镜应更短。',
    '镜头时长建议：',
    renderDurationBands(),
    '生成要求：',
    '- 不要为了凑总时长平均分配时长，应让 durationSec 与镜头内容匹配。',
    '- 如果一个镜头描述里包含多个明显阶段、多个情节转折或多个机位任务，优先拆成多个镜头。',
    `- ${mergeSplitGuidance.shortCandidateRule}`,
    `- ${mergeSplitGuidance.longCandidateRule}`,
    '- 每个镜头都要有清晰的主体、动作、构图、运镜和情绪目标。',
  ].join('\n');
}

export function buildStoryboardRefineRulesContext(): string {
  const { platformDurationRangeSec, mergeSplitGuidance, version } = RULESET;
  return [
    `[Production Storyboard Refine Rules ${version}]`,
    '请在不改变镜头数量的前提下，检查每个镜头的内容与 durationSec 是否匹配。',
    `优先把明显不合理的时长修正到 ${platformDurationRangeSec.min}-${platformDurationRangeSec.max} 秒区间附近。`,
    '修正规则：',
    '- 建立镜和复杂调度镜可以略长，但仍需克制。',
    '- 反应镜、补充镜、过渡镜应保持短促清楚。',
    '- 如果镜头内容太少却时长过长，应缩短。',
    '- 如果镜头内容包含多个动作阶段却时长过短，应适度延长。',
    `- ${mergeSplitGuidance.shortCandidateRule}`,
    `- ${mergeSplitGuidance.longCandidateRule}`,
    '- 只在确有必要时修改 durationSec 或描述字段，不要为了修改而修改。',
  ].join('\n');
}
