import { redirect } from "next/navigation"

/** 旧入口已下线：舆情 PRD 在仓库 `tiktok-prd-bot`（Streamlit）。避免收藏夹 404。 */
export default function TiktokSentimentLegacyRedirect() {
  redirect("/")
}
