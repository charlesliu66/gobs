import { compassChatCompletion } from './promptPolish.js';

function extractJson(s: string): string {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) return m[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) return s.slice(start, end + 1);
  return s.trim();
}

const ROUTER_SYSTEM = `你是「剪辑工作台」里的意图路由器，只根据用户**当前这一条消息**判断类型。

请只输出一个 JSON 对象，不要 markdown 代码块标记，不要其它文字：
{"intent":"chat"|"edit"}

含义：
- **edit**：用户要求**改工程 / 剪视频 / 选高光 / 改时长画幅 / 混剪卡点 / 改时间轴上的片 / 导出成片**，或**以触发一次剪辑为主诉求**。
- **chat**：**提问、闲聊、问原理、问你怎么实现、确认理解、吐槽、解释概念**，**不要求**本条触发一次新的剪辑管线。

典型 **chat**：
- 「你是怎么实现剪辑的」「你用的什么模型」「解释一下」
- 「好的」「谢谢」「先别剪」

典型 **edit**：
- 「帮我把战斗剪成30秒」「配上高燃音乐剪出来」
- 「再短一点」「去掉第一段」

闲聊回复由独立对话模型生成，你**只负责分类**，不要输出 chatReply。`;

export type EditorAgentRouteResult = { intent: 'edit' } | { intent: 'chat' };

export async function routeEditorAgentMessage(userMessage: string): Promise<EditorAgentRouteResult> {
  const msg = userMessage.trim();
  if (!msg) {
    return { intent: 'chat' };
  }

  const raw = await compassChatCompletion({
    systemPrompt: ROUTER_SYSTEM,
    userText: msg,
    temperature: 0.1,
    maxTokens: 120,
  });

  try {
    const parsed = JSON.parse(extractJson(raw)) as { intent?: string };
    if (parsed.intent === 'edit') {
      return { intent: 'edit' };
    }
    if (parsed.intent === 'chat') {
      return { intent: 'chat' };
    }
  } catch {
    /* 解析失败则按剪辑任务处理，兼容旧行为 */
  }

  return { intent: 'edit' };
}
