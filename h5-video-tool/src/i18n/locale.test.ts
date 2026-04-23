import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLocaleHeaders,
  CONTENT_LOCALE_STORAGE_KEY,
  UI_LOCALE_STORAGE_KEY,
  getLocalePairForLanguage,
  formatDateTime,
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
  assert.equal(readStoredContentLocale(storage, 'zh-CN'), 'en');
});

test('language options map to linked ui/content locales', () => {
  assert.deepEqual(getLocalePairForLanguage('zh-CN'), { uiLocale: 'zh-CN', contentLocale: 'zh' });
  assert.deepEqual(getLocalePairForLanguage('en'), { uiLocale: 'en', contentLocale: 'en' });
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
  assert.equal(getMessage('en', 'localeSwitcher.title'), 'Language Mode');
  assert.equal(getMessage('en', 'distribute.title'), 'Step 3: Publish To Social');
  assert.equal(getMessage('en', 'generate.pageTitle'), 'Start Your Video Dream');
  assert.equal(getMessage('en', 'generate.inputTitle'), 'Video Idea');
  assert.equal(getMessage('en', 'generate.matchAssets'), 'Match Assets');
  assert.equal(getMessage('en', 'generate.tiktokReferenceVideo'), 'TikTok Reference Video');
  assert.equal(getMessage('en', 'generate.configureDriveHint'), 'Before using "Match Assets", set a Drive folder in Materials first.');
  assert.equal(getMessage('en', 'productionWizard.projectTitlePlaceholder'), 'Project title');
  assert.equal(getMessage('en', 'productionWizard.subtitle'), 'Advanced Production · Story Outline -> Character & Scene Design -> Storyboard -> Export');
  assert.equal(getMessage('en', 'quickfilm.startGeneration'), 'Start Generating');
  assert.equal(getMessage('en', 'quickfilm.processingTitle'), 'QuickFilm Is Writing');
  assert.equal(getMessage('en', 'quickfilm.confirmTitle'), 'Storyboard Ready');
  assert.equal(getMessage('en', 'quickfilm.generatedByAi'), 'AI Generated');
  assert.equal(getMessage('zh-CN', 'login.title'), 'GOBS 登录');
  assert.notEqual(getMessage('zh-CN', 'quickfilm.startGeneration'), 'quickfilm.startGeneration');
  assert.equal(getMessage('en', 'missing.key'), 'missing.key');
});

test('formatDateTime supports custom formatting options', () => {
  const value = new Date('2026-04-23T08:30:00.000Z');
  const formatted = formatDateTime(value, 'en', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  assert.match(formatted, /4\/23.*08:30|4\/23.*8:30/);
});
