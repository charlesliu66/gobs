import {
  buildCreativeBriefPromptBlock,
  buildDefaultCreativeUserMessage,
  type EditorCreativeBrief,
  type EditorCreativeStrategy,
  type EditorCreativeVariant,
  type EditorCreativeVariantPack,
} from './editorCreativeBrief.js';
import type { ReplyLocale } from './replyLocale.js';

export function buildCreativeBriefPromptBlockWithVariant(
  brief?: EditorCreativeBrief,
  strategy?: EditorCreativeStrategy,
  selectedVariant?: EditorCreativeVariant,
  variantPack?: EditorCreativeVariantPack,
  replyLocale: ReplyLocale = 'zh-CN',
): string {
  const base = buildCreativeBriefPromptBlock(brief, strategy, replyLocale);
  if (!base || !selectedVariant) {
    return base;
  }

  const lines = [base, '', replyLocale === 'en' ? '## Selected Variant' : '## 当前 Variant'];
  lines.push(`- ${replyLocale === 'en' ? 'Title' : '标题'}: ${selectedVariant.title}`);
  lines.push(`- ${replyLocale === 'en' ? 'Hook' : 'Hook'}: ${selectedVariant.hook}`);
  if (selectedVariant.openingBeat) {
    lines.push(`- ${replyLocale === 'en' ? 'Opening beat' : '开场节奏'}: ${selectedVariant.openingBeat}`);
  }
  if (selectedVariant.sellingPointFocus) {
    lines.push(`- ${replyLocale === 'en' ? 'Selling point focus' : '卖点重心'}: ${selectedVariant.sellingPointFocus}`);
  }
  lines.push(`- CTA: ${selectedVariant.cta}`);
  if (selectedVariant.editingDirection) {
    lines.push(`- ${replyLocale === 'en' ? 'Editing direction' : '剪辑方向'}: ${selectedVariant.editingDirection}`);
  }
  if (selectedVariant.assetSuggestion) {
    lines.push(`- ${replyLocale === 'en' ? 'Asset suggestion' : '素材建议'}: ${selectedVariant.assetSuggestion}`);
  }
  lines.push(`- ${replyLocale === 'en' ? 'Difference summary' : '差异说明'}: ${selectedVariant.differenceSummary}`);
  if (variantPack?.comparisonAxes.length) {
    lines.push(`- ${replyLocale === 'en' ? 'Pack comparison axes' : 'Pack 对比轴'}: ${variantPack.comparisonAxes.join(' / ')}`);
  }
  return lines.join('\n');
}

export function buildDefaultCreativeUserMessageWithVariant(
  brief: EditorCreativeBrief,
  strategy?: EditorCreativeStrategy,
  selectedVariant?: EditorCreativeVariant,
  replyLocale: ReplyLocale = 'zh-CN',
): string {
  const base = buildDefaultCreativeUserMessage(brief, strategy, replyLocale);
  if (!selectedVariant) {
    return base;
  }

  const suffix = replyLocale === 'en'
    ? ` Use the selected variant "${selectedVariant.title}" with hook "${selectedVariant.hook}", opening beat "${selectedVariant.openingBeat ?? selectedVariant.hook}", and editing direction "${selectedVariant.editingDirection ?? 'keep the variant contrast visible'}". Keep the difference visible: ${selectedVariant.differenceSummary}.`
    : ` 使用当前选中的变体「${selectedVariant.title}」，Hook 是「${selectedVariant.hook}」，开场节奏是「${selectedVariant.openingBeat ?? selectedVariant.hook}」，剪辑方向是「${selectedVariant.editingDirection ?? '保持变体差异清晰'}」，并确保这条差异被保留：${selectedVariant.differenceSummary}。`;
  return `${base}${suffix}`;
}
