export function sanitizeUsername(raw: string | undefined | null): string {
  const s = String(raw ?? '').trim();
  if (/^[\w-]{1,64}$/.test(s)) return s;
  return '_default';
}

