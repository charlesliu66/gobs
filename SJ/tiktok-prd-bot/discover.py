"""模块一：关键词搜索视频、相对热度排序、过滤已处理。"""

from __future__ import annotations

import math
from datetime import datetime
from typing import Any

from TikTokApi import TikTokApi

from db import get_processed_video_ids, init_db


def calc_score(likes: float, create_time_ts: float, avg_likes: float) -> float:
    hours_ago = (datetime.now().timestamp() - create_time_ts) / 3600.0
    time_decay = 1.0 / math.log(max(hours_ago, 0) + 2.0)
    rel = (likes / avg_likes) if avg_likes > 0 else 0.0
    return rel * time_decay


def _as_int(v: Any) -> int:
    if v is None:
        return 0
    if isinstance(v, bool):
        return int(v)
    if isinstance(v, int):
        return v
    try:
        return int(str(v).strip())
    except ValueError:
        return 0


def _video_likes_comments_create(data: dict[str, Any]) -> tuple[int, int, float]:
    stats = data.get("stats") or data.get("statsV2") or {}
    likes = _as_int(stats.get("diggCount"))
    comments = _as_int(stats.get("commentCount"))

    ct = data.get("createTime", 0)
    try:
        create_ts = float(ct)
    except (TypeError, ValueError):
        create_ts = 0.0
    return int(likes or 0), int(comments or 0), create_ts


def _author_unique_id(data: dict[str, Any]) -> str:
    author = data.get("author") or {}
    if isinstance(author, str):
        return author
    return (
        author.get("uniqueId")
        or author.get("unique_id")
        or author.get("nickname")
        or "unknown"
    )


async def discover_videos(
    keywords: list[str],
    top_n: int = 5,
    *,
    per_keyword_count: int = 30,
    ms_token: str | None = None,
    sleep_after: int = 3,
) -> list[dict[str, Any]]:
    init_db()
    processed = get_processed_video_ids()
    all_videos: list[dict[str, Any]] = []

    ms_tokens = [ms_token] if ms_token else None

    async with TikTokApi() as api:
        await api.create_sessions(
            num_sessions=1,
            sleep_after=sleep_after,
            ms_tokens=ms_tokens,
        )
        for keyword in keywords:
            kw = (keyword or "").strip()
            if not kw:
                continue
            raw: list[dict[str, Any]] = []
            async for video in api.search.search_type(
                kw, "item", count=per_keyword_count
            ):
                d = video.as_dict
                vid_id = d.get("id")
                if not vid_id or vid_id in processed:
                    continue
                likes, comment_count, create_ts = _video_likes_comments_create(d)
                uid = _author_unique_id(d)
                raw.append(
                    {
                        "id": vid_id,
                        "url": f"https://www.tiktok.com/@{uid}/video/{vid_id}",
                        "likes": likes,
                        "comments": comment_count,
                        "create_time": create_ts,
                        "keyword": kw,
                    }
                )
            if not raw:
                continue
            avg_likes = sum(v["likes"] for v in raw) / len(raw)
            for v in raw:
                v["score"] = calc_score(
                    float(v["likes"]), float(v["create_time"]), float(avg_likes)
                )
            all_videos.extend(raw)

    all_videos.sort(key=lambda x: x["score"], reverse=True)
    return all_videos[:top_n]
