/** 匹配 [00:00-00:03] 镜头1：名称（景别，运镜）。描述... */
const SHOT_REGEX = /\[(\d{2}):(\d{2})-(\d{2}):(\d{2})\]\s*镜头\d+[：:]\s*(.+?)[。.]([\s\S]*?)(?=\[\d{2}:\d{2}-\d{2}:\d{2}\]|$)/g;
export function parseStoryboard(storyboardText) {
    const shots = [];
    const text = storyboardText.trim();
    let m;
    SHOT_REGEX.lastIndex = 0;
    while ((m = SHOT_REGEX.exec(text)) !== null) {
        const startMin = parseInt(m[1], 10);
        const startSecPart = parseInt(m[2], 10);
        const endMin = parseInt(m[3], 10);
        const endSecPart = parseInt(m[4], 10);
        const startSec = startMin * 60 + startSecPart;
        const endSec = endMin * 60 + endSecPart;
        const durationSeconds = Math.max(1, endSec - startSec);
        const namePart = m[5].trim();
        const descPart = m[6].trim();
        const fullPrompt = `${namePart}。${descPart}`.replace(/\s+/g, ' ').trim();
        shots.push({
            index: shots.length,
            timeRange: `${m[1]}:${m[2]}-${m[3]}:${m[4]}`,
            startSec,
            endSec,
            durationSeconds,
            name: namePart.split('（')[0].trim() || `镜头${shots.length + 1}`,
            prompt: fullPrompt,
        });
    }
    return shots;
}
/**
 * 若分镜解析为空（单镜头或非标准格式），返回单镜头
 */
export function parseOrSingleShot(storyboardText, fallbackPrompt) {
    const shots = parseStoryboard(storyboardText);
    if (shots.length > 0)
        return shots;
    const prompt = fallbackPrompt || storyboardText.replace(/\s+/g, ' ').trim() || '场景描述';
    return [
        {
            index: 0,
            timeRange: '00:00-00:05',
            startSec: 0,
            endSec: 5,
            durationSeconds: 5,
            name: '主镜头',
            prompt,
        },
    ];
}
