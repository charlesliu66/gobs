#!/usr/bin/env python3
"""Guarded GeeLark real publish verifier.

Dry-run is the default. A live publish requires explicit operator inputs plus
`--live --confirm REAL_GEELARK_POST` so this script cannot accidentally post
during build, eval, staging smoke, or prod smoke.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any


CONFIRMATION = "REAL_GEELARK_POST"
DEFAULT_BASE_URLS = {
    "local": "http://127.0.0.1:3001",
    "staging": "http://43.134.186.196:8080",
    "prod": "http://43.134.186.196",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Dry-run or guarded live verification for GeeLark publishing.")
    parser.add_argument("--target", choices=sorted(DEFAULT_BASE_URLS), default="local")
    parser.add_argument("--base-url", help="Override API base URL, e.g. http://127.0.0.1:3001")
    parser.add_argument("--account-id", help="GeeLark account id to post to.")
    material = parser.add_mutually_exclusive_group()
    material.add_argument("--video-path", help="Server-local video path accepted by /api/geelark/publish.")
    material.add_argument("--video-url", help="HTTP/video URL accepted by /api/geelark/publish.")
    parser.add_argument("--caption", help="Caption for the verification post.")
    parser.add_argument("--hashtags", default="#GOBSVerification", help="Hashtags for the verification post.")
    parser.add_argument("--token", help="Bearer token to send as Authorization header.")
    parser.add_argument("--cookie", help="Cookie header to send with the request.")
    parser.add_argument("--mark-ai", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--share-link", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--poll-seconds", type=int, default=30)
    parser.add_argument("--live", action="store_true", help="Actually call /api/geelark/publish.")
    parser.add_argument("--confirm", help=f"Required for live mode: {CONFIRMATION}")
    return parser.parse_args()


def base_url(args: argparse.Namespace) -> str:
    return (args.base_url or DEFAULT_BASE_URLS[args.target]).rstrip("/")


def prefixed_caption(args: argparse.Namespace) -> str:
    caption = (args.caption or "").strip()
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    prefix = f"[GOBS verification {args.target} {stamp}]"
    return f"{prefix} {caption}".strip()


def build_payload(args: argparse.Namespace) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "accountIds": [args.account_id],
        "caption": prefixed_caption(args),
        "hashtags": args.hashtags,
        "markAI": bool(args.mark_ai),
        "needShareLink": bool(args.share_link),
    }
    if args.video_path:
        payload["videoPath"] = args.video_path
    if args.video_url:
        payload["videoUrl"] = args.video_url
    return payload


def validate_required_inputs(args: argparse.Namespace) -> list[str]:
    missing: list[str] = []
    if not args.account_id:
        missing.append("--account-id")
    if not args.video_path and not args.video_url:
        missing.append("--video-path or --video-url")
    if not args.caption:
        missing.append("--caption")
    return missing


def headers(args: argparse.Namespace) -> dict[str, str]:
    result = {"Content-Type": "application/json"}
    if args.token:
        result["Authorization"] = f"Bearer {args.token}"
    if args.cookie:
        result["Cookie"] = args.cookie
    return result


def request_json(method: str, url: str, args: argparse.Namespace, body: dict[str, Any] | None = None) -> Any:
    encoded_body = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(url, data=encoded_body, headers=headers(args), method=method)
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            data = response.read().decode("utf-8")
            return json.loads(data) if data else {}
    except urllib.error.HTTPError as error:
        body_text = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} failed with HTTP {error.code}: {body_text}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"{method} {url} failed: {error.reason}") from error


def poll_task(base: str, task_id: str, args: argparse.Namespace) -> dict[str, Any]:
    deadline = time.time() + max(0, args.poll_seconds)
    detail: Any = {}
    while True:
        detail = request_json("GET", f"{base}/api/geelark/task/{urllib.parse.quote(task_id)}", args)
        status = detail.get("status")
        if status in (3, 4, 7) or time.time() >= deadline:
            break
        time.sleep(5)
    return detail if isinstance(detail, dict) else {"raw": detail}


def main() -> int:
    args = parse_args()
    payload = build_payload(args)
    missing = validate_required_inputs(args)
    output_base_url = base_url(args)

    if not args.live:
        print(
            json.dumps(
                {
                    "mode": "dry-run",
                    "wouldPost": False,
                    "baseUrl": output_base_url,
                    "payload": payload,
                    "missing": missing,
                    "nextStep": (
                        f"Add --live --confirm {CONFIRMATION} with approved account/material/caption "
                        "to create a real GeeLark verification post."
                    ),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0

    if missing:
        print(f"Missing required live input(s): {', '.join(missing)}", file=sys.stderr)
        return 2
    if args.confirm != CONFIRMATION:
        print(f"Live mode requires --confirm {CONFIRMATION}", file=sys.stderr)
        return 2

    publish_result = request_json("POST", f"{output_base_url}/api/geelark/publish", args, payload)
    task_ids = publish_result.get("taskIds") if isinstance(publish_result, dict) else None
    task_id = task_ids[0] if isinstance(task_ids, list) and task_ids else None

    result: dict[str, Any] = {
        "mode": "live",
        "wouldPost": True,
        "baseUrl": output_base_url,
        "publishResult": publish_result,
    }
    if task_id:
        result["taskDetail"] = poll_task(output_base_url, str(task_id), args)
        result["historyProbe"] = request_json(
            "GET",
            f"{output_base_url}/api/geelark/tasks?size=50&limit=10&q={urllib.parse.quote(str(task_id))}",
            args,
        )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
