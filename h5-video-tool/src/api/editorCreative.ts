import { redirectToLogin } from './client';
import type {
  ApplyEditorAgentResponse,
  EditorAgentJobProgress,
  EditorVisionFocus,
} from './editor';
import type { AspectRatioPreset, TimelineProject } from '../editor/types/timeline';
import {
  normalizeEditorCreativeBriefForRequest,
  type EditorCreativeBrief,
  type EditorCreativeMode,
  type EditorCreativeStrategy,
} from '../editor/utils/editorCreativeBrief';

const BASE = (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL || '';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('gobs_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleUnauthorized(res: Response): void {
  if (res.status === 401) {
    redirectToLogin();
  }
}

export interface ApplyEditorCreativeAgentBody {
  userMessage?: string;
  aspectRatio: AspectRatioPreset;
  selectedAssetIds: string[];
  assets: Array<{ id: string; originalName: string; durationSec: number }>;
  currentProject: TimelineProject;
  creativeBrief?: EditorCreativeBrief;
  visionFocus?: EditorVisionFocus;
}

export interface ApplyEditorCreativeAgentResponse extends ApplyEditorAgentResponse {
  creativeStrategy?: EditorCreativeStrategy;
}

export {
  normalizeEditorCreativeBriefForRequest,
  type EditorCreativeBrief,
  type EditorCreativeMode,
  type EditorCreativeStrategy,
};

export async function applyEditorAgentCreativeStream(
  body: ApplyEditorCreativeAgentBody,
  onProgress: (progress: EditorAgentJobProgress) => void,
  signal?: AbortSignal,
): Promise<ApplyEditorCreativeAgentResponse> {
  const res = await fetch(`${BASE}/api/editor/agent/apply-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
    signal,
  });

  handleUnauthorized(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  if (!res.body) {
    throw new Error('Server did not return a streaming response');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: ApplyEditorCreativeAgentResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const rawBlock of chunks) {
      const block = rawBlock.trim();
      if (!block) continue;
      const dataLine = block
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.startsWith('data:'));
      if (!dataLine) continue;

      const jsonStr = dataLine.startsWith('data:') ? dataLine.slice(5).trim() : dataLine;
      let payload: {
        type?: string;
        stage?: string;
        percent?: number;
        message?: string;
        etaSec?: number;
        summary?: string;
        project?: TimelineProject;
        llmUsage?: ApplyEditorAgentResponse['llmUsage'];
        creativeStrategy?: EditorCreativeStrategy;
        error?: string;
      };

      try {
        payload = JSON.parse(jsonStr) as typeof payload;
      } catch {
        continue;
      }

      if (payload.type === 'progress' && payload.percent != null && payload.message) {
        onProgress({
          stage: payload.stage ?? 'progress',
          percent: payload.percent,
          message: payload.message,
          etaSec: payload.etaSec,
        });
      }

      if (payload.type === 'done' && payload.project) {
        finalResult = {
          summary: payload.summary ?? '',
          project: payload.project,
          llmUsage: payload.llmUsage,
          creativeStrategy: payload.creativeStrategy,
        };
      }

      if (payload.type === 'error') {
        throw new Error(payload.error || 'Creative agent task failed');
      }
    }
  }

  if (!finalResult) {
    throw new Error('Stream ended before the creative result arrived');
  }

  return finalResult;
}
