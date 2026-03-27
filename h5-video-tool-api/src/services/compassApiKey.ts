/**
 * Compass Veo：VEO3 与 VEO2 可能绑定不同 API Key（组织策略）。
 * 当模型 id 含 veo-3 时使用 COMPASS_API_KEY2，否则使用 COMPASS_API_KEY。
 */
function isVeo3Model(model: string): boolean {
  return /veo-3/i.test(model.trim());
}

/**
 * 根据 Veo 模型名选择 Compass API Key。
 * - veo-3.x → 优先 COMPASS_API_KEY2，未配置则回退 COMPASS_API_KEY
 * - 其他 → COMPASS_API_KEY
 */
export function resolveCompassApiKeyForVeoModel(model?: string): string {
  const m = (model ?? process.env.COMPASS_VIDEO_MODEL ?? '').trim();
  const key1 = process.env.COMPASS_API_KEY?.trim() ?? '';
  const key2 = process.env.COMPASS_API_KEY2?.trim() ?? '';

  if (isVeo3Model(m)) {
    if (key2) return key2;
    if (key1) return key1;
    throw new Error('VEO3 模型需要配置 COMPASS_API_KEY2（或回退用 COMPASS_API_KEY），请在 .env 中设置');
  }

  if (key1) return key1;
  throw new Error('COMPASS_API_KEY 未配置，请在 .env 中设置');
}
