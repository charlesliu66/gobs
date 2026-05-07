import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLocaleHeaders,
  CONTENT_LOCALE_STORAGE_KEY,
  UI_LOCALE_STORAGE_KEY,
  formatDate,
  formatMessage,
  formatRelativeTime,
  formatTime,
  getLocalePairForLanguage,
  getLocalePairForPreset,
  getLocalePreset,
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

test('locale presets map to explicit ui/content locale pairs', () => {
  assert.deepEqual(getLocalePairForPreset('zh-ui-zh-content'), { uiLocale: 'zh-CN', contentLocale: 'zh' });
  assert.deepEqual(getLocalePairForPreset('en-ui-zh-content'), { uiLocale: 'en', contentLocale: 'zh' });
  assert.deepEqual(getLocalePairForPreset('en-ui-en-content'), { uiLocale: 'en', contentLocale: 'en' });
  assert.equal(getLocalePreset('zh-CN', 'zh'), 'zh-ui-zh-content');
  assert.equal(getLocalePreset('en', 'zh'), 'en-ui-zh-content');
  assert.equal(getLocalePreset('en', 'en'), 'en-ui-en-content');
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
  assert.equal(getMessage('en', 'localeSwitcher.presetEnglishUiChineseContent'), 'English UI + Chinese Content');
  assert.equal(getMessage('en', 'distribute.title'), 'Step 3: Publish To Social');
  assert.equal(getMessage('en', 'generate.pageTitle'), 'Start Your Video Dream');
  assert.equal(getMessage('en', 'generate.inputTitle'), 'Video Idea');
  assert.equal(getMessage('en', 'generate.matchAssets'), 'Match Assets');
  assert.equal(getMessage('en', 'generate.tiktokReferenceVideo'), 'TikTok Reference Video');
  assert.equal(getMessage('en', 'generate.configureDriveHint'), 'Before using "Match Assets", set a Drive folder in Materials first.');
  assert.equal(getMessage('en', 'productionWizard.projectTitlePlaceholder'), 'Project title');
  assert.equal(getMessage('en', 'productionWizard.subtitle'), 'Advanced Production · Story Outline -> Character & Scene Design -> Storyboard -> Export');
  assert.equal(getMessage('en', 'productionWizard.projectListTitle'), 'Saved Projects');
  assert.equal(getMessage('en', 'productionWizard.namingModalTitle'), 'Name The Project Before Saving');
  assert.equal(getMessage('en', 'productionWizard.saveProjectBeforeShotVideo'), 'Save the project before generating storyboard video');
  assert.equal(getMessage('en', 'productionWizard.status.completed'), 'Completed');
  assert.equal(getMessage('en', 'productionWizard.exportOverview.openInEditor'), 'Open In Editor');
  assert.equal(getMessage('en', 'runningStatus.processing'), 'Processing');
  assert.equal(getMessage('en', 'globalJobsPanel.title'), 'Video progress');
  assert.equal(getMessage('en', 'globalJobsPanel.triggerJob'), '{count} job');
  assert.equal(getMessage('en', 'globalJobsPanel.triggerJobs'), '{count} jobs');
  assert.equal(getMessage('en', 'editorProjectManager.title'), 'My editing projects');
  assert.equal(getMessage('en', 'importGuideModal.generateMusic'), 'Generate music');
  assert.equal(getMessage('en', 'syncProductionModal.title'), 'Sync production updates');
  assert.equal(getMessage('en', 'home.hero.badge'), 'Campaign Mission Control');
  assert.equal(getMessage('en', 'home.hero.primaryCta'), 'Create Campaign');
  assert.equal(getMessage('en', 'home.hero.secondaryCta'), 'Advanced Studio If Needed');
  assert.equal(getMessage('en', 'home.paths.production.action'), 'Open Optional Studio');
  assert.equal(getMessage('en', 'home.reviewQueue.title'), 'Needs Your Review');
  assert.equal(getMessage('en', 'home.reviewQueue.cta'), 'Review Pending Decisions');
  assert.equal(getMessage('en', 'layout.studio'), 'Advanced Studio');
  assert.equal(getMessage('en', 'layout.projects'), 'Advanced Projects');
  assert.equal(getMessage('en', 'campaignCreative.strategy.launchEditor'), 'Open In Advanced Studio');
  assert.equal(getMessage('en', 'projectListPage.reviewBeforePublish'), 'Review Before Publish');
  assert.equal(getMessage('en', 'editorWorkbench.fineTuneInEditor'), 'Fine-Tune In Editor');
  assert.equal(getMessage('en', 'editorWorkbench.projectNameRequired'), 'Enter a project name first.');
  assert.equal(getMessage('en', 'editorWorkbench.namingModalTitle'), 'Create a new editing project');
  assert.equal(getMessage('en', 'editorWorkbench.onboardingTitle'), 'Welcome to the editing workbench');
  assert.equal(getMessage('en', 'editorWorkbench.projectOpenFailed'), 'Failed to load the editing project');
  assert.equal(getMessage('en', 'editorWorkbench.coverCaptured'), 'Cover captured. Check the downloaded file.');
  assert.equal(getMessage('en', 'editorWorkbench.importedStoryboardMusicTriggered'), '🎵 Triggered smart music generation from the imported storyboard…');
  assert.equal(getMessage('en', 'common.collapse'), 'Collapse');
  assert.equal(getMessage('en', 'agentMemoryPanel.title'), 'Agent memory');
  assert.equal(getMessage('en', 'productionWizard.input.title'), 'Concept & Synopsis');
  assert.equal(getMessage('en', 'productionWizard.storyArc.generateCharacterAndSceneDesign'), 'Generate character and scene design');
  assert.equal(
    getMessage('en', 'productionWizard.designActions.assetReadinessHint'),
    'Characters, scenes, and key props flow into later storyboard shots and the final edit. Confirm portraits, scene images, and prop images before continuing.',
  );
  assert.equal(getMessage('en', 'productionWizard.exportWorkspace.reviewAndEditLabel'), 'Review & edit');
  assert.equal(getMessage('en', 'productionWizard.storyboardPreview.noVideoYet'), 'No video yet. Use “Generate storyboard video” on the left.');
  assert.equal(getMessage('en', 'productionWizard.storyboardShotStrip.title'), 'Storyboard strip');
  assert.notEqual(getMessage('zh-CN', 'productionWizard.status.platformQueueing'), 'productionWizard.status.platformQueueing');
  assert.equal(getMessage('en', 'quickfilm.startGeneration'), 'Start Generating');
  assert.equal(getMessage('en', 'quickfilm.processingTitle'), 'QuickFilm Is Writing');
  assert.equal(getMessage('en', 'quickfilm.confirmTitle'), 'Storyboard Ready');
  assert.equal(getMessage('en', 'quickfilm.generatedByAi'), 'AI Generated');
  assert.notEqual(getMessage('zh-CN', 'login.title'), 'login.title');
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

test('formatDate supports custom formatting options', () => {
  const value = new Date('2026-04-23T08:30:00.000Z');
  const formatted = formatDate(value, 'en', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  });
  assert.match(formatted, /04\/23\/2026|4\/23\/2026/);
});

test('formatMessage interpolates named variables', () => {
  assert.equal(
    formatMessage('File {fileMb} MB exceeds the limit of {maxMb} MB.', {
      fileMb: '55.2',
      maxMb: 50,
    }),
    'File 55.2 MB exceeds the limit of 50 MB.',
  );
  assert.equal(
    formatMessage(getMessage('en', 'runningStatus.activeWithElapsed'), {
      label: 'Processing',
      elapsedSec: 12,
    }),
    'Processing (12s)',
  );
  assert.equal(
    formatMessage(getMessage('en', 'globalJobsPanel.capacityHint'), {
      maxConcurrent: 3,
    }),
    'The system can handle up to 3 videos at once. You can leave this page and come back when the reminder arrives.',
  );
  assert.equal(
    formatMessage(getMessage('en', 'productionWizard.storyArc.beatLabel'), {
      index: 4,
    }),
    'Beat 4',
  );
  assert.equal(
    formatMessage(getMessage('en', 'agentMemoryPanel.projectMemoriesCount'), {
      count: 2,
    }),
    'Project memories 2',
  );
  assert.equal(
    formatMessage(getMessage('en', 'editorWorkbench.autoMusicGenerated'), {
      provider: 'Suno',
    }),
    'Music was generated automatically from the conversation (engine: Suno). If it is not right yet, fine-tune it in the music panel and generate again.',
  );
  assert.equal(
    formatMessage(getMessage('en', 'productionWizard.storyboardMainHeader.shotTitle'), {
      shotIndex: 6,
    }),
    'Shot 6',
  );
});

test('formatTime supports custom formatting options', () => {
  const value = new Date('2026-04-23T08:30:00.000Z');
  const formatted = formatTime(value, 'en', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
  assert.equal(formatted, '08:30');
});

test('formatRelativeTime returns localized labels', () => {
  const now = new Date('2026-04-23T09:00:00.000Z').getTime();
  assert.equal(formatRelativeTime(now - 30_000, 'zh-CN', now), '刚刚');
  assert.equal(formatRelativeTime(now - 5 * 60_000, 'en', now), '5 min ago');
  assert.equal(formatRelativeTime(now - 2 * 3_600_000, 'en', now), '2 hr ago');
  assert.equal(formatRelativeTime(now - 86_400_000, 'en', now), '1 day ago');
  assert.equal(formatRelativeTime(now - 2 * 86_400_000, 'en', now), '2 days ago');
  assert.equal(formatRelativeTime(now - 3 * 86_400_000, 'zh-CN', now), '3天前');
});
