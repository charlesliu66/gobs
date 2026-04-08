import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"

export const dynamic = "force-dynamic"

/**
 * SeaTalk Open Platform — Event Callback
 * @see https://open.seatalk.io/docs/server-apis-event-callback
 *
 * 在开放平台「Event Callback」里填写：
 *   https://你的域名/api/seatalk/callback
 * 环境变量：
 *   SEATALK_SIGNING_SECRET — 控制台显示的 Signing Secret（用于校验 Signature 头；可选但强烈建议配置）
 */

function verifySignature(rawBody: string, signingSecret: string, signatureHeader: string | null): boolean {
  if (!signingSecret || !signatureHeader) return true
  const expected = createHash("sha256")
    .update(Buffer.concat([Buffer.from(rawBody, "utf8"), Buffer.from(signingSecret, "utf8")]))
    .digest("hex")
  return expected.toLowerCase() === signatureHeader.toLowerCase()
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signingSecret = process.env.SEATALK_SIGNING_SECRET?.trim() ?? ""
  const signatureHeader = req.headers.get("signature") ?? req.headers.get("Signature")

  type Payload = {
    event_id?: string
    event_type?: string
    timestamp?: number
    app_id?: string
    event?: { seatalk_challenge?: string; group?: { group_id?: string; group_name?: string }; [key: string]: unknown }
  }

  let data: Payload
  try {
    data = JSON.parse(rawBody) as Payload
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const eventType = data.event_type ?? ""

  // 验证 URL：必须在 5 秒内返回 200，且 body 仅为 { "seatalk_challenge": "<原样>" }
  // 注意：开放平台在「保存 URL」验证阶段，Signature 与本地 SEATALK_SIGNING_SECRET 若不一致会误返回 401，
  // SeaTalk 常报 “invalid/incorrect response”。因此验证请求不校验 Signature，只回显 challenge。
  if (eventType === "event_verification") {
    const ev = data.event
    const raw =
      ev && typeof ev === "object" && "seatalk_challenge" in ev
        ? (ev as { seatalk_challenge?: unknown }).seatalk_challenge
        : undefined
    const challenge =
      typeof raw === "string"
        ? raw
        : raw != null
          ? String(raw)
          : typeof (data as { seatalk_challenge?: unknown }).seatalk_challenge === "string"
            ? (data as { seatalk_challenge: string }).seatalk_challenge
            : undefined
    if (challenge === undefined) {
      return NextResponse.json({ error: "missing seatalk_challenge" }, { status: 400 })
    }
    const body = JSON.stringify({ seatalk_challenge: challenge })
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  }

  // 其它事件：建议校验签名
  if (signingSecret && signatureHeader && !verifySignature(rawBody, signingSecret, signatureHeader)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }
  if (signingSecret && !signatureHeader) {
    return NextResponse.json({ error: "missing signature" }, { status: 401 })
  }

  // 机器人入群：在 Vercel Logs 里搜 seatalk-callback，从 payload 里取 group_id 填 SEATALK_GROUP_ID
  if (eventType === "bot_added_to_group_chat") {
    const ev = data.event
    const gid = ev?.group?.group_id ?? (ev as { group_id?: string })?.group_id
    const name = ev?.group?.group_name
    console.log(
      `[seatalk-callback] bot_added_to_group_chat group_id=${gid ?? "?"} group_name=${name ?? "?"}`,
    )
    if (ev) console.log("[seatalk-callback] event payload", JSON.stringify(ev).slice(0, 2000))
  } else if (eventType) {
    console.log(`[seatalk-callback] ${eventType}`, rawBody.slice(0, 800))
  }

  return new NextResponse(null, { status: 200 })
}
