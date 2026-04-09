import { Router } from 'express';
import { getEditorAssetAbsolutePath } from './editorAssets.js';
import { analyzeSingleAssetVideo, parseEditorVisionFocusBody, resolveEditorAnalysisMode, } from '../services/video/editorVideoAnalysis.js';
import { analyzeBeatOnsetCuts } from '../services/video/musicBeatOnsets.js';
const router = Router();
router.post('/analyze/video', async (req, res) => {
    const body = req.body;
    const assetId = typeof body.assetId === 'string' ? body.assetId.trim() : '';
    if (!assetId) {
        res.status(400).json({ error: '请提供 assetId' });
        return;
    }
    const abs = getEditorAssetAbsolutePath(assetId);
    if (!abs) {
        res.status(404).json({ error: '素材不存在或未在本机上传会话中' });
        return;
    }
    const durationSec = typeof body.durationSec === 'number' && Number.isFinite(body.durationSec) && body.durationSec > 0
        ? Math.min(body.durationSec, 36000)
        : 120;
    const target = typeof body.targetTimelineSec === 'number' && Number.isFinite(body.targetTimelineSec)
        ? Math.min(Math.max(body.targetTimelineSec, 1), 600)
        : 30;
    const userIntent = typeof body.userIntent === 'string' ? body.userIntent : '';
    let mode = resolveEditorAnalysisMode();
    if (typeof body.mode === 'string' && body.mode.trim()) {
        const m = body.mode.trim().toLowerCase();
        if (m === 'off' || m === 'audio' || m === 'vision' || m === 'hybrid') {
            mode = m;
        }
    }
    const visionFocus = parseEditorVisionFocusBody(body.visionFocus);
    try {
        const analyzed = await analyzeSingleAssetVideo(abs, assetId, durationSec, mode, userIntent, target, undefined, visionFocus);
        const payload = {
            assetId,
            mode,
            targetTimelineSec: target,
            candidateWindows: analyzed.windows,
            candidateCount: analyzed.windows.length,
        };
        if (visionFocus) {
            payload.visionFocus = visionFocus;
        }
        if (analyzed.visionDetail?.focus) {
            payload.visionFocusResolved = analyzed.visionDetail.focus;
            if (analyzed.visionDetail.focus.fromAutoEnv) {
                payload.visionFocusAutoApplied = true;
            }
        }
        if (body.includeVisionScores === true && analyzed.visionDetail) {
            payload.visionScores = analyzed.visionDetail.scores;
            payload.visionMeta = analyzed.visionDetail.meta;
        }
        if (body.includeBeats === true) {
            payload.beatCutPointsSec = await analyzeBeatOnsetCuts(abs, Math.min(900, durationSec));
        }
        res.json(payload);
    }
    catch (e) {
        console.error('[editor/analyze/video]', e);
        res.status(500).json({ error: e instanceof Error ? e.message : '分析失败' });
    }
});
router.get('/analyze/health', (_req, res) => {
    res.json({
        editorAnalysisMode: resolveEditorAnalysisMode(),
        hint: 'EDITOR_ANALYSIS_MODE=off|audio|vision|hybrid；hybrid=音频 RMS 候选 + 抽帧 Gemini 候选后合并',
        visionAutoFocus: '长素材且未传 visionFocus 时，可设 EDITOR_VISION_AUTO_FOCUS=1 自动音频缩窗（见 .env.example）',
    });
});
export default router;
