import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AgentPanel } from '../src/editor/components/AgentPanel.tsx';
import { LocaleProvider } from '../src/i18n/LocaleContext.tsx';

void React;

test('AgentPanel surfaces applied campaign knowledge on the editor strategy card', () => {
  const html = renderToStaticMarkup(
    <LocaleProvider>
      <AgentPanel
        logs={[]}
        onPushLog={() => {}}
        onApply={async () => {}}
        projectMemory={null}
        userCommunicationProfile={null}
        onRememberDraftMemory={async () => {}}
        onAvoidDraftMemory={async () => {}}
        onDeleteProjectMemoryItem={async () => {}}
        onWeakenUserProfileDimension={async () => {}}
        busy={false}
        selectedCount={0}
        timelineAssetCount={2}
        creativeStrategy={{
          platform: 'tiktok',
          mode: 'tiktok_ua',
          objective: 'drive installs',
          targetAudience: 'midcore RPG players',
          sellingPointFocus: 'launch rewards',
          hookApproach: 'benefit_first',
          hookOptions: ['Open on the reward reveal'],
          recommendedHook: 'Open on the reward reveal',
          cta: 'Download now',
          ctaType: 'direct_response',
          rationale: 'Lead with the live-ops reward moment before the CTA.',
          angle: 'Reward-first UA opener',
          tone: 'Fast-paced and payoff-first',
          assetNeeds: ['Reward splash frame'],
          riskNotes: ['Avoid fake urgency'],
          knowledgePackIds: ['pack_a'],
          marketTruth: ['Reward windows drive conversion spikes'],
          audienceTension: ['Players want proof before they click'],
          toneRules: ['Keep the payoff visible inside the first 2 seconds'],
          forbiddenClaims: ['No guaranteed SSR'],
          visualCues: ['Reward splash frame'],
          approvedAngles: ['Show the live-ops timing advantage'],
          hookCandidates: ['Start with the reward reveal'],
        }}
        creativeVariant={null}
        initialCreativeBrief={null}
      />
    </LocaleProvider>,
  );

  assert.match(html, /Applied knowledge|已应用知识/);
  assert.match(html, /Reward windows drive conversion spikes/);
  assert.match(html, /Players want proof before they click/);
  assert.match(html, /No guaranteed SSR/);
  assert.match(html, /pack/);
});
