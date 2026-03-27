/**
 * Prompt 模板 Schema
 * 用于 VEO 视频生成的模板配置
 */
export interface PromptTemplateConfig {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  duration: number;
  aspectRatio: string;
  pipelineMode: 'single' | 'multishot';
  /** single-shot: 输出单段英文 prompt 直供 VEO；multi-shot: 输出多镜头分镜 */
  outputMode: 'single-shot' | 'multi-shot';
  /** 注入 LLM 的模板专属说明 */
  systemPromptSuffix: string;
  defaultSearchKeywords?: string[];
  /** 短剧专用：剧情子模板，如猫猫后宫剧、隐藏大佬打脸 */
  storyPresets?: Array<{
    id: string;
    nameZh: string;
    description: string;
    /** 对应后端 templateId，用于 polish API */
    templateId: string;
    defaultPrompt: string;
  }>;
}
