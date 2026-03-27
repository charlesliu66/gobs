/**
 * 批量粘贴解析：Tab 分隔
 */
const TIME_RE = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;
const UTC_RE = /^UTC\s*([+-])\s*(\d{1,2})$/i;

export function parseDateStr(dateStr: string): Date | undefined {
  const s = dateStr.trim();
  if (!s) return undefined;
  let y: number, mo: number, d: number;
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    y = parseInt(ymd[1], 10);
    mo = parseInt(ymd[2], 10) - 1;
    d = parseInt(ymd[3], 10);
  } else {
    const mdY = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (mdY) {
      mo = parseInt(mdY[1], 10) - 1;
      d = parseInt(mdY[2], 10);
      y = parseInt(mdY[3], 10);
    } else return undefined;
  }
  if (isNaN(y) || mo < 0 || mo > 11 || d < 1 || d > 31) return undefined;
  const date = new Date(y, mo, d);
  if (isNaN(date.getTime())) return undefined;
  return date;
}

function parseTimeStr(timeStr: string): string {
  const s = (timeStr || '').trim() || '14:30';
  const m = s.match(TIME_RE);
  if (m) {
    let h = parseInt(m[1], 10);
    let min = parseInt(m[2], 10);
    h = Math.min(23, Math.max(0, h));
    min = Math.min(59, Math.max(0, min));
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  return '14:30';
}

function parseTimezoneStr(tzStr: string): string {
  const s = (tzStr || '').trim() || 'UTC+8';
  const compact = s.replace(/\s/g, '');
  const m = compact.match(/^UTC([+-])(\d{1,2})$/i);
  if (m) return `UTC${m[1]}${parseInt(m[2], 10)}`;
  return 'UTC+8';
}

function pickTimeAndTimezone(
  restParts: string[],
  defaults: { time: string; timezone: string } = { time: '14:30', timezone: 'UTC+8' }
): { scheduleTime: string; timezone: string } {
  let scheduleTime = defaults.time;
  let timezone = defaults.timezone;
  for (const raw of restParts) {
    const t = (raw ?? '').trim();
    if (!t) continue;
    if (TIME_RE.test(t)) scheduleTime = parseTimeStr(t);
    else if (UTC_RE.test(t.replace(/\s/g, ''))) timezone = parseTimezoneStr(t);
  }
  return { scheduleTime, timezone };
}

function isLinkColumn(s: string): boolean {
  const t = (s || '').trim();
  return t.startsWith('http') || t.includes('tiktok');
}

export function formatNowTime(now: Date): string {
  const h = now.getHours();
  const m = now.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface ParsedBatchRow {
  videoLink: string;
  comment: string;
  scheduleDate?: Date;
  scheduleTime: string;
  timezone: string;
  deviceIdOrName?: string;
}

export function parseBatchPaste(text: string, options?: { now?: Date; defaultTimezone?: string }): ParsedBatchRow[] {
  const now = options?.now ?? new Date();
  const defaultTz = options?.defaultTimezone ?? 'UTC+8';
  const defaultTime = formatNowTime(now);
  const defaultDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const rows: ParsedBatchRow[] = [];
  for (const line of lines) {
    if (!line.includes('\t')) continue;
    const parts = line.split('\t').map((s) => s.trim());
    let deviceIdOrName: string | undefined;
    let linkIdx: number;
    if (parts.length > 0 && !isLinkColumn(parts[0])) {
      deviceIdOrName = parts[0] || undefined;
      linkIdx = 1;
    } else {
      linkIdx = 0;
    }
    const videoLink = (parts[linkIdx] || '').trim();
    const comment = (parts[linkIdx + 1] ?? '').trim();
    const dateStr = parts[linkIdx + 2] ?? '';
    const rest = parts.slice(linkIdx + 3);
    const { scheduleTime, timezone } = pickTimeAndTimezone(rest, { time: defaultTime, timezone: defaultTz });
    if (!videoLink || (!videoLink.startsWith('http') && !videoLink.includes('tiktok'))) continue;
    const scheduleDate = parseDateStr(dateStr) ?? defaultDate;
    rows.push({ videoLink, comment, scheduleDate, scheduleTime, timezone, deviceIdOrName: deviceIdOrName || undefined });
  }
  return rows;
}
