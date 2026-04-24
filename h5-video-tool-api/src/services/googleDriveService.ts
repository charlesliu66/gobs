/**
 * Google Drive 集成服务
 * 懒加载模式：浏览时只拉元数据/缩略图，使用时才下载到服务器
 */
import { google, type drive_v3, type Auth } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { resolvePath } from '../infra/storage/resolver.js';

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

type StoredGoogleTokens = {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
};

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/drive/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth 未配置（缺少 GOOGLE_CLIENT_ID 或 GOOGLE_CLIENT_SECRET）');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// 内存缓存 per-user tokens，生产环境应持久化到 DB。
const tokenStore = new Map<string, StoredGoogleTokens>();

export function getAuthUrl(state?: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state,
  });
}

export async function handleCallback(code: string, username: string): Promise<void> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('OAuth 授权失败：未获取到 token');
  }
  tokenStore.set(username, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date ?? Date.now() + 3600 * 1000,
  });
}

export function isConnected(username: string): boolean {
  return tokenStore.has(username);
}

export function disconnect(username: string): void {
  tokenStore.delete(username);
}

async function getDriveClient(username: string): Promise<drive_v3.Drive> {
  const stored = tokenStore.get(username);
  if (!stored) throw new Error('未连接 Google Drive，请先授权');

  const client = getOAuth2Client();
  client.setCredentials({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
    expiry_date: stored.expiry_date,
  });

  client.on('tokens', (tokens: Auth.Credentials) => {
    if (tokens.access_token) {
      stored.access_token = tokens.access_token;
      if (tokens.expiry_date) stored.expiry_date = tokens.expiry_date;
    }
  });

  return google.drive({ version: 'v3', auth: client });
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  createdTime?: string;
  isFolder: boolean;
}

export async function listFiles(
  username: string,
  folderId = 'root',
  pageToken?: string,
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const drive = await getDriveClient(username);

  const query = folderId === 'root'
    ? `'root' in parents and trashed = false`
    : `'${folderId}' in parents and trashed = false`;

  const res = await drive.files.list({
    q: query,
    fields: 'nextPageToken, files(id, name, mimeType, size, thumbnailLink, createdTime)',
    pageSize: 50,
    pageToken,
    orderBy: 'folder, name',
  });

  const files: DriveFile[] = (res.data.files ?? []).map((f: drive_v3.Schema$File) => ({
    id: f.id ?? '',
    name: f.name ?? '',
    mimeType: f.mimeType ?? '',
    size: f.size ?? undefined,
    thumbnailLink: f.thumbnailLink ?? undefined,
    createdTime: f.createdTime ?? undefined,
    isFolder: f.mimeType === 'application/vnd.google-apps.folder',
  }));

  return { files, nextPageToken: res.data.nextPageToken ?? undefined };
}

export async function downloadFile(username: string, fileId: string, filename: string): Promise<string> {
  const drive = await getDriveClient(username);

  const cacheDir = resolvePath('drive-cache', username);
  fs.mkdirSync(cacheDir, { recursive: true });

  const ext = path.extname(filename) || '';
  const destPath = path.join(cacheDir, `${fileId}${ext}`);

  if (fs.existsSync(destPath)) {
    return destPath;
  }

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' },
  );

  await new Promise<void>((resolve, reject) => {
    const dest = fs.createWriteStream(destPath);
    (res.data as NodeJS.ReadableStream)
      .pipe(dest)
      .on('finish', resolve)
      .on('error', reject);
  });

  return destPath;
}

export function getCachedPath(username: string, fileId: string): string | null {
  const cacheDir = resolvePath('drive-cache', username);
  if (!fs.existsSync(cacheDir)) return null;

  const entries = fs.readdirSync(cacheDir);
  const match = entries.find((e) => e.startsWith(fileId));
  return match ? path.join(cacheDir, match) : null;
}
