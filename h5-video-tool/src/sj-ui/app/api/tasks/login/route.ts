import { NextRequest, NextResponse } from "next/server";
import { canAccessEnv, filterPhonesByUser, requireApiUser } from "@/lib/api-auth";
import { fetchAllCloudPhones, tiktokLogin } from "@/lib/geelark";
import { recordTaskAttributions } from "@/lib/task-attribution-store";
import { notifySeatalkAsync } from "@/lib/seatalk-notify";

type LoginItem = { deviceIdOrName: string; account: string; password: string };

function resolveDeviceId(phones: { id: string; serialName?: string; serialNo?: string }[], deviceIdOrName: string): string | null {
  const s = (deviceIdOrName || "").trim();
  if (!s) return null;
  const byId = phones.find((p) => p.id === s);
  if (byId) return byId.id;
  const byName = phones.find((p) => (p.serialName || "").trim() === s || (p.serialNo ?? "").toString() === s);
  if (byName) return byName.id;
  const lower = s.toLowerCase();
  const byMatch = phones.find(
    (p) =>
      (p.serialName || "").toLowerCase().includes(lower) ||
      (p.serialNo ?? "").toString().toLowerCase().includes(lower) ||
      p.id.toLowerCase().includes(lower)
  );
  return byMatch?.id ?? null;
}

export async function POST(req: NextRequest) {
  const user = await requireApiUser(req, "batch_login");
  if (user instanceof NextResponse) return user;
  try {
    const body = (await req.json()) as { items?: LoginItem[] };
    const items = body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array required" }, { status: 400 });
    }
    const allPhones = await fetchAllCloudPhones();
    const phones = filterPhonesByUser(user, allPhones);
    if (!user.isSuperAdmin && phones.length === 0) {
      return NextResponse.json({ error: "未分配可操作设备" }, { status: 403 });
    }
    const now = Math.floor(Date.now() / 1000);
    const results: { index: number; taskId?: string; error?: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const id = resolveDeviceId(phones, it.deviceIdOrName);
      if (!id) {
        results.push({ index: i, error: "未找到设备：" + (it.deviceIdOrName || "空") });
        continue;
      }
      if (!canAccessEnv(user, id)) {
        results.push({ index: i, error: "无权操作该设备" });
        continue;
      }
      if (!(it.account || "").trim()) {
        results.push({ index: i, error: "账号不能为空" });
        continue;
      }
      if (!(it.password || "").trim()) {
        results.push({ index: i, error: "密码不能为空" });
        continue;
      }
      try {
        const data = await tiktokLogin({
          id,
          account: it.account,
          password: it.password,
          scheduleAt: now + 2 + i,
          name: "TikTok登录",
        });
        results.push({ index: i, taskId: data.taskId });
      } catch (e) {
        results.push({ index: i, error: e instanceof Error ? e.message : "提交失败" });
      }
    }
    const ok = results.filter((r) => r.taskId).length;
    const fail = results.filter((r) => r.error).length;
    const toAttr = results
      .filter((r): r is { index: number; taskId: string } => Boolean(r.taskId))
      .map((r) => ({ taskId: r.taskId, userId: user.id }));
    if (toAttr.length) await recordTaskAttributions(toAttr);
    notifySeatalkAsync(`【TikTok矩阵】批量登录任务已提交\n成功：${ok}，失败：${fail}，共 ${items.length} 条`);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
