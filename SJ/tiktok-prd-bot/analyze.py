"""模块二：拉取评论 + LLM 舆情分析。"""

from __future__ import annotations

import json
from typing import Any

from openai import OpenAI
from TikTokApi import TikTokApi

from config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL


async def fetch_comments(
    video_id: str,
    count: int = 100,
    *,
    ms_token: str | None = None,
    sleep_after: int = 3,
) -> list[str]:
    ms_tokens = [ms_token] if ms_token else None
    texts: list[str] = []
    async with TikTokApi() as api:
        await api.create_sessions(
            num_sessions=1,
            sleep_after=sleep_after,
            ms_tokens=ms_tokens,
        )
        vid = api.video(id=video_id)
        async for comment in vid.comments(count=count):
            t = getattr(comment, "text", None) or comment.as_dict.get("text", "")
            t = (t or "").strip()
            if t:
                texts.append(t)
    return texts


def analyze_sentiment(
    comments: list[str],
    product_name: str,
    *,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> dict[str, Any]:
    key = api_key or OPENAI_API_KEY
    if not key:
        raise ValueError("未配置 OpenAI API Key")

    client_kw: dict[str, Any] = {"api_key": key}
    if base_url or OPENAI_BASE_URL:
        client_kw["base_url"] = base_url or OPENAI_BASE_URL
    client = OpenAI(**client_kw)
    use_model = model or OPENAI_MODEL

    body = "\n".join(comments[:100])
    prompt = f"""你是一个游戏舆情分析师，分析以下 TikTok 评论，产品名：{product_name}

评论内容：
{body}

请输出 JSON 格式：
{{
  "sentiment": "正面/负面/中立",
  "sentiment_ratio": {{"positive": 0.6, "negative": 0.2, "neutral": 0.2}},
  "main_topics": ["话题1", "话题2", "话题3"],
  "risk_points": ["负面点1", "负面点2"],
  "strategy": "正向强化/反驳负面/自然互动",
  "strategy_detail": "具体建议..."
}}
"""
    resp = client.chat.completions.create(
        model=use_model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    raw = resp.choices[0].message.content or "{}"
    return json.loads(raw)
