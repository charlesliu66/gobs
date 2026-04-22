import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEditorProjectMemorySummary,
  normalizeEditorProjectMemory,
  normalizeEditorUserCommunicationProfile,
} from '../src/types/editorAgentMemory.ts';

test('normalizeEditorProjectMemory creates a stable project memory payload shape', () => {
  const memory = normalizeEditorProjectMemory({
    rawEvents: [
      {
        role: 'user',
        kind: 'chat',
        content: 'keep it short and sharp',
      },
    ],
    stableFacts: [
      {
        key: 'platform_goal',
        value: 'tiktok_ua',
        confidence: 2,
        evidenceCount: 0,
      },
    ],
    preferenceSignals: [
      {
        key: 'subtitle_style',
        value: 'big_bold',
      },
    ],
    negativePreferenceSignals: [
      {
        key: 'bgm_style',
        value: 'slow_strings',
      },
    ],
    decisionLog: [
      {
        decision: 'skip slow opening',
        outcome: 'accepted',
      },
    ],
    openIssues: ['Need a stronger CTA ending'],
  });

  assert.equal(memory.version, 1);
  assert.equal(memory.rawEvents.length, 1);
  assert.equal(memory.rawEvents[0]?.role, 'user');
  assert.equal(memory.stableFacts[0]?.confidence, 1);
  assert.equal(memory.stableFacts[0]?.evidenceCount, 1);
  assert.equal(memory.preferenceSignals[0]?.value, 'big_bold');
  assert.equal(memory.negativePreferenceSignals[0]?.key, 'bgm_style');
  assert.equal(memory.decisionLog[0]?.outcome, 'accepted');
  assert.equal(memory.summary?.version, 1);
});

test('normalizeEditorUserCommunicationProfile clamps confidence metadata and keeps negative preferences', () => {
  const profile = normalizeEditorUserCommunicationProfile(
    {
      responseStyle: {
        value: 'brief_direct',
        confidence: -0.5,
        evidenceCount: 0,
      },
      collaborationMode: {
        value: 'propose_then_confirm',
        confidence: 5,
        evidenceCount: -3,
      },
      negativePreferences: [
        {
          key: 'avoid_long_explanations',
          value: 'long explanations',
          confidence: 3,
        },
      ],
    },
    'market_admin',
  );

  assert.equal(profile.version, 1);
  assert.equal(profile.username, 'market_admin');
  assert.equal(profile.responseStyle?.confidence, 0);
  assert.equal(profile.responseStyle?.evidenceCount, 1);
  assert.equal(profile.collaborationMode?.confidence, 1);
  assert.equal(profile.collaborationMode?.evidenceCount, 1);
  assert.equal(profile.negativePreferences.length, 1);
  assert.equal(profile.negativePreferences[0]?.key, 'avoid_long_explanations');
});

test('buildEditorProjectMemorySummary returns a summary snapshot with counts', () => {
  const memory = normalizeEditorProjectMemory({
    rawEvents: [
      { role: 'user', kind: 'chat', content: 'first' },
      { role: 'assistant', kind: 'chat', content: 'second' },
    ],
    stableFacts: [{ key: 'audience', value: 'anime_rpg_players' }],
    preferenceSignals: [{ key: 'pace', value: 'fast' }],
    negativePreferenceSignals: [{ key: 'hook', value: 'slow_intro' }],
    decisionLog: [{ decision: 'use faster open', outcome: 'accepted' }],
    openIssues: ['Need sharper CTA'],
  });

  const summary = buildEditorProjectMemorySummary(memory);

  assert.deepEqual(
    {
      version: summary.version,
      recentTurns: summary.recentTurns,
      stableFactCount: summary.stableFactCount,
      preferenceCount: summary.preferenceCount,
      negativePreferenceCount: summary.negativePreferenceCount,
      decisionCount: summary.decisionCount,
      openIssueCount: summary.openIssueCount,
    },
    {
      version: 1,
      recentTurns: 2,
      stableFactCount: 1,
      preferenceCount: 1,
      negativePreferenceCount: 1,
      decisionCount: 1,
      openIssueCount: 1,
    },
  );
  assert.match(summary.summaryText, /anime_rpg_players/);
  assert.match(summary.summaryText, /slow_intro/);
});
