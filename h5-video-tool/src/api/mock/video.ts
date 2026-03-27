import type { VideoGenerateResponse } from '../video';

const MOCK_DELAY_MS = 3000;
const MOCK_VIDEO_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export async function mockGenerateVideo(): Promise<VideoGenerateResponse> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
  return {
    taskId: `mock-task-${Date.now()}`,
    status: 'completed',
    videoUrl: MOCK_VIDEO_URL,
    estimatedTime: 120,
  };
}
