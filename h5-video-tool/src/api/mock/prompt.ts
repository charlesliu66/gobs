import type { PromptGenerateRequest, PromptGenerateResponse } from '../prompt';

const MOCK_DELAY_MS = 800;

export async function mockGenerateStoryboard(
  _req: PromptGenerateRequest
): Promise<PromptGenerateResponse> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
  return {
    storyboardText: `【原创数字艺术作品】
【风格】暗黑动作，3D 渲染风格，Cinematic，8K，电影感。
【时长】5秒

[00:00-00:02] 镜头1：定格（特写，固定）。
角色持武器站立，逆光剪影，暗调光影。

[00:02-00:05] 镜头2：奔跑（中景跟拍）。
向前奔跑，镜头跟拍，刀光剑影，收势。
适合全年龄段观看，无版权争议，无敏感元素。`,
  };
}
