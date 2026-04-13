import axios from 'axios';
import type { KlingRefVideo } from './klingVideo.js';
import {
  isResolvableSocialVideoPageUrl,
  prepareSocialVideoUrlForKling,
  resolveSocialPageToDirectVideoUrl,
} from './tiktokResolveVideoUrl.js';

export async function fetchDriveImageAsBase64(
  fileId: string,
  mimeType: string | undefined,
  driveToken: string,
): Promise<{ base64: string; mimeType: string } | null> {
  const headers = { Authorization: `Bearer ${driveToken}` };
  const opts = { responseType: 'arraybuffer' as const, timeout: 15000 };
  try {
    const { data, status } = await axios.get<ArrayBuffer>(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
      {
        params: { alt: 'media', supportsAllDrives: true },
        ...opts,
        headers,
        validateStatus: (s) => s < 500,
      },
    );
    if (status >= 400) return null;
    const mime = mimeType?.startsWith('image/') ? mimeType : 'image/png';
    const base64 = Buffer.from(data).toString('base64');
    return { base64, mimeType: mime };
  } catch {
    return null;
  }
}

export async function resolveFirstDriveImageIfMissing(
  imageBase64: string | undefined,
  imageMimeType: string | undefined,
  driveToken: string | undefined,
  materials: { id: string; name: string; mimeType?: string }[] | undefined,
): Promise<{ imageBase64?: string; imageMimeType?: string }> {
  if (imageBase64?.trim()) return { imageBase64, imageMimeType };
  if (!driveToken || !materials?.length) return { imageBase64, imageMimeType };
  const firstImage = materials.find((x) => x.mimeType?.startsWith('image/'));
  if (!firstImage) return { imageBase64, imageMimeType };
  const img = await fetchDriveImageAsBase64(firstImage.id, firstImage.mimeType, driveToken);
  if (!img) return { imageBase64, imageMimeType };
  return { imageBase64: img.base64, imageMimeType: img.mimeType };
}

function assertOmniReferenceVideoUrlIsLikelyDirect(urlStr: string): void {
  if (process.env.KLING_ALLOW_SOCIAL_VIDEO_URL === '1') return;
  let host: string;
  try {
    host = new URL(urlStr).hostname.toLowerCase();
  } catch {
    throw new Error('参考视频地址不是合法 URL');
  }
  const socialPageHosts = [
    'tiktok.com',
    'www.tiktok.com',
    'vm.tiktok.com',
    'vt.tiktok.com',
    'douyin.com',
    'www.douyin.com',
    'iesdouyin.com',
    'instagram.com',
    'www.instagram.com',
    'x.com',
    'twitter.com',
    'facebook.com',
    'www.facebook.com',
  ];
  const isSocial = socialPageHosts.some((h) => host === h || host.endsWith(`.${h}`));
  if (isSocial) {
    throw new Error(
      '参考视频不能填 TikTok/抖音/YouTube 等分享页链接。请使用公网可访问的 MP4 等直链（先下载再传到对象存储/CDN），或清空参考视频仅依赖图片+文案。',
    );
  }
}

export async function referenceVideoFromBodyAsync(body: {
  referenceVideoUrl?: string;
  referenceVideoReferType?: 'feature' | 'base';
  referenceVideoKeepSound?: 'yes' | 'no';
}): Promise<KlingRefVideo[] | undefined> {
  const raw = body.referenceVideoUrl?.trim();
  if (!raw) return undefined;
  let url = raw;
  if (!/^https?:\/\//i.test(url)) {
    if (/^\/\//.test(url)) url = `https:${url}`;
    else throw new Error('参考视频地址需为 http(s) 开头');
  }

  if (isResolvableSocialVideoPageUrl(url)) {
    if (process.env.KLING_ALLOW_SOCIAL_VIDEO_URL === '1') {
      url = await resolveSocialPageToDirectVideoUrl(url);
    } else {
      url = await prepareSocialVideoUrlForKling(url);
    }
  } else {
    assertOmniReferenceVideoUrlIsLikelyDirect(url);
  }

  return [
    {
      videoUrl: url,
      referType: body.referenceVideoReferType === 'base' ? 'base' : 'feature',
      keepOriginalSound: body.referenceVideoKeepSound === 'yes' ? 'yes' : 'no',
    },
  ];
}

