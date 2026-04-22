import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AgentMemoryPanel } from '../src/editor/components/AgentMemoryPanel.tsx';
import { createEmptyEditorProjectMemory, type EditorUserCommunicationProfile } from '../src/editor/types/agentMemory.ts';

test('AgentMemoryPanel shows remembered project preferences, user profile summary, and memory controls', () => {
  const memory = createEmptyEditorProjectMemory('2026-04-22T00:00:00.000Z');
  memory.preferenceSignals = [
    {
      id: 'pref_1',
      key: 'hook_style',
      value: 'fast_tiktok_hook',
      source: 'explicit_user',
      confidence: 0.8,
      evidenceCount: 2,
      lastConfirmedAt: '2026-04-22T00:00:00.000Z',
    },
  ];
  memory.negativePreferenceSignals = [
    {
      id: 'neg_1',
      key: 'hook',
      value: 'slow_intro',
      source: 'explicit_user',
      confidence: 0.78,
      evidenceCount: 2,
      lastConfirmedAt: '2026-04-22T00:00:00.000Z',
    },
  ];

  const profile: EditorUserCommunicationProfile = {
    version: 1,
    username: 'market_admin',
    updatedAt: '2026-04-22T00:00:00.000Z',
    responseStyle: {
      value: 'brief_direct',
      source: 'explicit_user',
      confidence: 0.82,
      evidenceCount: 3,
      lastConfirmedAt: '2026-04-22T00:00:00.000Z',
    },
    collaborationMode: {
      value: 'act_then_report',
      source: 'explicit_user',
      confidence: 0.72,
      evidenceCount: 2,
      lastConfirmedAt: '2026-04-22T00:00:00.000Z',
    },
    negativePreferences: [],
    summary: {
      version: 1,
      generatedAt: '2026-04-22T00:00:00.000Z',
      recentTurns: 0,
      stableFactCount: 0,
      preferenceCount: 2,
      negativePreferenceCount: 0,
      decisionCount: 0,
      openIssueCount: 0,
      summaryText: 'response_style=brief_direct | collaboration=act_then_report',
    },
  };

  const html = renderToStaticMarkup(
    <AgentMemoryPanel
      projectMemory={memory}
      userCommunicationProfile={profile}
      draftInput="开头再像主播自拍视频一点"
      busy={false}
      onRememberDraft={() => {}}
      onAvoidDraft={() => {}}
      onDeleteProjectItem={() => {}}
      onWeakenProfileDimension={() => {}}
    />,
  );

  assert.match(html, /Agent 记忆/);
  assert.match(html, /fast_tiktok_hook/);
  assert.match(html, /slow_intro/);
  assert.match(html, /brief_direct/);
  assert.match(html, /act_then_report/);
  assert.match(html, /记住这个偏好/);
  assert.match(html, /不要再这样做/);
  assert.match(html, /删除/);
  assert.match(html, /减弱/);
});
