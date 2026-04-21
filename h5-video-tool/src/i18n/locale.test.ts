import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLocaleHeaders,
  CONTENT_LOCALE_STORAGE_KEY,
  UI_LOCALE_STORAGE_KEY,
  getLocalePreset,
  matchLocalePreset,
  normalizeContentLocale,
  normalizeUiLocale,
  readStoredContentLocale,
  readStoredUiLocale,
} from './locale.ts';
import { getMessage } from './messages.ts';

test('normalizeUiLocale maps English variants to en', () => {
  assert.equal(normalizeUiLocale('en-US'), 'en');
  assert.equal(normalizeUiLocale('EN'), 'en');
});

test('normalizeUiLocale falls back to zh-CN', () => {
  assert.equal(normalizeUiLocale(undefined), 'zh-CN');
  assert.equal(normalizeUiLocale('zh'), 'zh-CN');
  assert.equal(normalizeUiLocale('fr-FR'), 'zh-CN');
});

test('normalizeContentLocale maps English variants to en', () => {
  assert.equal(normalizeContentLocale('en-US'), 'en');
  assert.equal(normalizeContentLocale('en'), 'en');
});

test('normalizeContentLocale falls back to zh', () => {
  assert.equal(normalizeContentLocale(undefined), 'zh');
  assert.equal(normalizeContentLocale('zh-CN'), 'zh');
  assert.equal(normalizeContentLocale('fr-FR'), 'zh');
});

test('stored locale readers return normalized values', () => {
  const storage = new Map<string, string>();
  storage.set(UI_LOCALE_STORAGE_KEY, 'en-US');
  storage.set(CONTENT_LOCALE_STORAGE_KEY, 'en-US');

  assert.equal(readStoredUiLocale(storage), 'en');
  assert.equal(readStoredContentLocale(storage), 'en');
});

test('locale header builder returns both UI and content headers', () => {
  const headers = buildLocaleHeaders('en', 'zh');

  assert.deepEqual(headers, {
    'X-UI-Locale': 'en',
    'X-Content-Locale': 'zh',
  });
});

test('message lookup resolves English keys and falls back to Chinese', () => {
  assert.equal(getMessage('en', 'login.title'), 'Sign In To GOBS');
  assert.equal(getMessage('en', 'common.language'), 'Language');
  assert.equal(getMessage('en', 'localePreset.enUiZhContent'), 'English UI + Chinese Content');
  assert.equal(getMessage('en', 'localeSwitcher.title'), 'Language Mode');
  assert.equal(getMessage('en', 'distribute.title'), 'Step 3: Publish To Social');
  assert.equal(getMessage('en', 'quickfilm.startGeneration'), 'Start Generating');
  assert.equal(getMessage('en', 'quickfilm.processingTitle'), 'QuickFilm Is Writing');
  assert.equal(getMessage('en', 'quickfilm.confirmTitle'), 'Storyboard Ready');
  assert.equal(getMessage('en', 'quickfilm.generatedByAi'), 'AI Generated');
  assert.equal(getMessage('zh-CN', 'login.title'), 'GOBS 登录');
  assert.notEqual(getMessage('zh-CN', 'quickfilm.startGeneration'), 'quickfilm.startGeneration');
  assert.equal(getMessage('en', 'missing.key'), 'missing.key');
});

test('locale presets resolve to stable ui/content combinations', () => {
  assert.deepEqual(getLocalePreset('zhUiZhContent'), { uiLocale: 'zh-CN', contentLocale: 'zh' });
  assert.deepEqual(getLocalePreset('enUiEnContent'), { uiLocale: 'en', contentLocale: 'en' });
  assert.deepEqual(getLocalePreset('enUiZhContent'), { uiLocale: 'en', contentLocale: 'zh' });
});

test('locale presets can be matched from current ui/content values', () => {
  assert.equal(matchLocalePreset('zh-CN', 'zh'), 'zhUiZhContent');
  assert.equal(matchLocalePreset('en', 'en'), 'enUiEnContent');
  assert.equal(matchLocalePreset('en', 'zh'), 'enUiZhContent');
  assert.equal(matchLocalePreset('zh-CN', 'en'), null);
});
