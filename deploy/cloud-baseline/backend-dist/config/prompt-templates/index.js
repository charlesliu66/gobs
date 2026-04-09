/**
 * 加载并导出 Prompt 模板配置
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const viralDance = require(path.join(__dirname, 'viral-dance.json'));
const cgTrailer = require(path.join(__dirname, 'cg-trailer.json'));
const shortDrama = require(path.join(__dirname, 'short-drama.json'));
const catHarem = require(path.join(__dirname, 'cat-harem.json'));
const bossShowcase = require(path.join(__dirname, 'boss-showcase.json'));
const shortDramaPresets = require(path.join(__dirname, 'short-drama-presets.json'));
const TEMPLATES = [viralDance, cgTrailer, shortDrama, catHarem, bossShowcase];
export { TEMPLATES };
export function getTemplate(id) {
    return TEMPLATES.find((t) => t.id === id);
}
export function getTemplates() {
    return [...TEMPLATES];
}
/** 短剧剧情预设（猫猫后宫、隐藏大佬等），用于前端子模板选择 */
export function getShortDramaPresets() {
    return shortDramaPresets;
}
