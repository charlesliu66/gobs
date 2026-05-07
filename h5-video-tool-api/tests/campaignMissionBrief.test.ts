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

test('generateCampaignMissionBrief rejects empty mission input', async () => {
  await assert.rejects(
    () => generateCampaignMissionBrief({ mission: '   ' }, { username: 'tester', packs }),
    /Campaign mission is required/,
  );
});
