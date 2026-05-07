import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateCampaignMissionBrief,
  GOLD_AND_GLORY_CAMPAIGN_GAME_ID,
} from '../src/services/campaignMissionBrief.ts';
import type { CampaignKnowledgePack } from '../src/services/campaignKnowledgeStore.ts';

const packs: CampaignKnowledgePack[] = [
  {
    packId: 'ready_market',
    gameId: GOLD_AND_GLORY_CAMPAIGN_GAME_ID,
    type: 'market_fundamentals',
    title: 'Market Truth',
    status: 'ready',
    summary: 'Players need the payoff quickly.',
    facts: ['Show the gold payoff in the first three seconds.'],
    preferences: [],
    avoid: [],
    hookSeeds: ['Open on a surprising gold reward moment.'],
    visualCues: ['High contrast gold VFX'],
    sourceIds: [],
    updatedAt: '2026-05-07T00:00:00.000Z',
  },
  {
    packId: 'ready_persona',
    gameId: GOLD_AND_GLORY_CAMPAIGN_GAME_ID,
    type: 'user_persona',
    title: 'Audience',
    status: 'ready',
    summary: 'Audience summary',
    facts: ['Mobile RPG players who react to quick progression.'],
    preferences: ['Prefer low-friction entry.'],
    avoid: [],
    hookSeeds: [],
    visualCues: [],
    sourceIds: [],
    updatedAt: '2026-05-07T00:00:00.000Z',
  },
  {
    packId: 'draft_compliance',
    gameId: GOLD_AND_GLORY_CAMPAIGN_GAME_ID,
    type: 'brand_compliance',
    title: 'Draft Compliance',
    status: 'draft',
    summary: 'Draft pack should not route.',
    facts: ['This should not be included.'],
    preferences: [],
    avoid: ['Do not use draft warnings.'],
    hookSeeds: [],
    visualCues: [],
    sourceIds: [],
    updatedAt: '2026-05-07T00:00:00.000Z',
  },
];

function repeatSentence(seed: string, count: number): string {
  return Array.from({ length: count }, (_, index) => `${seed} detail ${index + 1}`).join(' ');
}

function createVerbosePack(input: {
  packId: string;
  type: CampaignKnowledgePack['type'];
  title: string;
  facts?: string[];
  preferences?: string[];
  avoid?: string[];
  hookSeeds?: string[];
  visualCues?: string[];
}): CampaignKnowledgePack {
  return {
    packId: input.packId,
    gameId: GOLD_AND_GLORY_CAMPAIGN_GAME_ID,
    type: input.type,
    title: input.title,
    status: 'ready',
    summary: `${input.title} summary`,
    facts: input.facts ?? [],
    preferences: input.preferences ?? [],
    avoid: input.avoid ?? [],
    hookSeeds: input.hookSeeds ?? [],
    visualCues: input.visualCues ?? [],
    sourceIds: [],
    updatedAt: '2026-05-07T00:00:00.000Z',
  };
}

const verbosePacks: CampaignKnowledgePack[] = [
  createVerbosePack({
    packId: 'verbose_market_1',
    type: 'market_fundamentals',
    title: 'Verbose Market One',
    facts: Array.from({ length: 4 }, (_, index) => repeatSentence(`Market truth ${index + 1}`, 12)),
    hookSeeds: Array.from({ length: 3 }, (_, index) => repeatSentence(`Market hook ${index + 1}`, 8)),
    visualCues: Array.from({ length: 4 }, (_, index) => repeatSentence(`Market visual ${index + 1}`, 10)),
  }),
  createVerbosePack({
    packId: 'verbose_market_2',
    type: 'live_ops_history',
    title: 'Verbose Market Two',
    facts: Array.from({ length: 4 }, (_, index) => repeatSentence(`Live ops proof ${index + 1}`, 12)),
    hookSeeds: Array.from({ length: 3 }, (_, index) => repeatSentence(`History hook ${index + 1}`, 8)),
    visualCues: Array.from({ length: 4 }, (_, index) => repeatSentence(`History visual ${index + 1}`, 10)),
  }),
  createVerbosePack({
    packId: 'verbose_persona_1',
    type: 'user_persona',
    title: 'Verbose Persona One',
    facts: Array.from({ length: 3 }, (_, index) => repeatSentence(`Audience truth ${index + 1}`, 12)),
    preferences: Array.from({ length: 3 }, (_, index) => repeatSentence(`Audience preference ${index + 1}`, 12)),
    hookSeeds: Array.from({ length: 2 }, (_, index) => repeatSentence(`Persona hook ${index + 1}`, 8)),
  }),
  createVerbosePack({
    packId: 'verbose_persona_2',
    type: 'user_persona',
    title: 'Verbose Persona Two',
    facts: Array.from({ length: 3 }, (_, index) => repeatSentence(`Persona pain ${index + 1}`, 12)),
    preferences: Array.from({ length: 3 }, (_, index) => repeatSentence(`Persona motivation ${index + 1}`, 12)),
    hookSeeds: Array.from({ length: 2 }, (_, index) => repeatSentence(`Motivation hook ${index + 1}`, 8)),
  }),
  createVerbosePack({
    packId: 'verbose_tone',
    type: 'brand_tone',
    title: 'Verbose Tone',
    facts: Array.from({ length: 3 }, (_, index) => repeatSentence(`Tone fact ${index + 1}`, 10)),
    preferences: Array.from({ length: 3 }, (_, index) => repeatSentence(`Tone preference ${index + 1}`, 10)),
  }),
  createVerbosePack({
    packId: 'verbose_compliance',
    type: 'brand_compliance',
    title: 'Verbose Compliance',
    facts: Array.from({ length: 3 }, (_, index) => repeatSentence(`Avoid unsupported claim ${index + 1}`, 10)),
    avoid: Array.from({ length: 3 }, (_, index) => repeatSentence(`Compliance restriction ${index + 1}`, 10)),
  }),
  createVerbosePack({
    packId: 'verbose_playbook_1',
    type: 'selling_point_playbook',
    title: 'Verbose Playbook One',
    facts: Array.from({ length: 4 }, (_, index) => repeatSentence(`Approved angle ${index + 1}`, 12)),
    hookSeeds: Array.from({ length: 3 }, (_, index) => repeatSentence(`Angle hook ${index + 1}`, 8)),
    visualCues: Array.from({ length: 3 }, (_, index) => repeatSentence(`Angle visual ${index + 1}`, 10)),
  }),
  createVerbosePack({
    packId: 'verbose_playbook_2',
    type: 'live_ops_calendar',
    title: 'Verbose Playbook Two',
    facts: Array.from({ length: 4 }, (_, index) => repeatSentence(`Calendar truth ${index + 1}`, 12)),
    hookSeeds: Array.from({ length: 3 }, (_, index) => repeatSentence(`Calendar hook ${index + 1}`, 8)),
    visualCues: Array.from({ length: 3 }, (_, index) => repeatSentence(`Calendar visual ${index + 1}`, 10)),
  }),
];

test('generateCampaignMissionBrief routes ready Gold and Glory packs and parses LLM JSON', async () => {
  const result = await generateCampaignMissionBrief(
    {
      mission: '做一条新手爆金体验 TikTok UA 视频',
      mode: 'tiktok_ua',
      uiLocale: 'zh',
    },
    {
      username: 'tester',
      packs,
      chatCompletion: async () => `\`\`\`json
{
  "objective": "突出新手快速获得金币的爽感并促进下载",
  "audience": "喜欢快速成长和即时奖励的移动 RPG 玩家",
  "sellingPoints": ["前三秒看到金币 payoff", "低门槛进入", "成长反馈明确"],
  "cta": "现在下载 Gold and Glory",
  "referenceStyle": "高对比金币特效和快节奏字幕",
  "region": "Global",
  "forbiddenClaims": ["不要承诺真实收益"]
}
\`\`\``,
    },
  );

  assert.equal(result.generationSource, 'llm');
  assert.deepEqual(result.routedKnowledgePackIds, ['ready_market', 'ready_persona']);
  assert.equal(result.brief.mode, 'tiktok_ua');
  assert.match(result.brief.objective ?? '', /新手快速获得金币/);
  assert.equal(result.brief.sellingPoints.length, 3);
  assert.match(result.knowledgeContext.marketTruth.join(' '), /gold payoff/i);
  assert.equal(result.warnings.length, 0);
});

test('generateCampaignMissionBrief falls back when LLM generation fails', async () => {
  const result = await generateCampaignMissionBrief(
    {
      mission: '围绕新手爆金做品牌内容',
      uiLocale: 'zh',
    },
    {
      username: 'tester',
      packs,
      chatCompletion: async () => {
        throw new Error('network down');
      },
    },
  );

  assert.equal(result.generationSource, 'fallback');
  assert.equal(result.brief.mode, 'tiktok_content');
  assert.match(result.brief.objective ?? '', /新手爆金/);
  assert.equal(result.routedKnowledgePackIds.includes('draft_compliance'), false);
  assert.equal(result.warnings.some((warning) => /fallback|回退/i.test(warning)), true);
});

test('generateCampaignMissionBrief compacts verbose routed context before calling the LLM', async () => {
  const seenUserText: string[] = [];
  const result = await generateCampaignMissionBrief(
    {
      mission: 'Launch a new player reward push for Gold and Glory',
      mode: 'tiktok_content',
      uiLocale: 'en',
    },
    {
      username: 'tester',
      packs: verbosePacks,
      chatCompletion: async ({ userText }) => {
        seenUserText.push(userText);
        if (userText.length > 1600) {
          return '```json\n{"objective":"truncated"';
        }
        return `{
          "objective": "Launch a new player reward push for Gold and Glory",
          "audience": "Mobile RPG players who want a quick reward payoff",
          "sellingPoints": [
            "Show the reward in the opening beat",
            "Keep the upgrade path obvious",
            "Make the next action easy to take"
          ],
          "cta": "Download Gold and Glory now",
          "referenceStyle": "Fast native pacing with a clear first-frame payoff",
          "region": "Global",
          "forbiddenClaims": ["Do not promise guaranteed winnings"]
        }`;
      },
    },
  );

  assert.equal(seenUserText.length, 1);
  assert.ok(seenUserText[0].includes('Routed Gold and Glory Brain context:'));
  assert.ok(seenUserText[0].length <= 1600, `expected compact prompt, got ${seenUserText[0].length} chars`);
  assert.equal(result.generationSource, 'llm');
  assert.equal(result.warnings.length, 0);
  assert.equal(result.brief.cta, 'Download Gold and Glory now');
});

test('generateCampaignMissionBrief rejects empty mission input', async () => {
  await assert.rejects(
    () => generateCampaignMissionBrief({ mission: '   ' }, { username: 'tester', packs }),
    /Campaign mission is required/,
  );
});
