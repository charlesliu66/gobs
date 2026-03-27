import { NextRequest, NextResponse } from "next/server";
import { scheduleTiktokComment } from "@/lib/geelark";

type TaskPayload = {
  phoneId: string;
  videoLink: string;
  comment: string;
  scheduleAt?: number;
  scheduleDate?: string;
  scheduleTime?: string;
  timezone?: string;
  useAsia?: boolean;
};

/** 解析 UTC+N / UTC-N 为偏移小时数，如 "UTC+8" -> 8, "UTC-5" -> -5 */
function parseUtcOffset(tz: string): number {
  const m = tz.trim().match(/^UTC([+-])(\d+)$/i);
  if (!m) return 0;
  const sign = m[1] === "+" ? 1 : -1;
  const hours = parseInt(m[2], 10) || 0;
  return sign * hours;
}

function toScheduleAt(p: TaskPayload): number | null {
  let ts: number | null = null;
  if (p.scheduleAt != null && p.scheduleAt > 0) {
    ts = p.scheduleAt;
  } else if (p.scheduleDate && p.scheduleTime && p.timezone) {
    const [h, m] = p.scheduleTime.split(":").map(Number);
    const dateStr = p.scheduleDate;
    const timeStr = `${String(h ?? 0).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}:00`;
    try {
      const offsetHours = parseUtcOffset(p.timezone);
      const naiveMs = new Date(`${dateStr}T${timeStr}.000Z`).getTime();
      const scheduleAtMs = naiveMs - offsetHours * 3600 * 1000;
      ts = Math.floor(scheduleAtMs / 1000);
    } catch {
      const d = new Date(dateStr + "T" + timeStr);
      ts = Math.floor(d.getTime() / 1000);
    }
  }
  if (ts == null) return null;
  const nowSec = Math.floor(Date.now() / 1000);
  if (ts < nowSec) ts = nowSec + 60;
  return ts;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { tasks: TaskPayload[] };
    const tasks = body?.tasks;
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ error: "tasks array required" }, { status: 400 });
    }
    const results: { index: number; taskId?: string; error?: string }[] = [];
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const scheduleAt = toScheduleAt(t);
      if (!t?.phoneId || !t?.videoLink || !t?.comment || scheduleAt == null) {
        results.push({ index: i, error: "缺少云手机、链接、评论或发布时间" });
        continue;
      }
      try {
        const data = await scheduleTiktokComment({
          phoneId: t.phoneId,
          tiktokUrl: t.videoLink,
          comment: t.comment,
          scheduleAt,
          useAsia: t.useAsia,
        });
        results.push({ index: i, taskId: data.taskId });
      } catch (e) {
        results.push({ index: i, error: e instanceof Error ? e.message : "Unknown error" });
      }
    }
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
