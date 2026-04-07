import { useCallback, useMemo, useRef, useState } from 'react';
import type { CharacterSheet } from '../../studio/productionTypes';
import {
  ensureCharacterLookTree,
  layoutCharacterLookTree,
  setCharacterActiveLook,
} from '../../studio/productionAssets';
import { getPortraitJobKey, type PortraitEditIntent, type PortraitJobState } from './portraitJobKey';

const NODE_W = 112;
const NODE_H = 140;

interface CharacterLookTreeCanvasProps {
  characterSheet: CharacterSheet;
  /** 与 CharacterPortraitEditorModal / 父组件 portraitJobs 一致 */
  characterSheetId: string;
  portraitJobs: Record<string, PortraitJobState | undefined>;
  onSheetChange: (next: CharacterSheet) => void;
  onRequestPortrait: (intent: PortraitEditIntent) => void;
}

function PortraitNodeOverlay({
  job,
}: {
  job: PortraitJobState | undefined;
}) {
  if (!job) return null;
  if (job.status === 'generating') {
    return (
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-black/60">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <span className="px-1 text-center text-[8px] leading-tight text-white">生成中</span>
      </div>
    );
  }
  if (job.status === 'error') {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-950/70 p-1">
        <span className="text-center text-[8px] leading-tight text-red-100">失败</span>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 z-10 overflow-hidden">
      <img src={job.previewDataUrl} alt="" className="h-full w-full object-cover" />
      <div className="absolute bottom-0 left-0 right-0 bg-amber-600/90 py-0.5 text-center text-[8px] font-medium text-white">
        待确认
      </div>
    </div>
  );
}

export function CharacterLookTreeCanvas({
  characterSheet,
  characterSheetId,
  portraitJobs,
  onSheetChange,
  onRequestPortrait,
}: CharacterLookTreeCanvasProps) {
  const sheet = useMemo(() => ensureCharacterLookTree(characterSheet), [characterSheet]);
  const nodes = sheet.lookTree ?? [];
  const { positions, bounds } = useMemo(() => layoutCharacterLookTree(nodes), [nodes]);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const activeId = sheet.activeLookId;

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale((s) => Math.min(2.2, Math.max(0.35, s + delta)));
  }, []);

  const onPointerDownBg = useCallback((e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  }, [pan]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      setPan({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y });
    },
    [],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const edges = useMemo(() => {
    const list: { from: string; to: string }[] = [];
    for (const n of nodes) {
      if (n.parentId) list.push({ from: n.parentId, to: n.id });
    }
    return list;
  }, [nodes]);

  const setActive = (nodeId: string) => {
    onSheetChange(setCharacterActiveLook(sheet, nodeId));
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">形象演化树</h3>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            根节点在上，向下分支。点击卡片设为定稿；「分支」基于父节点继续迭代生图。
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
          <button
            type="button"
            className="rounded border border-[var(--color-border)] px-2 py-1 hover:bg-[var(--color-surface-hover)]"
            onClick={() => setScale((s) => Math.min(2.2, s + 0.15))}
          >
            +
          </button>
          <button
            type="button"
            className="rounded border border-[var(--color-border)] px-2 py-1 hover:bg-[var(--color-surface-hover)]"
            onClick={() => setScale((s) => Math.max(0.35, s - 0.15))}
          >
            −
          </button>
          <button
            type="button"
            className="rounded border border-[var(--color-border)] px-2 py-1 hover:bg-[var(--color-surface-hover)]"
            onClick={() => {
              setScale(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            复位
          </button>
        </div>
      </div>

      <div
        className="relative h-[min(420px,55vh)] cursor-grab overflow-hidden bg-[var(--color-surface-elevated)] active:cursor-grabbing"
        onWheel={onWheel}
        onPointerDown={onPointerDownBg}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          className="absolute left-1/2 top-1/2 origin-center will-change-transform"
          style={{
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${scale})`,
            width: bounds.w,
            height: bounds.h,
          }}
        >
          <svg
            width={bounds.w}
            height={bounds.h}
            className="pointer-events-none absolute left-0 top-0 text-[var(--color-border)]"
            aria-hidden
          >
            {edges.map(({ from, to }) => {
              const a = positions.get(from);
              const b = positions.get(to);
              if (!a || !b) return null;
              const y1 = a.cy + NODE_H / 2;
              const y2 = b.cy - NODE_H / 2;
              return (
                <path
                  key={`${from}-${to}`}
                  d={`M ${a.cx} ${y1} L ${b.cx} ${y2}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  opacity={0.55}
                />
              );
            })}
          </svg>

          {nodes.map((n) => {
            const p = positions.get(n.id);
            if (!p) return null;
            const isActive = activeId === n.id;
            return (
              <div
                key={n.id}
                className="absolute flex flex-col items-stretch overflow-hidden rounded-lg border bg-[var(--color-surface)] shadow-md ring-1 transition-shadow"
                style={{
                  left: p.cx - NODE_W / 2,
                  top: p.cy - NODE_H / 2,
                  width: NODE_W,
                  height: NODE_H,
                  zIndex: 2,
                  borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                  boxShadow: isActive ? '0 0 0 2px color-mix(in srgb, var(--color-primary) 35%, transparent)' : undefined,
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="relative h-[calc(100%-52px)] w-full bg-black/90">
                  {n.imageDataUrl ? (
                    <img src={n.imageDataUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[9px] text-white/50">未生成</div>
                  )}
                  <PortraitNodeOverlay
                    job={
                      portraitJobs[getPortraitJobKey(characterSheetId, { mode: 'replace', nodeId: n.id })] ??
                      portraitJobs[getPortraitJobKey(characterSheetId, { mode: 'branch', parentNodeId: n.id })]
                    }
                  />
                  {isActive && (
                    <span className="absolute left-1 top-1 z-[11] rounded bg-[var(--color-primary)] px-1.5 py-0.5 text-[8px] text-white">
                      定稿
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-center gap-0.5 border-t border-[var(--color-border)] p-1">
                  <p className="truncate text-center text-[9px] font-medium text-[var(--color-text)]" title={n.label}>
                    {n.label}
                  </p>
                  <div className="flex flex-wrap justify-center gap-0.5">
                    <button
                      type="button"
                      className="rounded bg-[var(--color-primary)]/15 px-1 py-0.5 text-[8px] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/25"
                      onClick={() => setActive(n.id)}
                    >
                      定稿
                    </button>
                    <button
                      type="button"
                      className="rounded bg-[var(--color-surface-hover)] px-1 py-0.5 text-[8px] text-[var(--color-text)] ring-1 ring-[var(--color-border)]"
                      onClick={() => onRequestPortrait({ mode: 'replace', nodeId: n.id })}
                    >
                      重绘
                    </button>
                    <button
                      type="button"
                      className="rounded bg-violet-500/15 px-1 py-0.5 text-[8px] text-violet-300 ring-1 ring-violet-500/30"
                      onClick={() => onRequestPortrait({ mode: 'branch', parentNodeId: n.id })}
                    >
                      分支
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
