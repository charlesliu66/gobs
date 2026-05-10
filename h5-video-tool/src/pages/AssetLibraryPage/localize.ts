import type { UiLocale } from '../../i18n/locale.ts';

export type GalleryFilterKey =
  | 'ratio'
  | 'type'
  | 'orientation'
  | 'quality'
  | 'duration_range'
  | 'purpose';

export type GalleryTab = 'recent' | 'favorites' | 'all' | 'drive';

const CATEGORY_LABELS: Record<string, { zh: string; en: string }> = {
  character_image: { zh: '角色图', en: 'Character Images' },
  character: { zh: '角色', en: 'Characters' },
  '角色': { zh: '角色', en: 'Characters' },
  scene_image: { zh: '场景图', en: 'Scene Images' },
  scene: { zh: '场景', en: 'Scenes' },
  '场景': { zh: '场景', en: 'Scenes' },
  reference_image: { zh: '参考图', en: 'Reference Images' },
  prop: { zh: '道具', en: 'Props' },
  '武器道具': { zh: '道具', en: 'Props' },
  object: { zh: '物体', en: 'Objects' },
  '物体': { zh: '物体', en: 'Objects' },
  ui_screenshot: { zh: 'UI 截图', en: 'UI Screenshots' },
  style: { zh: '风格素材', en: 'Style Assets' },
  'UI素材': { zh: '风格素材', en: 'Style Assets' },
  logo: { zh: 'Logo', en: 'Logos' },
  gameplay_screenshot: { zh: '玩法截图', en: 'Gameplay Screenshots' },
  finished_banner: { zh: 'Banner 成品', en: 'Finished Banners' },
  video_clip: { zh: '视频片段', en: 'Video Clips' },
  poster: { zh: '宣传图', en: 'Posters' },
  '宣传图': { zh: '宣传图', en: 'Posters' },
  video: { zh: '视频片段', en: 'Video Clips' },
  '视频片段': { zh: '视频片段', en: 'Video Clips' },
  uncategorized: { zh: '未分类', en: 'Uncategorized' },
  '未分类': { zh: '未分类', en: 'Uncategorized' },
};

const TAG_KEY_LABELS: Record<string, { zh: string; en: string }> = {
  ai_category: { zh: 'AI分类', en: 'AI Category' },
  category: { zh: '分类', en: 'Category' },
  style: { zh: '风格', en: 'Style' },
  mood: { zh: '情绪', en: 'Mood' },
  action: { zh: '动作', en: 'Action' },
  scene: { zh: '场景', en: 'Scene' },
  character: { zh: '角色', en: 'Character' },
  object: { zh: '物体', en: 'Object' },
  purpose: { zh: '用途', en: 'Purpose' },
  quality: { zh: '质量', en: 'Quality' },
  orientation: { zh: '方向', en: 'Orientation' },
  duration: { zh: '时长', en: 'Duration' },
  ratio: { zh: '比例', en: 'Ratio' },
  type: { zh: '类型', en: 'Type' },
};

const FILTER_OPTION_LABELS: Partial<Record<GalleryFilterKey, Record<string, { zh: string; en: string }>>> = {
  ratio: {
    '16:9': { zh: '16:9', en: '16:9' },
    '9:16': { zh: '9:16', en: '9:16' },
    '1:1': { zh: '1:1', en: '1:1' },
    other: { zh: '其他比例', en: 'Other Ratio' },
  },
  type: {
    image: { zh: '图片', en: 'Image' },
    video: { zh: '视频', en: 'Video' },
  },
  orientation: {
    landscape: { zh: '横向', en: 'Landscape' },
    portrait: { zh: '竖向', en: 'Portrait' },
    square: { zh: '方形', en: 'Square' },
  },
  quality: {
    hd: { zh: '高清', en: 'HD' },
    sd: { zh: '标清', en: 'SD' },
  },
  duration_range: {
    short: { zh: '短时长', en: 'Short' },
    medium: { zh: '中时长', en: 'Medium' },
    long: { zh: '长时长', en: 'Long' },
  },
  purpose: {
    character: { zh: '角色', en: 'Character' },
    scene: { zh: '场景', en: 'Scene' },
    prop: { zh: '道具', en: 'Prop' },
    cover: { zh: '封面', en: 'Cover' },
  },
};

const TAB_LABELS: Record<GalleryTab, { zh: string; en: string }> = {
  recent: { zh: '最近使用', en: 'Recent' },
  favorites: { zh: '收藏', en: 'Favorites' },
  all: { zh: '全部素材', en: 'All Assets' },
  drive: { zh: 'Google Drive', en: 'Google Drive' },
};

function prettifyKey(key: string): string {
  const normalized = key.replace(/[_-]+/g, ' ').trim();
  if (!normalized) return key;
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function pick(locale: UiLocale, labels: { zh: string; en: string }): string {
  return locale === 'en' ? labels.en : labels.zh;
}

export function localizeAssetCategory(locale: UiLocale, raw: string | null | undefined): string {
  if (!raw) return locale === 'en' ? 'Uncategorized' : '未分类';
  return pick(locale, CATEGORY_LABELS[raw] ?? { zh: raw, en: raw });
}

export function localizeAssetTagKey(locale: UiLocale, key: string): string {
  if (!key) return '';
  const labels = TAG_KEY_LABELS[key];
  if (labels) return pick(locale, labels);
  if (locale === 'en') return prettifyKey(key);
  return key;
}

export function localizeFilterOption(locale: UiLocale, key: GalleryFilterKey, value: string): string {
  if (!value) return '';
  const labels = FILTER_OPTION_LABELS[key]?.[value];
  if (labels) return pick(locale, labels);
  return value;
}

export function localizeGalleryTab(locale: UiLocale, tab: GalleryTab): string {
  return pick(locale, TAB_LABELS[tab]);
}
