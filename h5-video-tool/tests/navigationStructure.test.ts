import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');

test('sidebar groups match the comprehensive optimization A1 structure', () => {
  const layout = source('src/components/Layout.tsx');
  const groupOrder = [
    'layout.navCampaign',
    'layout.navProduce',
    'layout.navAssets',
    'layout.navDistribute',
    'layout.navHistory',
  ];

  let lastIndex = -1;
  for (const groupKey of groupOrder) {
    const nextIndex = layout.indexOf(`labelKey: '${groupKey}'`);
    assert.ok(nextIndex > lastIndex, `${groupKey} should appear after the previous nav group`);
    lastIndex = nextIndex;
  }

  assert.match(layout, /labelKey: 'layout\.navProduce'[\s\S]*to: '\/studio'[\s\S]*to: '\/studio\/production'[\s\S]*to: '\/quickfilm'[\s\S]*to: '\/editor'/);
  assert.match(layout, /labelKey: 'layout\.navAssets'[\s\S]*to: '\/asset-library'[\s\S]*to: '\/gallery'/);
  assert.match(layout, /labelKey: 'layout\.navDistribute'[\s\S]*to: '\/distribute'[\s\S]*to: '\/tiktok-matrix'/);
});

test('Home exposes Platform only as an experimental entry', () => {
  const home = source('src/pages/Home.tsx');
  const layout = source('src/components/Layout.tsx');

  assert.match(home, /home\.experimental\.title/);
  assert.match(home, /navigate\('\/platform'\)/);
  assert.doesNotMatch(layout, /to: '\/platform'/);
});

test('Studio guide lists all four production entry points', () => {
  const studio = source('src/pages/Studio.tsx');

  for (const to of ['/studio?tab=templates', '/quickfilm', '/studio/production', '/editor']) {
    assert.match(studio, new RegExp(`to: '${to.replace('?', '\\?')}'`));
  }

  for (const key of [
    'studioEntryGuide.advancedStudio.title',
    'studioEntryGuide.quickFilm.title',
    'studioEntryGuide.productionWizard.title',
    'studioEntryGuide.editor.title',
  ]) {
    assert.match(studio, new RegExp(key.replace(/\./g, '\\.')));
  }
});
