/**
 * 从 Google Drive 链接中提取 ID（文件夹或文件）
 * 支持格式：
 *   - https://drive.google.com/drive/folders/xxx （文件夹，推荐）
 *   - https://drive.google.com/drive/u/0/folders/xxx
 *   - https://drive.google.com/file/d/xxx/view （文件链接，会提示用户改用文件夹）
 *   - https://drive.google.com/open?id=xxx
 */
export function parseFolderIdFromUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const folderMatch = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const openMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return openMatch ? openMatch[1] : null;
}

/** 判断是否为文件链接（非文件夹），需提示用户改用文件夹链接 */
export function isFileLink(url: string): boolean {
  return /\/file\/d\//.test(url.trim());
}
