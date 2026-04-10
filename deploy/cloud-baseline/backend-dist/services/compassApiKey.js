/**
 * Compass Veo：VEO3 与 VEO2 可能绑定不同 API Key（组织策略）。
 * 当模型 id 含 veo-3 时使用 COMPASS_API_KEY2，否则使用 COMPASS_API_KEY。
 */
function isVeo3Model(model) {
    return /veo-3/i.test(model.trim());
}
/**
 * 根据 Veo 模型名选择 Compass API Key。
 * - veo-3.x → 优先 COMPASS_API_KEY2，未配置则回退 COMPASS_API_KEY
 * - 其他 → COMPASS_API_KEY
 */
export function resolveCompassApiKeyForVeoModel(model) {
    const m = (model ?? process.env.COMPASS_VIDEO_MODEL ?? '').trim();
    const key1 = process.env.COMPASS_API_KEY?.trim() ?? '';
    const key2 = process.env.COMPASS_API_KEY2?.trim() ?? '';
    if (isVeo3Model(m)) {
        if (key2)
            return key2;
        if (key1)
            return key1;
        throw new Error('VEO3 模型需要配置 COMPASS_API_KEY2（或回退用 COMPASS_API_KEY），请在 .env 中设置');
    }
    if (key1)
        return key1;
    throw new Error('COMPASS_API_KEY 未配置，请在 .env 中设置');
}
/**
 * 分镜图（Imagen）等：默认优先 COMPASS_API_KEY（key1），未配置则回退 COMPASS_API_KEY2（key2）。
 */
export function resolveCompassApiKeyPreferKey2() {
    const key1 = process.env.COMPASS_API_KEY?.trim() ?? '';
    const key2 = process.env.COMPASS_API_KEY2?.trim() ?? '';
    if (key1)
        return key1;
    if (key2)
        return key2;
    throw new Error('COMPASS_API_KEY2 或 COMPASS_API_KEY 未配置（LLM/分镜图需至少一把 Compass Key）');
}
/**
 * 分镜图（Imagen）等：按优先级返回可用 Key 列表（去重）。
 * 默认顺序：KEY1 -> KEY2。
 */
export function resolveCompassApiKeyCandidatesPreferKey2() {
    const key1 = process.env.COMPASS_API_KEY?.trim() ?? '';
    const key2 = process.env.COMPASS_API_KEY2?.trim() ?? '';
    const out = [];
    if (key1)
        out.push(key1);
    if (key2 && key2 !== key1)
        out.push(key2);
    if (out.length === 0) {
        throw new Error('COMPASS_API_KEY2 或 COMPASS_API_KEY 未配置（LLM/分镜图需至少一把 Compass Key）');
    }
    return out;
}
/**
 * Gemini 文本（一键 Prompt / 文案）：优先 COMPASS_API_KEY（多为全量 Gemini 权限），
 * KEY2 常为 Veo 专用、无 chat 权限。未配置 KEY1 时再回退 KEY2。
 */
export function resolveCompassApiKeyForGeminiChat() {
    const key1 = process.env.COMPASS_API_KEY?.trim() ?? '';
    const key2 = process.env.COMPASS_API_KEY2?.trim() ?? '';
    if (key1)
        return key1;
    if (key2)
        return key2;
    throw new Error('COMPASS_API_KEY 或 COMPASS_API_KEY2 未配置（Gemini 文本需至少一把 Compass Key）');
}
