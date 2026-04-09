import path from 'path';
/**
 * 数据根目录：上传、默认视频输出、即梦缓存等。
 * 生产环境可挂载独立云盘，例如 API_DATA_DIR=/data/qas
 * 未设置时与旧版一致：使用进程 cwd。
 */
export function getApiDataDir() {
    const raw = process.env.API_DATA_DIR?.trim();
    if (raw)
        return path.resolve(raw);
    return process.cwd();
}
/**
 * 默认视频输出目录：VIDEO_OUTPUT_DIR 优先，否则为 <API_DATA_DIR>/output
 */
export function getDefaultVideoOutputDir() {
    const env = process.env.VIDEO_OUTPUT_DIR?.trim();
    if (env)
        return path.resolve(env);
    return path.join(getApiDataDir(), 'output');
}
/** 上传目录片段，如 getUploadsPath('editor')、getUploadsPath('editor', 'music') */
export function getUploadsPath(...segments) {
    return path.join(getApiDataDir(), 'uploads', ...segments);
}
