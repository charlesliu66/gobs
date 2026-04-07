import type { ReactNode } from 'react';
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels';
import type { AspectRatioPreset } from '../types/timeline';
import { resolutionForPreset } from '../types/timeline';

const ASPECT_OPTIONS: { value: AspectRatioPreset; label: string }[] = [
  { value: '9:16', label: '9:16 竖屏' },
  { value: '16:9', label: '16:9 横屏' },
  { value: '1:1', label: '1:1 方屏' },
  { value: '4:3', label: '4:3' },
];

function HandleCol() {
  return (
    <Separator className="group relative flex w-2 flex-shrink-0 items-center justify-center bg-[var(--color-border)] transition-colors hover:bg-[var(--color-primary)]/25 data-[separator]:cursor-col-resize" />
  );
}

function HandleRow() {
  return (
    <Separator className="group relative flex h-2 flex-shrink-0 items-center justify-center bg-[var(--color-border)] transition-colors hover:bg-[var(--color-primary)]/25 data-[separator]:cursor-row-resize" />
  );
}

interface EditorShellProps {
  aspectRatio: AspectRatioPreset;
  onAspectRatioChange: (v: AspectRatioPreset) => void;
  /** 左上：视频素材（与中间「预览」同一垂直比例） */
  materialsPanel: ReactNode;
  /** 左下：配乐生成（与中间「时间轴」同一垂直比例，高度对齐） */
  musicPanel: ReactNode;
  previewPanel: ReactNode;
  agentPanel: ReactNode;
  timelinePanel: ReactNode;
  topBarExtra?: ReactNode;
}

export function EditorShell({
  aspectRatio,
  onAspectRatioChange,
  materialsPanel,
  musicPanel,
  previewPanel,
  agentPanel,
  timelinePanel,
  topBarExtra,
}: EditorShellProps) {
  const res = resolutionForPreset(aspectRatio);
  const storage = typeof localStorage !== 'undefined' ? localStorage : undefined;
  const colsLayout = useDefaultLayout({
    id: 'h5-editor-cols-v2',
    storage,
    panelIds: ['col-media', 'col-preview', 'col-agent'],
  });
  /** 中间列：上预览、下时间轴 */
  const centerLayout = useDefaultLayout({
    id: 'h5-editor-center-v1',
    storage,
    panelIds: ['center-preview', 'center-timeline'],
  });
  /** 左侧列：上素材、下配乐 — default 与中间列一致，便于与时间轴视觉对齐 */
  const leftLayout = useDefaultLayout({
    id: 'h5-editor-left-v1',
    storage,
    panelIds: ['left-materials', 'left-music'],
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-0">
      <header className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-[var(--color-text)]">剪辑工作台</h1>
          <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span>画幅</span>
            <select
              value={aspectRatio}
              onChange={(e) => onAspectRatioChange(e.target.value as AspectRatioPreset)}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[var(--color-text)]"
            >
              {ASPECT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <span className="hidden font-mono text-[10px] text-[var(--color-text-muted)] sm:inline">
            导出 {res.width}×{res.height}
          </span>
        </div>
        {topBarExtra}
      </header>

      <Group
        orientation="horizontal"
        id="h5-editor-cols"
        className="min-h-0 flex-1"
        defaultLayout={colsLayout.defaultLayout}
        onLayoutChanged={colsLayout.onLayoutChanged}
      >
        <Panel id="col-media" defaultSize="24%" minSize={10} className="min-h-0 min-w-0 overflow-hidden">
          <Group
            orientation="vertical"
            id="h5-editor-left"
            className="h-full min-h-0 min-w-0"
            defaultLayout={leftLayout.defaultLayout}
            onLayoutChanged={leftLayout.onLayoutChanged}
          >
            <Panel id="left-materials" defaultSize="58%" minSize={18} className="min-h-0 overflow-hidden">
              <div className="h-full min-h-0 overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-surface)]">
                {materialsPanel}
              </div>
            </Panel>
            <HandleRow />
            <Panel id="left-music" defaultSize="42%" minSize={14} className="min-h-0 overflow-hidden">
              <div className="h-full min-h-0 overflow-hidden border-r border-[var(--color-border)] border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                {musicPanel}
              </div>
            </Panel>
          </Group>
        </Panel>
        <HandleCol />
        <Panel id="col-preview" defaultSize="48%" minSize={28} className="min-h-0 min-w-0 overflow-hidden">
          <Group
            orientation="vertical"
            id="h5-editor-center"
            className="h-full min-h-0 min-w-0"
            defaultLayout={centerLayout.defaultLayout}
            onLayoutChanged={centerLayout.onLayoutChanged}
          >
            <Panel id="center-preview" defaultSize="58%" minSize={22} className="min-h-0 overflow-hidden">
              <div className="h-full min-h-0 overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-surface)]">
                {previewPanel}
              </div>
            </Panel>
            <HandleRow />
            <Panel id="center-timeline" defaultSize="42%" minSize={14} className="min-h-0 overflow-hidden">
              <div className="h-full min-h-0 overflow-hidden border-r border-[var(--color-border)] border-t border-[var(--color-border)]">
                {timelinePanel}
              </div>
            </Panel>
          </Group>
        </Panel>
        <HandleCol />
        <Panel id="col-agent" defaultSize="28%" minSize={12} className="min-h-0 min-w-0 overflow-hidden">
          <div className="h-full min-h-0 overflow-hidden bg-[var(--color-surface)]">{agentPanel}</div>
        </Panel>
      </Group>
    </div>
  );
}
