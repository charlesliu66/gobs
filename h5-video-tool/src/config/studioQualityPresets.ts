import { CHARACTER_SHOWCASE_RECOMMENDED_PRESET_IDS } from '../studio/characterShowcaseValidation.ts';

export type StudioPresetLocale = 'zh' | 'en';

export interface StudioQualityPreset {
  id: string;
  labelZh: string;
  labelEn: string;
  promptZh: string;
  promptEn: string;
  validationRecommendation?: 'recommended' | 'not_recommended';
}

export interface StudioQualityPresetGroup {
  id: 'showcase' | 'motion' | 'bgm';
  titleZh: string;
  titleEn: string;
  presets: StudioQualityPreset[];
}

export const STUDIO_SHOWCASE_SUBTYPES: StudioQualityPreset[] = [
  {
    id: 'boss-reveal',
    labelZh: 'Boss 压迫感揭场',
    labelEn: 'Boss reveal',
    promptZh: '强化 Boss 登场压迫感：低机位推进、轮廓光、武器或技能先出现，最后一秒给出清晰角色正脸。',
    promptEn: 'Build a boss-reveal beat: low-angle push-in, rim light, weapon or skill appears first, then a clear face reveal in the final second.',
  },
  {
    id: 'skill-flex',
    labelZh: '技能爽点展示',
    labelEn: 'Skill flex',
    promptZh: '突出角色核心技能爽点：先蓄力，再爆发，画面保留技能轨迹和命中反馈，节奏适合短视频循环观看。',
    promptEn: 'Spotlight the hero skill payoff: charge-up, burst, visible skill trail, clear hit feedback, and loop-friendly short-video rhythm.',
  },
  {
    id: 'reward-payoff',
    labelZh: '奖励获得瞬间',
    labelEn: 'Reward payoff',
    promptZh: '把重点放在奖励获得瞬间：角色动作和 UI 奖励形成强反馈，结尾留一个可接 CTA 的胜利定格。',
    promptEn: 'Center the reward payoff: character action and reward UI land together, ending on a victorious freeze that can support a CTA.',
  },
];

export function getCharacterShowcasePresetRecommendation(presetId: string): 'recommended' | 'not_recommended' {
  return (CHARACTER_SHOWCASE_RECOMMENDED_PRESET_IDS as readonly string[]).includes(presetId)
    ? 'recommended'
    : 'not_recommended';
}

export const STUDIO_MOTION_PROMPTS: StudioQualityPreset[] = [
  {
    id: 'clean-follow',
    labelZh: '干净跟动作',
    labelEn: 'Clean motion follow',
    promptZh: '动作迁移要求角色稳定跟随参考视频，保持肢体比例和服装细节，不做额外夸张变形。',
    promptEn: 'For motion transfer, keep the character faithfully following the reference motion with stable proportions and costume details.',
  },
  {
    id: 'beat-cut',
    labelZh: '卡点转场',
    labelEn: 'Beat-cut transition',
    promptZh: '在动作强拍处安排轻微镜头推进或闪白转场，画面节奏贴近 TikTok 卡点视频。',
    promptEn: 'Add a subtle push-in or flash cut on the strongest motion beat, matching TikTok beat-cut pacing.',
  },
  {
    id: 'stage-energy',
    labelZh: '舞台能量感',
    labelEn: 'Stage energy',
    promptZh: '加入舞台灯、粒子和背景动势，但保证角色主体清晰，不抢动作识别。',
    promptEn: 'Add stage lights, particles, and background movement while keeping the character readable and motion-first.',
  },
];

export const STUDIO_BGM_MOODS: StudioQualityPreset[] = [
  {
    id: 'epic-impact',
    labelZh: '史诗冲击',
    labelEn: 'Epic impact',
    promptZh: 'BGM 情绪参考：史诗鼓点、低频冲击、适合 Boss 登场和技能爆发。',
    promptEn: 'BGM mood reference: epic drums, low-end impact, suited for boss reveal and skill burst moments.',
  },
  {
    id: 'pop-viral',
    labelZh: '流行洗脑',
    labelEn: 'Pop viral',
    promptZh: 'BGM 情绪参考：轻快、可循环、Hook 明确，适合 TikTok 信息流快速抓人。',
    promptEn: 'BGM mood reference: upbeat, loopable, hook-forward, suitable for quick TikTok feed capture.',
  },
  {
    id: 'mystic-luxury',
    labelZh: '神秘高级',
    labelEn: 'Mystic premium',
    promptZh: 'BGM 情绪参考：神秘氛围、空间感强、适合奇幻角色和高价值奖励展示。',
    promptEn: 'BGM mood reference: mysterious, spacious, premium, suitable for fantasy heroes and high-value rewards.',
  },
];

export function localizedPresetLabel(preset: StudioQualityPreset, locale: StudioPresetLocale): string {
  return locale === 'en' ? preset.labelEn : preset.labelZh;
}

export function localizedPresetPrompt(preset: StudioQualityPreset, locale: StudioPresetLocale): string {
  return locale === 'en' ? preset.promptEn : preset.promptZh;
}

export function getStudioQualityPresetGroups(templateId: string, locale: StudioPresetLocale): Array<{
  id: StudioQualityPresetGroup['id'];
  title: string;
  presets: StudioQualityPreset[];
}> {
  const groups: StudioQualityPresetGroup[] = [
    {
      id: 'showcase',
      titleZh: 'Character Showcase 子类型',
      titleEn: 'Character Showcase subtypes',
      presets: STUDIO_SHOWCASE_SUBTYPES,
    },
    {
      id: 'motion',
      titleZh: 'Motion Transfer 动作方向',
      titleEn: 'Motion Transfer direction',
      presets: STUDIO_MOTION_PROMPTS,
    },
    {
      id: 'bgm',
      titleZh: 'BGM 情绪提示',
      titleEn: 'BGM mood hints',
      presets: STUDIO_BGM_MOODS,
    },
  ];

  return groups
    .filter((group) => {
      if (group.id === 'showcase') return templateId === 'boss-showcase';
      if (group.id === 'motion') return templateId === 'viral-dance';
      return templateId === 'custom' || templateId === 'boss-showcase' || templateId === 'viral-dance';
    })
    .map((group) => ({
      id: group.id,
      title: locale === 'en' ? group.titleEn : group.titleZh,
      presets:
        group.id === 'showcase'
          ? group.presets.map((preset) => ({
              ...preset,
              validationRecommendation: getCharacterShowcasePresetRecommendation(preset.id),
            }))
          : group.presets,
    }));
}
