import React from 'react';
import type { CampaignKnowledgePack } from '../../api/campaignKnowledge';

void React;

const PACK_TYPE_LABELS: Record<CampaignKnowledgePack['type'], string> = {
  brand_tone: 'Brand Tone',
  brand_compliance: 'Compliance',
  visual_style: 'Visual Style',
  market_fundamentals: 'Market Truth',
  user_persona: 'Persona',
  live_ops_calendar: 'Live Ops Calendar',
  live_ops_history: 'Live Ops History',
  selling_point_playbook: 'Selling Point Playbook',
};

function statusClass(status: CampaignKnowledgePack['status']): string {
  if (status === 'ready') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
  if (status === 'archived') return 'border-slate-500/25 bg-slate-500/10 text-slate-300';
  return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
}

export function CampaignKnowledgePackCard({ pack }: { pack: CampaignKnowledgePack }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
            {PACK_TYPE_LABELS[pack.type]}
          </div>
          <div className="mt-2 text-base font-semibold text-[var(--color-text)]">{pack.title}</div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(pack.status)}`}>
          {pack.status}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{pack.summary}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--color-text-subtle)]">
        <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">
          facts {pack.facts.length}
        </span>
        <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">
          hooks {pack.hookSeeds.length}
        </span>
        <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">
          avoid {pack.avoid.length}
        </span>
        <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">
          cues {pack.visualCues.length}
        </span>
      </div>

      {pack.hookSeeds.length > 0 ? (
        <div className="mt-4 rounded-xl bg-white/4 px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
            Hook Seeds
          </div>
          <div className="mt-2 text-sm leading-6 text-[var(--color-text)]">{pack.hookSeeds.slice(0, 2).join(' · ')}</div>
        </div>
      ) : null}
    </div>
  );
}
