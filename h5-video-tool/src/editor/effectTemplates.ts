import { TEXT_PRESETS } from './textPresets';
import type {
  AspectRatioPreset,
  ClipTransition,
  TextClip,
  TextPresetId,
} from './types/timeline';

export type EditorEffectTemplateCategory = 'frame' | 'transition' | 'character' | 'battle' | 'cta';

export type EditorEffectTemplateId =
  | 'creator-safe-frame'
  | 'gameplay-flash-transition'
  | 'character-entry-title'
  | 'battle-cut-in'
  | 'reward-burst-cta'
  | 'end-card-cta';

export interface EditorEffectTextLayer {
  key: string;
  presetId: TextPresetId;
  text: string;
  subtext?: string;
  offsetSec: number;
  durationSec: number;
}

export interface EditorEffectTemplate {
  id: EditorEffectTemplateId;
  label: string;
  shortLabel: string;
  category: EditorEffectTemplateCategory;
  purpose: string;
  supportedAspectRatios: AspectRatioPreset[];
  layers: EditorEffectTextLayer[];
  transitionAfter?: ClipTransition;
  previewSupported: boolean;
  exportSupported: boolean;
}

export interface BuildEditorEffectTextClipsOptions {
  timelineStart: number;
  projectDurationSec: number;
  aspectRatio: AspectRatioPreset;
  seed?: string;
}

export interface EditorEffectApplication {
  template: EditorEffectTemplate;
  textClips: TextClip[];
  transitionAfter?: ClipTransition;
}

const ALL_ASPECT_RATIOS: AspectRatioPreset[] = ['9:16', '16:9', '1:1', '4:3'];
const SOCIAL_ASPECT_RATIOS: AspectRatioPreset[] = ['9:16', '16:9', '1:1'];
const MIN_VISIBLE_CLIP_SEC = 0.2;

export const EDITOR_EFFECT_TEMPLATES: EditorEffectTemplate[] = [
  {
    id: 'creator-safe-frame',
    label: '创作者安全外框',
    shortLabel: '安全外框',
    category: 'frame',
    purpose: '用顶部和底部文字层标出产品、UI、CTA 的安全区域。',
    supportedAspectRatios: ALL_ASPECT_RATIOS,
    previewSupported: true,
    exportSupported: true,
    layers: [
      {
        key: 'top-safe-label',
        presetId: 'sub-top',
        text: 'GAMEPLAY WINDOW',
        offsetSec: 0,
        durationSec: 3,
      },
      {
        key: 'bottom-safe-label',
        presetId: 'sub-bottom',
        text: 'Keep hero, reward, and CTA clear',
        offsetSec: 0,
        durationSec: 3,
      },
    ],
  },
  {
    id: 'gameplay-flash-transition',
    label: '游戏闪白转场',
    shortLabel: '闪白',
    category: 'transition',
    purpose: '用短标题卡和现有叠化衔接两个玩法节奏点。',
    supportedAspectRatios: SOCIAL_ASPECT_RATIOS,
    transitionAfter: 'crossfade',
    previewSupported: true,
    exportSupported: true,
    layers: [
      {
        key: 'flash-card',
        presetId: 'title-card',
        text: 'NEXT PLAY',
        subtext: 'Watch the payoff',
        offsetSec: 0,
        durationSec: 1.6,
      },
    ],
  },
  {
    id: 'character-entry-title',
    label: '角色登场包装',
    shortLabel: '登场',
    category: 'character',
    purpose: '在动作前给英雄或可玩角色加一段登场标题。',
    supportedAspectRatios: ALL_ASPECT_RATIOS,
    previewSupported: true,
    exportSupported: true,
    layers: [
      {
        key: 'entry-title',
        presetId: 'intro-impact',
        text: 'HERO ENTERS',
        offsetSec: 0,
        durationSec: 2,
      },
      {
        key: 'entry-caption',
        presetId: 'sub-bottom',
        text: 'New skill. New reward. One tap away.',
        offsetSec: 1.5,
        durationSec: 2.5,
      },
    ],
  },
  {
    id: 'battle-cut-in',
    label: '战斗切入包装',
    shortLabel: '战斗',
    category: 'battle',
    purpose: '用章节卡和高亮字幕包装战斗爆点。',
    supportedAspectRatios: SOCIAL_ASPECT_RATIOS,
    previewSupported: true,
    exportSupported: true,
    layers: [
      {
        key: 'battle-card',
        presetId: 'title-card',
        text: 'BOSS FIGHT',
        subtext: 'Skill combo ready',
        offsetSec: 0,
        durationSec: 1.8,
      },
      {
        key: 'battle-payoff',
        presetId: 'sub-highlight',
        text: 'Trigger the winning move',
        offsetSec: 1.2,
        durationSec: 2.4,
      },
    ],
  },
  {
    id: 'reward-burst-cta',
    label: '奖励爆点 CTA',
    shortLabel: '奖励 CTA',
    category: 'cta',
    purpose: '把奖励揭示转成短 CTA 节奏点。',
    supportedAspectRatios: SOCIAL_ASPECT_RATIOS,
    previewSupported: true,
    exportSupported: true,
    layers: [
      {
        key: 'reward-highlight',
        presetId: 'sub-highlight',
        text: 'REWARD UNLOCKED',
        offsetSec: 0,
        durationSec: 2,
      },
      {
        key: 'reward-follow',
        presetId: 'outro-follow',
        text: 'Play now',
        subtext: 'Claim the bonus before it resets',
        offsetSec: 1.6,
        durationSec: 3,
      },
    ],
  },
  {
    id: 'end-card-cta',
    label: '片尾 CTA 落版',
    shortLabel: '片尾 CTA',
    category: 'cta',
    purpose: '用现有片尾预设加入最终品牌 CTA。',
    supportedAspectRatios: ALL_ASPECT_RATIOS,
    previewSupported: true,
    exportSupported: true,
    layers: [
      {
        key: 'brand-card',
        presetId: 'outro-brand',
        text: 'GOLD AND GLORY',
        subtext: 'Battle, loot, repeat',
        offsetSec: 0,
        durationSec: 2.5,
      },
      {
        key: 'final-follow',
        presetId: 'outro-follow',
        text: 'Download now',
        subtext: 'Start your first raid today',
        offsetSec: 2.2,
        durationSec: 3,
      },
    ],
  },
];

export const EDITOR_EFFECT_TEMPLATE_IDS = EDITOR_EFFECT_TEMPLATES.map((template) => template.id);

const TEMPLATE_BY_ID = new Map<EditorEffectTemplateId, EditorEffectTemplate>(
  EDITOR_EFFECT_TEMPLATES.map((template) => [template.id, template]),
);

const KNOWN_TEXT_PRESET_IDS = new Set(TEXT_PRESETS.map((preset) => preset.id));

export function listEditorEffectTemplates(category?: EditorEffectTemplateCategory): EditorEffectTemplate[] {
  return category
    ? EDITOR_EFFECT_TEMPLATES.filter((template) => template.category === category)
    : [...EDITOR_EFFECT_TEMPLATES];
}

export function getEditorEffectTemplate(id: EditorEffectTemplateId): EditorEffectTemplate | undefined {
  return TEMPLATE_BY_ID.get(id);
}

export function buildEditorEffectApplication(
  templateId: EditorEffectTemplateId,
  options: BuildEditorEffectTextClipsOptions,
): EditorEffectApplication | null {
  const template = getEditorEffectTemplate(templateId);
  if (!template) return null;
  return {
    template,
    textClips: buildEditorEffectTextClips(templateId, options),
    transitionAfter: template.transitionAfter,
  };
}

export function buildEditorEffectTextClips(
  templateId: EditorEffectTemplateId,
  options: BuildEditorEffectTextClipsOptions,
): TextClip[] {
  const template = getEditorEffectTemplate(templateId);
  if (!template) return [];
  if (!template.supportedAspectRatios.includes(options.aspectRatio)) return [];

  const duration = Math.max(0, options.projectDurationSec);
  if (duration <= 0) return [];

  const safeSeed = sanitizeIdPart(options.seed ?? `${Date.now()}`);
  const start = Number.isFinite(options.timelineStart) ? options.timelineStart : 0;

  return template.layers
    .map((layer, index) => {
      const range = clampLayerRange(start + layer.offsetSec, layer.durationSec, duration);
      if (!range) return null;
      const clip: TextClip = {
        id: `effect_${template.id}_${safeSeed}_${index}_${layer.key}`,
        timelineStart: range.start,
        timelineEnd: range.end,
        text: layer.text,
        subtext: layer.subtext,
        presetId: layer.presetId,
      };
      return clip;
    })
    .filter((clip): clip is TextClip => Boolean(clip));
}

export function validateEditorEffectTemplates(
  templates: EditorEffectTemplate[] = EDITOR_EFFECT_TEMPLATES,
): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();

  for (const template of templates) {
    if (seen.has(template.id)) {
      issues.push(`Duplicate template id: ${template.id}`);
    }
    seen.add(template.id);

    if (!template.previewSupported) {
      issues.push(`${template.id} does not declare preview support`);
    }
    if (!template.exportSupported) {
      issues.push(`${template.id} does not declare export support`);
    }
    if (template.layers.length === 0) {
      issues.push(`${template.id} has no text layers`);
    }
    for (const layer of template.layers) {
      if (!KNOWN_TEXT_PRESET_IDS.has(layer.presetId)) {
        issues.push(`${template.id}.${layer.key} uses unknown preset ${layer.presetId}`);
      }
      if (layer.durationSec <= 0) {
        issues.push(`${template.id}.${layer.key} has non-positive duration`);
      }
    }
  }

  return issues;
}

function clampLayerRange(
  requestedStart: number,
  requestedDuration: number,
  projectDurationSec: number,
): { start: number; end: number } | null {
  if (!Number.isFinite(projectDurationSec) || projectDurationSec <= 0) return null;

  const minDuration = Math.min(MIN_VISIBLE_CLIP_SEC, projectDurationSec);
  const maxStart = Math.max(0, projectDurationSec - minDuration);
  const start = clamp(Number.isFinite(requestedStart) ? requestedStart : 0, 0, maxStart);
  const requestedEnd = start + Math.max(minDuration, requestedDuration);
  const end = clamp(requestedEnd, start + minDuration, projectDurationSec);

  return end > start ? { start, end } : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'template';
}
