import test from 'node:test';
import assert from 'node:assert/strict';
import {
  autoMatchCharacterStateBySheet,
  getCharacterShotImage,
} from '../src/studio/productionAssets.ts';

const characterSheet = {
  id: 'char-1',
  name: 'Silas',
  isProtagonist: true,
  variants: [
    { id: 'look-default', label: '默认形象', imageDataUrl: 'look-default.png' },
  ],
  lookTree: [
    { id: 'look-default', parentId: null, label: '默认形象', imageDataUrl: 'look-default.png' },
  ],
  activeLookId: 'look-default',
  activeStateId: 'state-default',
  states: [
    { id: 'state-default', label: '日常装束', imageDataUrl: 'state-default.png' },
    { id: 'state-child', label: '童年形象', imageDataUrl: 'state-child.png' },
  ],
} as const;

test('getCharacterShotImage prefers per-shot state override', () => {
  const result = getCharacterShotImage(characterSheet as never, {
    characterStateOverrides: {
      'char-1': 'state-child',
    },
  });

  assert.equal(result, 'state-child.png');
});

test('getCharacterShotImage falls back to default active state', () => {
  const result = getCharacterShotImage(characterSheet as never, {
    characterStateOverrides: {},
  });

  assert.equal(result, 'state-default.png');
});

test('getCharacterShotImage falls back to active look when state image is unavailable', () => {
  const result = getCharacterShotImage({
    ...characterSheet,
    activeStateId: 'state-missing',
  } as never, {
    characterStateOverrides: {},
  });

  assert.equal(result, 'look-default.png');
});

test('autoMatchCharacterStateBySheet treats childhood and 小时候 as the same age state', () => {
  const result = autoMatchCharacterStateBySheet(
    characterSheet as never,
    '回忆闪回：Silas 小时候独自站在旧庭院里，神情害怕。',
  );

  assert.equal(result, 'state-child');
});

test('getCharacterShotImage uses the auto-matched state before the default active state', () => {
  const result = getCharacterShotImage(characterSheet as never, {
    subject: 'Silas 童年时期',
    action: '小时候的 Silas 追着光跑过走廊',
    characterStateOverrides: {},
  });

  assert.equal(result, 'state-child.png');
});

test('manual per-shot state override still wins over automatic age matching', () => {
  const result = getCharacterShotImage(characterSheet as never, {
    subject: 'Silas 小时候',
    action: '童年回忆中奔跑',
    characterStateOverrides: {
      'char-1': 'state-default',
    },
  });

  assert.equal(result, 'state-default.png');
});
