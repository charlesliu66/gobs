/**
 * 加载并导出 Prompt 模板配置
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PromptTemplateConfig } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const viralDance = require(path.join(__dirname, 'viral-dance.json')) as PromptTemplateConfig;
const cgTrailer = require(path.join(__dirname, 'cg-trailer.json')) as PromptTemplateConfig;
const shortDrama = require(path.join(__dirname, 'short-drama.json')) as PromptTemplateConfig;
const bossShowcase = require(path.join(__dirname, 'boss-showcase.json')) as PromptTemplateConfig;

const TEMPLATES: PromptTemplateConfig[] = [viralDance, cgTrailer, shortDrama, bossShowcase];

export type { PromptTemplateConfig };
export { TEMPLATES };

export function getTemplate(id: string): PromptTemplateConfig | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function getTemplates(): PromptTemplateConfig[] {
  return [...TEMPLATES];
}
