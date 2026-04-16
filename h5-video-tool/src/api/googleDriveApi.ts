/**
 * Google Drive 前端 API 封装
 */
import { apiGet, apiPost } from './client';

const BASE = '/api/drive';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  createdTime?: string;
  isFolder: boolean;
}

export async function getDriveStatus(): Promise<{ connected: boolean; error?: string }> {
  return apiGet(`${BASE}/status`);
}

export async function connectDrive(): Promise<{ authUrl: string }> {
  return apiPost(`${BASE}/connect`, {});
}

export async function disconnectDrive(): Promise<void> {
  await apiPost(`${BASE}/disconnect`, {});
}

export async function listDriveFiles(
  folderId = 'root',
  pageToken?: string,
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const params = new URLSearchParams({ folder: folderId });
  if (pageToken) params.set('pageToken', pageToken);
  return apiGet(`${BASE}/files?${params.toString()}`);
}

export async function cacheDriveFile(fileId: string, filename?: string): Promise<{ cached: boolean; path: string }> {
  return apiPost(`${BASE}/cache`, { fileId, filename });
}

export function buildDriveThumbnailUrl(thumbnailLink: string): string {
  return `${BASE}/thumbnail?url=${encodeURIComponent(thumbnailLink)}`;
}
