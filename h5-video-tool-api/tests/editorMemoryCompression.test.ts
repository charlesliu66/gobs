import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInstructionMemoryPromotion } from '../src/routes/editorAgent.ts';
import {
  buildAgentMemoryContextBlock,
  compactConversationWindow,
  mergeUserCommunicationProfile,
} from '../src/services/editorMemoryCompression.ts';
import { promoteProjectMemory } from '../src/services/editorAgentMemoryStore.ts';
import {
  normalizeEditorProjectMemory,
  normalizeEditorUserCommunicationProfile,
} from '../src/types/editorAgentMemory.ts';

function buildRawEvents(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `evt_${index + 1}`,
    role: index % 2 === 0 ? 'user' : 'assistant',
    kind: 'chat',
    route: 'chat',
    content: `turn-${index + 1}`,
    createdAt: `2026-04-22T00:${String(index).padStart(2, '0')}:00.000Z`,
  }));
}

test('compactConversationWindow keeps the latest 10 turns by default', () => {
  const memory = normalizeEditorProjectMemory({
    rawEvents: buildRawEvents(14),
  });

  const compacted = compactConversationWindow(memory);

  assert.equal(compacted.recentTurns.length, 10);
  assert.equal(compacted.olderTurnCount, 4);
  assert.equal(compacted.recentTurns[0]?.content, 'turn-5');
  assert.equal(compacted.recentTurns[9]?.content, 'turn-14');
});

test('buildAgentMemoryContextBlock compresses older context into facts, preferences, negative items, and open issues', () => {
  const projectMemory = normalizeEditorProjectMemory({
    rawEvents: buildRawEvents(12),
    stableFacts: [
      { key: 'platform_goal', value: 'tiktok_ua' },
      { key: 'target_audience', value: 'midcore_action_players' },
    ],
    preferenceSignals: [
      { key: 'pace', value: 'fast' },
      { key: 'subtitle_style', value: 'big_bold' },
    ],
    negativePreferenceSignals: [
      { key: 'hook', value: 'slow_intro' },
    ],
    decisionLog: [
      { decision: 'Use stronger opening hook', outcome: 'accepted' },
    ],
    openIssues: ['Need a clearer CTA ending'],
  });

  const block = buildAgentMemoryContextBlock({
    projectMemory,
  });

  assert.match(block, /Project Memory - Stable Facts/);
  assert.match(block, /platform_goal=tiktok_ua/);
  assert.match(block, /target_audience=midcore_action_players/);
  assert.match(block, /Project Memory - Preferences/);
  assert.match(block, /pace=fast/);
  assert.match(block, /subtitle_style=big_bold/);
  assert.match(block, /Project Memory - Avoid/);
  assert.match(block, /hook=slow_intro/);
  assert.match(block, /Project Memory - Open Issues/);
  assert.match(block, /Need a clearer CTA ending/);
  assert.match(block, /Project Decisions/);
  assert.match(block, /Use stronger opening hook/);
});

test('buildAgentMemoryContextBlock keeps the latest explicit user command as the highest-priority instruction', () => {
  const projectMemory = normalizeEditorProjectMemory({
    rawEvents: [
      {
        role: 'user',
        kind: 'chat',
        route: 'chat',
        content: '之前先按电影感小字字幕做一版',
        createdAt: '2026-04-22T00:00:00.000Z',
      },
      ...buildRawEvents(10),
      {
        role: 'user',
        kind: 'apply_request',
        route: 'apply',
        content: '这次改成大字强钩子字幕，别再用电影感小字',
        createdAt: '2026-04-22T00:59:00.000Z',
      },
    ],
    preferenceSignals: [
      { key: 'subtitle_style', value: 'cinematic_small' },
    ],
  });

  const block = buildAgentMemoryContextBlock({
    projectMemory,
  });

  assert.match(block, /Current user request and latest explicit instructions override remembered preferences/);
  assert.match(block, /这次改成大字强钩子字幕，别再用电影感小字/);
  assert.doesNotMatch(block, /之前先按电影感小字字幕做一版/);
});

test('mergeUserCommunicationProfile downgrades low-confidence profile items into weak hints only', () => {
  const profile = normalizeEditorUserCommunicationProfile(
    {
      username: 'market_admin',
      responseStyle: {
        value: 'brief_direct',
        source: 'explicit_user',
        confidence: 0.46,
        evidenceCount: 1,
        lastConfirmedAt: '2026-04-22T00:00:00.000Z',
      },
      collaborationMode: {
        value: 'act_then_report',
        source: 'explicit_user',
        confidence: 0.88,
        evidenceCount: 4,
        lastConfirmedAt: '2026-04-22T00:00:00.000Z',
      },
    },
    'market_admin',
  );

  const merged = mergeUserCommunicationProfile(profile);

  assert.equal(merged.strongDirectives.some((item) => item.includes('act_then_report')), true);
  assert.equal(merged.strongDirectives.some((item) => item.includes('brief_direct')), false);
  assert.equal(merged.weakHints.some((item) => item.includes('brief_direct')), true);
});

test('knowledge context promotion lands in stable facts, preferences, and avoid buckets', () => {
  const promotion = buildInstructionMemoryPromotion(
    'Keep the pace fast.',
    {
      platform: 'tiktok',
      mode: 'tiktok_ua',
      sellingPoints: ['launch rewards'],
      forbiddenClaims: [],
    },
    {
      selectedPackIds: ['pack_a'],
      marketTruth: ['Reward windows drive conversion spikes'],
      audienceTension: ['Players need proof before they click'],
      toneRules: ['Keep the payoff visible in the first 2 seconds'],
      forbiddenClaims: ['No guaranteed SSR'],
      approvedAngles: [],
      hookCandidates: [],
      visualCues: ['Reward splash frame'],
      rationaleNotes: [],
    },
  );

  const memory = promoteProjectMemory(normalizeEditorProjectMemory({}), promotion);
  const block = buildAgentMemoryContextBlock({ projectMemory: memory });

  assert.match(block, /knowledge_market_truth_1=Reward windows drive conversion spikes/);
  assert.match(block, /knowledge_audience_tension_1=Players need proof before they click/);
  assert.match(block, /knowledge_tone_rule_1=Keep the payoff visible in the first 2 seconds/);
  assert.match(block, /knowledge_visual_cue_1=Reward splash frame/);
  assert.match(block, /knowledge_forbidden_claim_1=No guaranteed SSR/);
});
