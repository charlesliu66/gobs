import {
  createHash,
} from 'node:crypto';
import {
  type CampaignKnowledgePack,
  type CampaignKnowledgePackType,
  type CampaignKnowledgeSource,
  listCampaignKnowledgePacks,
  saveCampaignKnowledgeSource,
  upsertCampaignKnowledgePack,
} from './campaignKnowledgeStore.js';
import {
  GOLD_AND_GLORY_CANONICAL_PACKS,
  GOLD_AND_GLORY_CANONICAL_TEMPLATE_ID,
  GOLD_AND_GLORY_GAME_ID,
  type CanonicalKnowledgePackSeed,
} from '../config/campaignKnowledge/goldAndGloryCanonicalPacks.js';

export const FASTPUBLISH_CORE_TEMPLATE_ID = 'fastpublish-core';
export { GOLD_AND_GLORY_CANONICAL_TEMPLATE_ID };

type TemplatePackSeed = {
  type: CampaignKnowledgePackType;
  title: string;
  summary: string;
  facts: string[];
  preferences: string[];
  avoid: string[];
  hookSeeds: string[];
  visualCues: string[];
  sources?: Array<{
    title: string;
    relativePath?: string;
    content: string;
  }>;
};

const FASTPUBLISH_CORE_TEMPLATE: TemplatePackSeed[] = [
  {
    type: 'brand_tone',
    title: 'Brand Tone',
    summary: 'Use a market-facing voice that feels native, clear, and game-specific.',
    facts: ['Brand expression should feel native to short-form creative rather than corporate copy.'],
    preferences: ['Lead with concrete player value before broad brand language.', 'Keep the first screen readable and decisive.'],
    avoid: ['Avoid vague slogans that hide the gameplay payoff.'],
    hookSeeds: ['Start with the most concrete player-facing payoff.', 'Open with a market-native statement, then widen to brand tone.'],
    visualCues: ['Short-form native framing', 'Readable on-screen text hierarchy'],
  },
  {
    type: 'brand_compliance',
    title: 'Brand Compliance',
    summary: 'Capture the hard edges around promises, claims, and risky expressions.',
    facts: ['Compliance constraints should travel with the campaign strategy, not be added only at final copy polish.'],
    preferences: ['Use precise, supportable claims tied to visible footage or known features.'],
    avoid: ['Do not imply guaranteed rewards or outcomes.', 'Do not overstate scarcity or event urgency without support.'],
    hookSeeds: [],
    visualCues: [],
  },
  {
    type: 'visual_style',
    title: 'Visual Style',
    summary: 'Define the repeatable visual cues that make creative output feel consistent.',
    facts: ['Creative direction should preserve instantly legible hooks in the first seconds.'],
    preferences: ['Prefer bold focal hierarchy over cluttered multi-message frames.'],
    avoid: ['Avoid burying the hero visual under dense overlays.'],
    hookSeeds: [],
    visualCues: ['Hero-first framing', 'Readable contrast', 'Early visual payoff'],
  },
  {
    type: 'market_fundamentals',
    title: 'Market Fundamentals',
    summary: 'Summarize market truths, audience motivations, and competitive framing.',
    facts: ['Winning campaign creative starts from market truth, not from format alone.', 'Different regions respond to different proof points and emotional triggers.'],
    preferences: ['Phrase value in terms of player tension and payoff.'],
    avoid: [],
    hookSeeds: ['Turn a market truth into a first-frame tension.', 'Lead with the clearest player-facing advantage over generic category promises.'],
    visualCues: [],
  },
  {
    type: 'user_persona',
    title: 'User Persona',
    summary: 'Make audience segments and their emotional tensions explicit.',
    facts: ['Different audience slices enter the creative through different frictions and fantasies.', 'Persona knowledge should change both wording and footage selection.'],
    preferences: ['State the audience tension before prescribing the CTA.'],
    avoid: [],
    hookSeeds: ['Open with the audience pain or desire in plain language.', 'Mirror player POV before revealing the product answer.'],
    visualCues: ['POV-compatible setups', 'Audience-coded captions'],
  },
  {
    type: 'live_ops_calendar',
    title: 'Live Ops Calendar',
    summary: 'Represent the event rhythm that can shape campaign timing and messaging.',
    facts: ['Event cadence changes the strongest urgency, novelty, and reward messaging.'],
    preferences: ['Tie CTA and hook language to the current event window when relevant.'],
    avoid: ['Avoid evergreen messaging when the campaign depends on a limited event beat.'],
    hookSeeds: ['Frame the event beat before the reward explanation.'],
    visualCues: ['Event reward reveals', 'Countdown or seasonal framing when supported'],
  },
  {
    type: 'live_ops_history',
    title: 'Live Ops History',
    summary: 'Capture which past event framings or asset directions performed well.',
    facts: ['Past high-performing event motifs can be reused if the new campaign context matches.'],
    preferences: ['Prefer repeated high-signal motifs over ungrounded novelty.'],
    avoid: [],
    hookSeeds: ['Reuse a historically strong event angle with a fresh front door.'],
    visualCues: ['Historically proven reward reveals'],
  },
  {
    type: 'selling_point_playbook',
    title: 'Selling Point Playbook',
    summary: 'Convert facts into usable selling angles, hooks, and differentiation language.',
    facts: ['A good selling point names a real player payoff, not just a feature label.', 'Differentiation can come from parity, reframe, or exploit angles.'],
    preferences: ['Extract hooks from player tension plus visible payoff.'],
    avoid: ['Avoid feature dumps without a player consequence.'],
    hookSeeds: ['Show the payoff first, then name the reason it matters.', 'Use a tension-to-payoff transition instead of a generic feature list.'],
    visualCues: ['Proof-first reveals', 'Benefit-linked footage'],
  },
];

function toTemplateSourceId(type: CampaignKnowledgePackType): string {
  return `cks_tpl_${type}`;
}

function toTemplatePackId(type: CampaignKnowledgePackType): string {
  return `ckp_tpl_${type}`;
}

function toCanonicalSourceId(type: CampaignKnowledgePackType, index: number): string {
  return `cks_gng_${type}_${String(index + 1).padStart(2, '0')}`;
}

function toCanonicalPackId(type: CampaignKnowledgePackType): string {
  return `ckp_gng_${type}`;
}

function checksumFor(templateId: string, type: CampaignKnowledgePackType, content: string): string {
  const hash = createHash('sha256').update(`${templateId}:${type}:${content}`).digest('hex');
  return `${templateId}:sha256:${hash}`;
}

function getTemplatePackSeeds(gameId: string, templateId: string): Array<TemplatePackSeed | CanonicalKnowledgePackSeed> {
  if (templateId === FASTPUBLISH_CORE_TEMPLATE_ID) {
    return FASTPUBLISH_CORE_TEMPLATE;
  }
  if (templateId === GOLD_AND_GLORY_CANONICAL_TEMPLATE_ID) {
    if (gameId !== GOLD_AND_GLORY_GAME_ID) {
      throw new Error('Gold and Glory canonical brain can only be imported for gold-and-glory');
    }
    return GOLD_AND_GLORY_CANONICAL_PACKS;
  }
  throw new Error('Unsupported templateId');
}

function getPackId(seed: TemplatePackSeed | CanonicalKnowledgePackSeed, templateId: string): string {
  return templateId === GOLD_AND_GLORY_CANONICAL_TEMPLATE_ID ? toCanonicalPackId(seed.type) : toTemplatePackId(seed.type);
}

function getSourceSeeds(seed: TemplatePackSeed | CanonicalKnowledgePackSeed): Array<{
  title: string;
  relativePath?: string;
  content: string;
}> {
  return seed.sources && seed.sources.length > 0
    ? seed.sources
    : [
        {
          title: `${seed.title} Template`,
          content: [seed.summary, ...seed.facts, ...seed.preferences, ...seed.avoid].join('\n'),
        },
      ];
}

export async function importCampaignKnowledgeTemplate(
  username: string,
  gameId: string,
  templateId = FASTPUBLISH_CORE_TEMPLATE_ID,
): Promise<{
  gameId: string;
  importedPackIds: string[];
  packs: CampaignKnowledgePack[];
  sources: CampaignKnowledgeSource[];
}> {
  const packSeeds = getTemplatePackSeeds(gameId, templateId);

  const sources: CampaignKnowledgeSource[] = [];
  const importedPackIds: string[] = [];

  for (const seed of packSeeds) {
    const sourceIds: string[] = [];
    const sourceSeeds = getSourceSeeds(seed);

    for (const [index, sourceSeed] of sourceSeeds.entries()) {
      const sourceId = templateId === GOLD_AND_GLORY_CANONICAL_TEMPLATE_ID
        ? toCanonicalSourceId(seed.type, index)
        : toTemplateSourceId(seed.type);
      const source = await saveCampaignKnowledgeSource(username, gameId, {
        sourceId,
        gameId,
        sourceType: 'fastpublish-template',
        title: sourceSeed.title,
        originalPath: sourceSeed.relativePath,
        checksum: checksumFor(templateId, seed.type, sourceSeed.content),
        packType: seed.type,
        content: sourceSeed.content,
      });
      sources.push(source);
      sourceIds.push(source.sourceId);
    }

    const pack = await upsertCampaignKnowledgePack(username, gameId, {
      packId: getPackId(seed, templateId),
      gameId,
      type: seed.type,
      title: seed.title,
      status: 'ready',
      summary: seed.summary,
      facts: seed.facts,
      preferences: seed.preferences,
      avoid: seed.avoid,
      hookSeeds: seed.hookSeeds,
      visualCues: seed.visualCues,
      sourceIds,
      templateId,
    });
    importedPackIds.push(pack.packId);
  }

  return {
    gameId,
    importedPackIds,
    packs: await listCampaignKnowledgePacks(username, gameId),
    sources,
  };
}
