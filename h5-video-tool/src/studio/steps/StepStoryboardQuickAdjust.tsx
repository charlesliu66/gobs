import type { ProductionShot, StructuredPromptStill, StructuredPromptMotion } from '../productionTypes';

type Preset = {
  label: string;
  patch: Partial<StructuredPromptStill> & Partial<StructuredPromptMotion>;
};

const CAMERA_PRESETS: Preset[] = [
  { label: '固定机位', patch: { mp_camera: 'locked-off static shot' } },
  { label: '缓慢推进', patch: { mp_camera: 'slow dolly in' } },
  { label: '手持跟拍', patch: { mp_camera: 'handheld tracking shot, slight shake' } },
  { label: '航拍俯冲', patch: { mp_camera: 'aerial drone dive, top-down to eye level' } },
  { label: '360°环绕', patch: { mp_camera: '360° orbit around subject' } },
];

const TEMPO_PRESETS: Preset[] = [
  { label: '极慢', patch: { mp_tempo: 'very slow, contemplative' } },
  { label: '缓和', patch: { mp_tempo: 'gentle, moderate pace' } },
  { label: '标准', patch: { mp_tempo: 'normal pace' } },
  { label: '紧张', patch: { mp_tempo: 'fast, tense, urgent rhythm' } },
  { label: '极速', patch: { mp_tempo: 'rapid, frenetic, high energy' } },
];

const LIGHTING_PRESETS: Preset[] = [
  { label: '明亮自然', patch: { sp_lighting: 'bright natural daylight, soft diffused' } },
  { label: '金色暖光', patch: { sp_lighting: 'warm golden hour light, long shadows' } },
  { label: '阴暗低调', patch: { sp_lighting: 'low-key lighting, deep shadows, moody' } },
  { label: '高对比', patch: { sp_lighting: 'high contrast chiaroscuro, dramatic' } },
  { label: '霓虹冷光', patch: { sp_lighting: 'neon-lit, cool blue-purple ambient glow' } },
];

const DRAMA_PRESETS: Preset[] = [
  { label: '更戏剧化', patch: { sp_lighting: 'dramatic high contrast', mp_tempo: 'intense, dramatic beat', mp_camera: 'slow push-in to close-up' } },
  { label: '更安静', patch: { sp_lighting: 'soft, diffused, gentle', mp_tempo: 'very slow, contemplative', mp_camera: 'static wide shot' } },
  { label: '更快节奏', patch: { mp_tempo: 'fast cutting rhythm, high energy', mp_camera: 'dynamic tracking, quick pans' } },
];

function PresetGroup({ title, presets, activeValues, onApply }: {
  title: string;
  presets: Preset[];
  activeValues: Record<string, string | undefined>;
  onApply: (patch: Preset['patch']) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-medium text-[var(--color-text-muted)]">{title}</div>
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => {
          const isActive = Object.entries(p.patch).every(
            ([k, v]) => activeValues[k] === v,
          );
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onApply(p.patch)}
              className={`rounded-md border px-2 py-0.5 text-[10px] transition-colors ${
                isActive
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StepStoryboardQuickAdjust({
  shot,
  onPatchStructured,
}: {
  shot: ProductionShot;
  onPatchStructured: (patch: Partial<StructuredPromptStill> & Partial<StructuredPromptMotion>) => void;
}) {
  const activeValues: Record<string, string | undefined> = {
    mp_camera: shot.structuredMotion?.mp_camera,
    mp_tempo: shot.structuredMotion?.mp_tempo,
    sp_lighting: shot.structuredStill?.sp_lighting,
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2.5">
      <span className="text-xs font-medium text-[var(--color-text)]">快速调整</span>
      <PresetGroup title="运镜" presets={CAMERA_PRESETS} activeValues={activeValues} onApply={onPatchStructured} />
      <PresetGroup title="节奏" presets={TEMPO_PRESETS} activeValues={activeValues} onApply={onPatchStructured} />
      <PresetGroup title="光影" presets={LIGHTING_PRESETS} activeValues={activeValues} onApply={onPatchStructured} />
      <PresetGroup title="一键氛围" presets={DRAMA_PRESETS} activeValues={activeValues} onApply={onPatchStructured} />
    </div>
  );
}
