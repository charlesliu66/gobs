import { useState, useCallback } from 'react';
import { apiPost } from '../api/client';
import { mockGenerateVideo } from '../api/mock/video';
import { generateMultishot } from '../api/video';
import type {
  VideoGenerateRequest,
  VideoGenerateResponse,
  MultishotGenerateRequest,
  MultishotGenerateResponse,
} from '../api/video';

const useMock = import.meta.env.VITE_USE_MOCK_VIDEO !== 'false';

export function useVideoGenerate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (_req: VideoGenerateRequest): Promise<VideoGenerateResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = useMock
          ? await mockGenerateVideo()
          : await apiPost<VideoGenerateResponse>('/api/video/generate', _req);
        return res;
      } catch (e) {
        setError(e instanceof Error ? e.message : '生成视频失败');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const generateMultishotFn = useCallback(
    async (req: MultishotGenerateRequest): Promise<MultishotGenerateResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        if (useMock) {
          const mock = await mockGenerateVideo();
          return mock ? { status: 'completed', videoUrl: mock.videoUrl ?? '' } : null;
        }
        return await generateMultishot(req);
      } catch (e) {
        setError(e instanceof Error ? e.message : '多镜头视频生成失败');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return { generate, generateMultishot: generateMultishotFn, loading, error, clearError, useMock };
}
