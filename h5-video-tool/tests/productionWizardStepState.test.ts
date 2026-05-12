import test from 'node:test';
import assert from 'node:assert/strict';

import { emptyProductionProject } from '../src/studio/productionTypes.ts';
import { getProductionWizardMaxReachableStep, resolveProductionWizardBootstrapState } from '../src/studio/steps/productionWizardStepState.ts';

test('bootstrap prefers URL project id and skips local draft loading', () => {
  let storedLoaderCalls = 0;
  const result = resolveProductionWizardBootstrapState(new URLSearchParams('projectId=server-123&assetId=asset-9'), {
    storage: {
      getItem: () => 'local-456',
    },
    storedLoader: () => {
      storedLoaderCalls += 1;
      return null;
    },
  });

  assert.equal(result.urlProjectId, 'server-123');
  assert.equal(result.urlAssetId, 'asset-9');
  assert.equal(result.lastStoredId, 'local-456');
  assert.equal(result.shouldLoadFromServer, true);
  assert.equal(result.initial, null);
  assert.equal(storedLoaderCalls, 0);
});

test('bootstrap loads local draft only when no remote project source exists', () => {
  const draft = {
    project: emptyProductionProject(),
    step: 2,
  } as const;
  let storedLoaderCalls = 0;
  const result = resolveProductionWizardBootstrapState(new URLSearchParams(''), {
    storage: {
      getItem: () => null,
    },
    storedLoader: () => {
      storedLoaderCalls += 1;
      return draft as never;
    },
  });

  assert.equal(result.urlProjectId, null);
  assert.equal(result.urlAssetId, null);
  assert.equal(result.lastStoredId, null);
  assert.equal(result.shouldLoadFromServer, false);
  assert.equal(result.initial, draft);
  assert.equal(storedLoaderCalls, 1);
});

test('max reachable step follows story, design, and video progression', () => {
  const empty = emptyProductionProject();
  const withStory = { ...empty, story: {} as never };
  const withDesign = { ...withStory, productionDesign: {} as never };
  const withVideoVersions = {
    ...withDesign,
    shots: [{ videoVersions: [{ id: 'v1' }] } as never],
  };
  const withVideoUrl = {
    ...empty,
    shots: [{ videoUrl: '/videos/demo.mp4' } as never],
  };

  assert.equal(getProductionWizardMaxReachableStep(empty), 1);
  assert.equal(getProductionWizardMaxReachableStep(withStory), 2);
  assert.equal(getProductionWizardMaxReachableStep(withDesign), 3);
  assert.equal(getProductionWizardMaxReachableStep(withVideoVersions), 4);
  assert.equal(getProductionWizardMaxReachableStep(withVideoUrl), 4);
});
