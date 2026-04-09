/**
 * 与前端 `h5-video-tool/src/editor/types/timeline.ts` 字段保持一致。
 */
const PRESET_TO_SIZE = {
    '9:16': { width: 1080, height: 1920 },
    '16:9': { width: 1920, height: 1080 },
    '1:1': { width: 1080, height: 1080 },
    '4:3': { width: 1440, height: 1080 },
};
export function resolutionForPreset(preset) {
    return { ...PRESET_TO_SIZE[preset] };
}
