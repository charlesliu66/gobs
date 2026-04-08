"""模块四：GeeLark RPA 定时评论（与仓库根 geelark_client / web 逻辑一致）。"""

from __future__ import annotations

import random
import sys
import time
from pathlib import Path
from typing import Any

# 复用仓库根目录的 GeeLark 客户端（Bearer + traceId）
_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from geelark_client import post  # noqa: E402

from config import GEELARK_USE_ASIA, load_accounts
from db import log_comment, mark_processed


def schedule_tiktok_comment(
    phone_id: str,
    video_url: str,
    comment: str,
    schedule_at: int,
    *,
    use_asia: bool | None = None,
    name: str | None = None,
    remark: str | None = None,
    comment_probability: int = 100,
) -> dict[str, Any]:
    use_asia = GEELARK_USE_ASIA if use_asia is None else use_asia
    path = (
        "rpa/task/tiktokRandomCommentAsia"
        if use_asia
        else "rpa/task/tiktokRandomComment"
    )
    body: dict[str, Any] = {
        "id": phone_id,
        "scheduleAt": schedule_at,
        "useAi": 2,
        "comment": comment[:500],
        "links": [video_url.strip()],
        "commentProbability": max(0, min(100, comment_probability)),
    }
    if name:
        body["name"] = name[:128]
    if remark:
        body["remark"] = remark[:200]

    r = post(path, data=body)
    r.raise_for_status()
    data = r.json()
    if data.get("code") != 0:
        raise RuntimeError(data.get("msg") or data.get("message") or "GeeLark API 错误")
    return data.get("data") or {}


def send_comment_via_geelark(
    account_id: str,
    video_url: str,
    comment: str,
    *,
    schedule_at: int | None = None,
    use_asia: bool | None = None,
) -> dict[str, Any]:
    """创建一条「定时评论」任务；schedule_at 默认约等于立即（当前秒 + 偏移）。"""
    if schedule_at is None:
        schedule_at = int(time.time()) + 5
    return schedule_tiktok_comment(
        account_id,
        video_url,
        comment,
        schedule_at,
        use_asia=use_asia,
        name="PRD 舆情评论",
    )


def batch_send(
    video_id: str,
    video_url: str,
    comments: list[str],
    *,
    accounts: list[dict] | None = None,
    min_interval_sec: int = 30,
    max_interval_sec: int = 120,
    mark_done: bool = True,
    use_asia: bool | None = None,
) -> list[dict[str, Any]]:
    accs = accounts if accounts is not None else load_accounts()
    if not accs:
        raise ValueError("账号池为空：请配置 GEELARK_PHONE_IDS 或 GEELARK_ACCOUNTS_JSON")

    n = min(len(accs), len(comments))
    paired = list(zip(accs[:n], comments[:n]))
    random.shuffle(paired)

    results: list[dict[str, Any]] = []
    for i, (account, comment) in enumerate(paired):
        aid = account["id"]
        status = "unknown"
        detail: dict[str, Any] = {}
        try:
            detail = send_comment_via_geelark(
                aid, video_url, comment, use_asia=use_asia
            )
            task_id = detail.get("taskId") or detail.get("task_id")
            status = "success" if task_id else "submitted"
        except Exception as e:
            status = f"error: {e}"

        log_comment(video_id, aid, comment, status)
        results.append({"account": aid, "status": status, "detail": detail})

        if i < len(paired) - 1:
            wait = random.randint(min_interval_sec, max_interval_sec)
            time.sleep(wait)

    if mark_done:
        mark_processed(video_id, video_url)
    return results
