/**
 * 判断用户是否在剪辑对话中表达了「需要 BGM / 配乐」意图（用于 Agent 成功后自动走 Lyria）。
 */
export function detectBgmIntent(userMessage: string): boolean {
  const t = userMessage.trim();
  if (!t) return false;
  if (/配乐|背景音乐|伴奏|插曲|ost\b|lyria|原声带/i.test(t)) return true;
  if (/\bbgm\b/i.test(t)) return true;
  if (/高燃.*(乐|曲|音乐)|燃.*(配乐|bgm)|战.*(配乐|音乐)|氛围.*(音乐|配乐)/i.test(t)) return true;
  if (/配上.*(音乐|配乐|bgm)|加.*(背景音乐|配乐)|来(一段|首).*音乐/i.test(t)) return true;
  if (/音乐/.test(t) && /剪|配|加|要|需要|生成|来|段|首|燃|战斗|高潮|氛围|视频/i.test(t)) return true;
  return false;
}
