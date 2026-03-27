import { useState, useCallback } from 'react';
import { apiPost } from '../api/client';
import { mockGenerateStoryboard } from '../api/mock/prompt';
import type { PromptGenerateRequest, PromptGenerateResponse } from '../api/prompt';

const useMock = import.meta.env.VITE_USE_MOCK_PROMPT !== 'false';

export function useStoryboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (req: PromptGenerateRequest): Promise<PromptGenerateResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = useMock
          ? await mockGenerateStoryboard(req)
          : await apiPost<PromptGenerateResponse>('/api/prompt/generate', req);
        return res;
      } catch (e) {
        setError(e instanceof Error ? e.message : '生成分镜失败');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return { generate, loading, error, clearError, useMock };
}
