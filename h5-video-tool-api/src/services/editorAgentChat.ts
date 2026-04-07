import { compassChatCompletion } from './promptPolish.js';

const CHAT_SYSTEM = `你是「COBS 剪辑工作台」里的对话助手，通过大模型与用户自然交流。

## 能力
- 用简洁、专业、友好的**中文**回答。
- 可说明：智能剪辑会先做素材分析/候选段，再用 Compass 剪辑模型生成时间轴；用户可在左侧勾选素材、在下方时间轴微调。
- 可回答剪辑概念、操作提示、耐心等待原因等。
- **不要**编造不存在的功能；不确定时建议用户直接描述剪辑需求（时长、内容、节奏）。

## 不要
- 不要输出 JSON、代码块包裹整段回复。
- 不要承诺具体等待秒数（除非用户问「一般要多久」，可答「通常约 1～3 分钟，视素材数量与服务器负载而定」这类范围）。`;

export async function runEditorAgentChat(userMessage: string): Promise<string> {
  const msg = userMessage.trim();
  if (!msg) {
    return '请说说你想了解的内容，或直接描述想怎么剪（例如时长、高光、节奏）。';
  }
  const raw = await compassChatCompletion({
    systemPrompt: CHAT_SYSTEM,
    userText: msg,
    temperature: 0.55,
    maxTokens: 1800,
  });
  const text = raw.trim();
  return text.length > 0 ? text : '我在。需要改时间轴时，直接说你的剪辑需求即可。';
}
