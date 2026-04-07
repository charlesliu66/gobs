/**
 * Multer 将 multipart 里的文件名按 latin1 字节解释时，UTF-8 中文会乱码。
 * 若无法从表单拿到 `originalName`，则用 latin1→UTF-8 尝试恢复。
 */
export function decodeMultipartFilename(name: string): string {
  if (!name || typeof name !== 'string') return name;
  const hasHigh = [...name].some((c) => {
    const code = c.charCodeAt(0);
    return code >= 128 && code <= 255;
  });
  if (!hasHigh) return name;
  try {
    const u = Buffer.from(name, 'latin1').toString('utf8');
    if (u.includes('\uFFFD')) return name;
    return u;
  } catch {
    return name;
  }
}
