/**
 * 本地上传前端 API
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export interface UploadedFile {
  id: string;
  originalName: string;
  url: string;
  kind: 'image' | 'video' | 'audio' | 'other';
  size: number;
  mimeType: string;
  uploadedAt?: string;
}

/**
 * 上传单个文件到服务端
 */
export async function uploadLocalFile(file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/api/upload/local`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json();
}

/**
 * 列出已上传文件
 */
export async function listUploadedFiles(): Promise<{ items: UploadedFile[]; maxMb: number }> {
  const res = await fetch(`${BASE_URL}/api/upload/list`);
  if (!res.ok) throw new Error('获取文件列表失败');
  return res.json();
}

/**
 * 删除已上传文件
 */
export async function deleteUploadedFile(id: string): Promise<void> {
  await fetch(`${BASE_URL}/api/upload/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/**
 * 将 /api/upload/file/:id 转为完整 URL
 */
export function resolveUploadUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}
