export interface PromptGenerateRequest {
  prompt: string;
  materials: { id: string; name: string }[];
  duration?: number;
  aspectRatio?: string;
}

export interface PromptGenerateResponse {
  storyboardText: string;
}
