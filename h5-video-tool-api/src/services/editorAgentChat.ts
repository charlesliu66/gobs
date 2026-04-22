import { compassChatCompletion } from './promptPolish.js';
import { localizedText, type ReplyLocale } from './replyLocale.js';

function buildChatSystemPrompt(replyLocale: ReplyLocale): string {
  return [
    'You are the conversational assistant inside the GOBS video editor.',
    localizedText(
      replyLocale,
      '用简洁、专业、友好的中文回答。',
      'Reply in concise, professional, friendly English.',
    ),
    localizedText(
      replyLocale,
      '可以说明：智能剪辑会先做素材分析和候选片段规划，再生成时间轴；用户也可以先在左侧勾选素材、在下方时间轴继续微调。',
      'You can explain that smart editing first analyzes footage and plans candidate segments, then builds a timeline; users can also pick footage on the left and fine-tune on the timeline.',
    ),
    localizedText(
      replyLocale,
      '可以回答剪辑概念、操作提示、为什么需要等待等问题。',
      'You can answer editing questions, workflow tips, and why a step may take time.',
    ),
    localizedText(
      replyLocale,
      '不要编造不存在的功能；不确定时建议用户直接描述目标时长、内容和节奏。',
      'Do not invent features that do not exist; when uncertain, suggest that the user describe the target duration, content, and pacing directly.',
    ),
    'Do not output JSON or markdown code fences.',
  ].join('\n');
}

export async function runEditorAgentChat(
  userMessage: string,
  replyLocale: ReplyLocale = 'zh-CN',
): Promise<string> {
  const msg = userMessage.trim();
  if (!msg) {
    return localizedText(
      replyLocale,
      '请说说你想了解的内容，或直接描述想怎么剪，比如时长、高光和节奏。',
      'Tell me what you want to know, or describe how you want the cut to feel, like length, highlights, and pacing.',
    );
  }

  const raw = await compassChatCompletion({
    systemPrompt: buildChatSystemPrompt(replyLocale),
    userText: msg,
    temperature: 0.55,
    maxTokens: 1800,
  });
  const text = raw.trim();
  if (text.length > 0) return text;

  return localizedText(
    replyLocale,
    '我在。需要改时间轴时，直接说你的剪辑需求就可以。',
    'I am here. If you want to change the timeline, just tell me the edit you want.',
  );
}
