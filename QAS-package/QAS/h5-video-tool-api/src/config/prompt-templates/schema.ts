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
}
