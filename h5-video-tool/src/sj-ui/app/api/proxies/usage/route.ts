import { NextRequest, NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api-auth"
import {
  computeProxyUsageFull,
  reportDevicesAndFreePortsCsv,
  reportToDelimitedText,
} from "@/lib/proxy-usage-report"

export const dynamic = "force-dynamic"

export type { ProxyUsageReport } from "@/lib/proxy-usage-report"

/**
 * GET — 汇总代理与云手机绑定。
 * - 默认：JSON
 * - `?format=csv`：下载 CSV（Excel 可直接打开）
 * - `?format=csv&layout=devices`：设备+环境ID+端口+代理组，并单独列出空闲端口与空闲端口一览
 * - `?format=tsv`：制表符分隔
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, "settings")
  if (auth instanceof NextResponse) return auth
  try {
    const format = req.nextUrl.searchParams.get("format")?.toLowerCase() ?? ""
    const layout = req.nextUrl.searchParams.get("layout")?.toLowerCase() ?? ""
    const { report, phones } = await computeProxyUsageFull()

    if (format === "csv" && layout === "devices") {
      const text = reportDevicesAndFreePortsCsv(phones, report)
      const day = report.generatedAt.slice(0, 10).replace(/-/g, "")
      const filename = `proxy-devices-inventory-${day}.csv`
      return new NextResponse(text, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    if (format === "csv" || format === "tsv") {
      const sep = format === "tsv" ? "\t" : ","
      const text = reportToDelimitedText(report, sep)
      const ext = format === "tsv" ? "tsv" : "csv"
      const day = report.generatedAt.slice(0, 10).replace(/-/g, "")
      const filename = `proxy-usage-${day}.${ext}`
      return new NextResponse(text, {
        status: 200,
        headers: {
          "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "text/tab-separated-values; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    return NextResponse.json(report)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "usage failed" },
      { status: 500 },
    )
  }
}
