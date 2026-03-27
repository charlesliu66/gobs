import { NextRequest, NextResponse } from "next/server";

const FALLBACK_SUGGESTIONS = [
  "Nice! 🔥",
  "So good!",
  "Love this!",
  "Amazing content!",
  "真不错！",
  "太棒了！",
  "Great share!",
];

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string };
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
    if (apiKey) {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `Generate 5 short, natural TikTok comment suggestions for a video. One per line, no numbering. Mix English and Chinese. Keep each under 100 characters. Video link: ${url || "unknown"}`,
            },
          ],
          max_tokens: 300,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim() || "";
        const lines = text
          .split("\n")
          .map((s: string) => s.replace(/^\d+[.)]\s*/, "").trim())
          .filter(Boolean)
          .slice(0, 5);
        if (lines.length > 0) return NextResponse.json({ suggestions: lines });
      }
    }
    const shuffled = [...FALLBACK_SUGGESTIONS].sort(() => Math.random() - 0.5);
    return NextResponse.json({ suggestions: shuffled.slice(0, 5) });
  } catch (e) {
    const shuffled = [...FALLBACK_SUGGESTIONS].sort(() => Math.random() - 0.5);
    return NextResponse.json({ suggestions: shuffled.slice(0, 5) });
  }
}
