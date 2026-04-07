import { useState } from 'react';
import type { TextClip, TextPresetId } from '../types/timeline';
import { TEXT_PRESETS } from '../textPresets';
import { TextPresetPicker } from './TextOverlayRenderer';

interface TextClipEditorProps {
  clip: TextClip | null;
  onUpdate: (updated: TextClip) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function TextClipEditor({ clip, onUpdate, onDelete, onClose }: TextClipEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!clip) {
    return (
      <div className="flex items-center justify-center h-full text-[10px] text-[var(--color-text-muted)] p-4 text-center">
        点击文字轨上的片段选中，或点「片头」「+ 字幕」「片尾」添加
      </div>
    );
  }

  const preset = TEXT_PRESETS.find((p) => p.id === clip.presetId);

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto">
      {/* 顶部：版式选择 + 删除 */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] text-xs hover:border-[var(--color-primary)]/40 transition-colors"
          >
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ background: preset?.previewBg || '#333' }}
            />
            <span className="text-[var(--color-text)]">{preset?.label ?? clip.presetId}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {pickerOpen && (
            <TextPresetPicker
              selected={clip.presetId}
              onSelect={(id: TextPresetId) => {
                onUpdate({ ...clip, presetId: id });
                setPickerOpen(false);
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            onDelete(clip.id);
            onClose();
          }}
          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="删除此文字片段"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
          </svg>
        </button>
      </div>

      {/* 文案编辑 */}
      <div className="space-y-2">
        <div>
          <label className="block text-[9px] text-[var(--color-text-muted)] mb-0.5 uppercase tracking-wide">
            主文案
          </label>
          <input
            value={clip.text}
            onChange={(e) => onUpdate({ ...clip, text: e.target.value })}
            placeholder="输入文案"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:border-[var(--color-primary)]/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[9px] text-[var(--color-text-muted)] mb-0.5 uppercase tracking-wide">
            副文案（可选）
          </label>
          <input
            value={clip.subtext ?? ''}
            onChange={(e) => onUpdate({ ...clip, subtext: e.target.value || undefined })}
            placeholder="副标题、备注等"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:border-[var(--color-primary)]/50 focus:outline-none"
          />
        </div>
      </div>

      {/* 时间范围 */}
      <div>
        <label className="block text-[9px] text-[var(--color-text-muted)] mb-1 uppercase tracking-wide">
          时间范围（秒）
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            min="0"
            value={clip.timelineStart.toFixed(1)}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v) && v < clip.timelineEnd) onUpdate({ ...clip, timelineStart: v });
            }}
            className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 font-mono text-[10px] text-[var(--color-text)] focus:outline-none"
          />
          <span className="text-[var(--color-text-muted)] text-xs">→</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={clip.timelineEnd.toFixed(1)}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v) && v > clip.timelineStart) onUpdate({ ...clip, timelineEnd: v });
            }}
            className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 font-mono text-[10px] text-[var(--color-text)] focus:outline-none"
          />
        </div>
        <p className="text-[9px] text-[var(--color-text-subtle)] mt-0.5">
          时长 {(clip.timelineEnd - clip.timelineStart).toFixed(1)}s
        </p>
      </div>
    </div>
  );
}
