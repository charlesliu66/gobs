import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendAgentMessageEvent,
  promoteProjectMemory,
  readProjectMemoryFromProjectDoc,
  writeProjectMemoryToProjectDoc,
} from '../src/services/editorAgentMemoryStore.ts';

test('appendAgentMessageEvent records a raw conversation event', () => {
  const memory = appendAgentMessageEvent(undefined, {
    role: 'user',
    kind: 'chat',
    route: 'chat',
    content: 'keep the answer short',
  });

  assert.equal(memory.rawEvents.length, 1);
  assert.equal(memory.rawEvents[0]?.content, 'keep the answer short');
  assert.equal(memory.summary.recentTurns, 1);
});

test('appendAgentMessageEvent keeps only the last N raw turns', () => {
  let memory: ReturnType<typeof appendAgentMessageEvent> | undefined;
  for (let index = 0; index < 5; index += 1) {
    memory = appendAgentMessageEvent(
      memory,
      {
        role: index % 2 === 0 ? 'user' : 'assistant',
        kind: 'chat',
        route: 'chat',
        content: `turn-${index}`,
      },
      { maxRawEvents: 3 },
    );
  }

  assert.deepEqual(memory?.rawEvents.map((item) => item.content), ['turn-2', 'turn-3', 'turn-4']);
  assert.equal(memory?.summary.recentTurns, 3);
});

test('promoteProjectMemory persists structured preferences and decisions', () => {
  const memory = promoteProjectMemory(undefined, {
    stableFacts: [{ key: 'platform_goal', value: 'tiktok_ua' }],
    preferenceSignals: [{ key: 'pace', value: 'fast' }],
    negativePreferenceSignals: [{ key: 'hook', value: 'slow_intro' }],
    decisions: [{ decision: 'use faster open', outcome: 'accepted' }],
    openIssues: ['Need stronger CTA'],
  });

  assert.equal(memory.stableFacts[0]?.value, 'tiktok_ua');
  assert.equal(memory.preferenceSignals[0]?.key, 'pace');
  assert.equal(memory.negativePreferenceSignals[0]?.value, 'slow_intro');
  assert.equal(memory.decisionLog[0]?.outcome, 'accepted');
  assert.deepEqual(memory.openIssues, ['Need stronger CTA']);
});

test('project memory can be written into and reloaded from an editor project doc', () => {
  const memory = promoteProjectMemory(undefined, {
    preferenceSignals: [{ key: 'subtitle_style', value: 'big_bold' }],
  });

  const doc = writeProjectMemoryToProjectDoc(
    {
      id: 'ep_memory_01',
      name: 'Memory Test',
      createdAt: '2026-04-22T00:00:00.000Z',
      updatedAt: '2026-04-22T00:00:00.000Z',
      aspectRatio: '9:16',
      project: {},
      assets: {},
    },
    memory,
  );

  const reloaded = readProjectMemoryFromProjectDoc(doc);
  assert.equal(reloaded.preferenceSignals[0]?.value, 'big_bold');
  assert.equal(reloaded.summary.preferenceCount, 1);
});
