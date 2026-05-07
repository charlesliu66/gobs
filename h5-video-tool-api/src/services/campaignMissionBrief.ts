import { nanoid } from 'nanoid';
import { jsonrepair } from 'jsonrepair';
import {
  listCampaignKnowledgePacks,
  type CampaignKnowledgePack,
} from './campaignKnowledgeStore.js';
import {
  createEmptyDerivedCampaignKnowledgeContext,
  deriveCampaignKnowledgeContext,
  type DerivedCampaignKnowledgeContext,
} from './campaignKnowledgeDerivation.js';
import { compassChatCompletion } from './compassLlm.js';

export const GOLD_AND_GLORY_CAMPAIGN_GAME_ID = 'gold-and-glory';

export type CampaignCreativeMode = 'tiktok_content' | 'tiktok_ua';
export type CampaignMissionUiLocale = 'zh' | 'en';
export type CampaignMissionBriefGenerationSource = 'llm' | 'fallback';

export interface CampaignCreativeBrief {
  briefId: string;
  platform: 'tiktok';
  mode: CampaignCreativeMode;
  objective?: string;
  audience?: string;
  sellingPoints: string[];
  cta?: string;
  referenceStyle?: string;
  region?: string;
  forbiddenClaims?: string[];
}

export interface CampaignMissionBriefResult {
  brief: CampaignCreativeBrief;
  knowledgeContext: DerivedCampaignKnowledgeContext;
  routedKnowledgePackIds: string[];
  generationSource: CampaignMissionBriefGenerationSource;
  warnings: string[];
}

export interface CampaignMissionBriefInput {
  mission: string;
  mode?: CampaignCreativeMode;
  uiLocale?: CampaignMissionUiLocale;
}

type ChatCompletion = typeof compassChatCompletion;

interface GenerateCampaignMissionBriefOptions {
  username: string;
  packs?: CampaignKnowledgePack[];
  chatCompletion?: ChatCompletion;
}

interface LlmBriefPayload {
  objective?: unknown;
  audience?: unknown;
  sellingPoints?: unknown;
  cta?: unknown;
  referenceStyle?: unknown;
  region?: unknown;
  forbiddenClaims?: unknown;
}

function createBriefId(): string {
  return `brief_${nanoid(8)}`;
}

function normalizeMode(value: unknown, mission = ''): CampaignCreativeMode {
  if (value === 'tiktok_content' || value === 'tiktok_ua') {
    return value;
  }

  return /ua|user acquisition|cpi|install|download|conversion|转化|买量|下载|投放/i.test(mission)
    ? 'tiktok_ua'
    : 'tiktok_content';
}

function normalizeUiLocale(value: unknown): CampaignMissionUiLocale {
  return value === 'en' ? 'en' : 'zh';
}

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringList(value: unknown, limit: number): string[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/\r?\n|,|;|，|；/)
      : [];
  return [...new Set(source.map((item) => trimString(item)).filter(Boolean))].slice(0, limit);
}

function firstNonEmpty(items: string[], fallback: string): string {
  return items.find((item) => item.trim())?.trim() || fallback;
}

function pickReadyKnowledgePackIds(packs: CampaignKnowledgePack[]): string[] {
  return packs.filter((pack) => pack.status === 'ready').map((pack) => pack.packId);
}

const CONTEXT_DIGEST_MAX_ITEMS_PER_SECTION = 1;
const CONTEXT_DIGEST_ITEM_CHAR_LIMIT = 56;
const CONTEXT_DIGEST_SECTION_CHAR_LIMIT = 92;
const CONTEXT_DIGEST_TOTAL_CHAR_LIMIT = 420;
const CONTEXT_DIGEST_MIN_SECTION_CHAR_LIMIT = 48;
const CONTEXT_DIGEST_MAX_WORDS_PER_ITEM = 10;

function clipDigestText(value: string, limit: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}

function summarizeDigestValue(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  let clause = normalized.split(/[\n|。；;!?！？]/)[0]?.trim() || normalized;
  const commaSnippet = clause.split(/[,，]/)[0]?.trim();
  if (commaSnippet && commaSnippet.length >= 24) {
    clause = commaSnippet;
  }

  if (clause.includes(' ')) {
    const words = clause.split(/\s+/).filter(Boolean);
    clause = words.slice(0, CONTEXT_DIGEST_MAX_WORDS_PER_ITEM).join(' ');
  }

  return clipDigestText(clause, CONTEXT_DIGEST_ITEM_CHAR_LIMIT);
}

function buildContextDigest(context: DerivedCampaignKnowledgeContext): string {
  const sections = [
    ['marketTruth', context.marketTruth],
    ['audienceTension', context.audienceTension],
    ['approvedAngles', context.approvedAngles],
    ['forbiddenClaims', context.forbiddenClaims],
    ['toneRules', context.toneRules],
    ['hookCandidates', context.hookCandidates],
    ['visualCues', context.visualCues],
  ];

  const lines: string[] = [];
  let usedChars = 0;

  for (const [label, values] of sections) {
    const compactValues = (values as string[])
      .map((value) => summarizeDigestValue(value))
      .filter(Boolean)
      .slice(0, CONTEXT_DIGEST_MAX_ITEMS_PER_SECTION);

    if (compactValues.length === 0) {
      continue;
    }

    const renderedLine = clipDigestText(
      `${label}: ${compactValues.join(' | ')}`,
      CONTEXT_DIGEST_SECTION_CHAR_LIMIT,
    );
    const remainingChars = CONTEXT_DIGEST_TOTAL_CHAR_LIMIT - usedChars;
    if (remainingChars < CONTEXT_DIGEST_MIN_SECTION_CHAR_LIMIT) {
      break;
    }

    const budgetedLine = clipDigestText(renderedLine, Math.min(CONTEXT_DIGEST_SECTION_CHAR_LIMIT, remainingChars));
    if (!budgetedLine) {
      continue;
    }

    lines.push(budgetedLine);
    usedChars += budgetedLine.length + 1;
  }

  return lines.join('\n');
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  if (!candidate || !candidate.includes('{')) {
    throw new Error('Mission brief LLM response did not contain a JSON object');
  }
  return JSON.parse(jsonrepair(candidate));
}

function buildFallbackBrief(input: {
  mission: string;
  mode: CampaignCreativeMode;
  uiLocale: CampaignMissionUiLocale;
  knowledgeContext: DerivedCampaignKnowledgeContext;
}): CampaignCreativeBrief {
  const isEnglish = input.uiLocale === 'en';
  const sellingPoints = [
    ...input.knowledgeContext.approvedAngles.slice(0, 2),
    ...input.knowledgeContext.marketTruth.slice(0, 1),
  ].slice(0, 3);
  const forbiddenClaims = input.knowledgeContext.forbiddenClaims.slice(0, 4);

  return {
    briefId: createBriefId(),
    platform: 'tiktok',
    mode: input.mode,
    objective: input.mission,
    audience: firstNonEmpty(
      input.knowledgeContext.audienceTension,
      isEnglish ? 'Gold and Glory target players from the active campaign brain' : 'Gold and Glory 当前 campaign brain 覆盖的目标玩家',
    ),
    sellingPoints: sellingPoints.length > 0
      ? sellingPoints
      : [
          isEnglish
            ? 'Lead with a clear Gold and Glory gameplay payoff'
            : '突出 Gold and Glory 的核心玩法收益感',
          isEnglish
            ? 'Make the first three seconds easy to understand'
            : '前三秒让用户立刻看懂冲突和结果',
        ],
    cta: input.mode === 'tiktok_ua'
      ? (isEnglish ? 'Download now and try Gold and Glory.' : '现在下载并体验 Gold and Glory。')
      : (isEnglish ? 'Follow Gold and Glory for more campaign content.' : '关注 Gold and Glory，继续了解本轮内容。'),
    referenceStyle: firstNonEmpty(
      input.knowledgeContext.visualCues,
      isEnglish ? 'Short-form native pacing with clear first-frame payoff' : '短视频原生节奏，首帧先给清晰 payoff',
    ),
    region: 'Global',
    forbiddenClaims,
  };
}

function normalizeLlmBrief(input: {
  payload: LlmBriefPayload;
  mission: string;
  mode: CampaignCreativeMode;
  uiLocale: CampaignMissionUiLocale;
  knowledgeContext: DerivedCampaignKnowledgeContext;
}): CampaignCreativeBrief {
  const fallback = buildFallbackBrief(input);
  const sellingPoints = normalizeStringList(input.payload.sellingPoints, 5);
  const forbiddenClaims = normalizeStringList(input.payload.forbiddenClaims, 6);

  return {
    ...fallback,
    objective: trimString(input.payload.objective) || fallback.objective,
    audience: trimString(input.payload.audience) || fallback.audience,
    sellingPoints: sellingPoints.length > 0 ? sellingPoints : fallback.sellingPoints,
    cta: trimString(input.payload.cta) || fallback.cta,
    referenceStyle: trimString(input.payload.referenceStyle) || fallback.referenceStyle,
    region: trimString(input.payload.region) || fallback.region,
    forbiddenClaims: forbiddenClaims.length > 0 ? forbiddenClaims : fallback.forbiddenClaims,
  };
}

function buildMissionBriefSystemPrompt(uiLocale: CampaignMissionUiLocale): string {
  const languageInstruction =
    uiLocale === 'en'
      ? 'Write concise English UI-ready copy.'
      : '使用简体中文输出，保留必要的 TikTok、CTA、UA 等行业词。';

  return `You are GOBS Campaign Creative Agent for the game Gold and Glory.
Given a marketer's campaign mission and routed campaign brain context, generate a compact CampaignCreativeBrief.
${languageInstruction}
Return strict JSON only:
{
  "objective": "string",
  "audience": "string",
  "sellingPoints": ["string"],
  "cta": "string",
  "referenceStyle": "string",
  "region": "string",
  "forbiddenClaims": ["string"]
}
Do not invent unsupported performance claims. Keep sellingPoints to 3-5 items and forbiddenClaims to 0-6 items.`;
}

function buildMissionBriefUserText(input: {
  mission: string;
  mode: CampaignCreativeMode;
  knowledgeContext: DerivedCampaignKnowledgeContext;
}): string {
  const contextDigest = buildContextDigest(input.knowledgeContext) || 'No routed brain context is available.';
  return [
    `Campaign mission: ${input.mission}`,
    `Mode: ${input.mode}`,
    'Routed Gold and Glory Brain context:',
    contextDigest,
  ].join('\n\n');
}

function warningNoReadyPacks(uiLocale: CampaignMissionUiLocale): string {
  return uiLocale === 'en'
    ? 'No ready Gold and Glory knowledge packs were available; used mission-only fallback context.'
    : '没有可用的 Gold and Glory ready knowledge packs，已使用 mission-only 回退上下文。';
}

function warningLlmFallback(uiLocale: CampaignMissionUiLocale, error: unknown): string {
  const reason = error instanceof Error ? error.message : '';
  return uiLocale === 'en'
    ? `Mission brief LLM generation failed; used deterministic fallback. ${reason}`.trim()
    : `Mission Brief LLM 生成失败，已使用确定性回退。${reason}`.trim();
}

export async function generateCampaignMissionBrief(
  input: CampaignMissionBriefInput,
  options: GenerateCampaignMissionBriefOptions,
): Promise<CampaignMissionBriefResult> {
  const mission = input.mission.trim();
  if (!mission) {
    throw new Error('Campaign mission is required');
  }

  const mode = normalizeMode(input.mode, mission);
  const uiLocale = normalizeUiLocale(input.uiLocale);
  const warnings: string[] = [];
  const packs = options.packs ?? await listCampaignKnowledgePacks(options.username, GOLD_AND_GLORY_CAMPAIGN_GAME_ID);
  const routedKnowledgePackIds = pickReadyKnowledgePackIds(packs);
  const knowledgeContext = routedKnowledgePackIds.length > 0
    ? deriveCampaignKnowledgeContext(packs, routedKnowledgePackIds)
    : createEmptyDerivedCampaignKnowledgeContext();

  if (routedKnowledgePackIds.length === 0) {
    warnings.push(warningNoReadyPacks(uiLocale));
  }

  try {
    const chatCompletion = options.chatCompletion ?? compassChatCompletion;
    const text = await chatCompletion({
      systemPrompt: buildMissionBriefSystemPrompt(uiLocale),
      userText: buildMissionBriefUserText({ mission, mode, knowledgeContext }),
      temperature: 0.25,
      maxTokens: 1200,
    });
    const payload = extractJsonObject(text) as LlmBriefPayload;
    return {
      brief: normalizeLlmBrief({ payload, mission, mode, uiLocale, knowledgeContext }),
      knowledgeContext,
      routedKnowledgePackIds,
      generationSource: 'llm',
      warnings,
    };
  } catch (error) {
    warnings.push(warningLlmFallback(uiLocale, error));
    return {
      brief: buildFallbackBrief({ mission, mode, uiLocale, knowledgeContext }),
      knowledgeContext,
      routedKnowledgePackIds,
      generationSource: 'fallback',
      warnings,
    };
  }
}
