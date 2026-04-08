"""模块三：基于舆情结果生成差异化评论。"""

from __future__ import annotations

import json
from typing import Any

from openai import OpenAI

from config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL


def generate_comments(
    analysis: dict[str, Any],
    product_name: str,
    language: str = "en",
    count: int = 10,
    *,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> list[str]:
    key = api_key or OPENAI_API_KEY
    if not key:
        raise ValueError("未配置 OpenAI API Key")

    client_kw: dict[str, Any] = {"api_key": key}
    if base_url or OPENAI_BASE_URL:
        client_kw["base_url"] = base_url or OPENAI_BASE_URL
    client = OpenAI(**client_kw)
    use_model = model or OPENAI_MODEL

    topics = analysis.get("main_topics") or []
    if not isinstance(topics, list):
        topics = [str(topics)]
    prompt = f"""为游戏 {product_name} 生成 {count} 条 TikTok 评论。

舆情背景：
- 当前情绪：{analysis.get("sentiment", "")}
- 主要话题：{", ".join(str(t) for t in topics)}
- 评论策略：{analysis.get("strategy", "")}
- 策略说明：{analysis.get("strategy_detail", "")}

要求：
1. 语言：{language}
2. 每条风格不同：有的简短(5字以内)，有的中等(1-2句)，有的带emoji，有的纯文字
3. 语气自然，像真实玩家，可以有轻微语法不完美
4. 不要出现产品官方宣传语感
5. 根据策略方向引导舆论

输出 JSON：
{{"comments": ["评论1", "评论2", ...]}}
"""
    resp = client.chat.completions.create(
        model=use_model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    raw = resp.choices[0].message.content or "{}"
    data = json.loads(raw)
    comments = data.get("comments") or []
    if not isinstance(comments, list):
        return []
    return [str(c).strip() for c in comments if str(c).strip()][:count]
