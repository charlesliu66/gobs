import {
  type CampaignKnowledgePack,
  type CampaignKnowledgePackType,
  type CampaignKnowledgeSource,
  listCampaignKnowledgePacks,
  saveCampaignKnowledgeSource,
  upsertCampaignKnowledgePack,
} from './campaignKnowledgeStore.js';

export const FASTPUBLISH_CORE_TEMPLATE_ID = 'fastpublish-core';

type TemplatePackSeed = {
  type: CampaignKnowledgePackType;
  title: string;
  summary: string;
  facts: string[];
  preferences: string[];
  avoid: string[];
  hookSeeds: string[];
  visualCues: string[];
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
  if (templateId !== FASTPUBLISH_CORE_TEMPLATE_ID) {
    throw new Error('Unsupported templateId');
  }

  const sources: CampaignKnowledgeSource[] = [];
  const importedPackIds: string[] = [];

  for (const seed of FASTPUBLISH_CORE_TEMPLATE) {
    const source = await saveCampaignKnowledgeSource(username, gameId, {
      sourceId: toTemplateSourceId(seed.type),
      gameId,
      sourceType: 'fastpublish-template',
      title: `${seed.title} Template`,
      checksum: `${templateId}:${seed.type}`,
      packType: seed.type,
      content: [seed.summary, ...seed.facts, ...seed.preferences, ...seed.avoid].join('\n'),
    });
    sources.push(source);

    const pack = await upsertCampaignKnowledgePack(username, gameId, {
      packId: toTemplatePackId(seed.type),
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
      sourceIds: [source.sourceId],
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
