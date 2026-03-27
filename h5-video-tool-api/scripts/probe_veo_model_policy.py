#!/usr/bin/env python3
"""仅探测 generate_videos 首包是否被组织策略拒绝（不轮询、不下载）。若策略放行会创建任务，可能计费。"""
from __future__ import annotations

import os
import sys
from pathlib import Path


def load_dotenv(env_path: Path) -> None:
    if not env_path.is_file():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k:
            os.environ[k] = v


def resolve_key(model: str) -> str:
    k1 = os.environ.get("COMPASS_API_KEY", "").strip()
    k2 = os.environ.get("COMPASS_API_KEY2", "").strip()
    if "veo-3" in model.lower():
        return k2 or k1
    return k1


def probe(model: str) -> None:
    root = Path(__file__).resolve().parent.parent
    load_dotenv(root / ".env")
    base = os.environ.get(
        "COMPASS_API_URL", "https://compass.llm.shopee.io/compass-api/v1"
    ).strip()
    api_key = resolve_key(model)
    if not api_key:
        print(f"[{model}] ERROR: 无 COMPASS_API_KEY / COMPASS_API_KEY2", file=sys.stderr)
        return

    from google import genai
    from google.genai.types import GenerateVideosConfig, HttpOptions

    client = genai.Client(
        vertexai=True,
        api_key=api_key,
        http_options=HttpOptions(api_version="v1", base_url=base),
    )
    print(f"\n>>> 探测模型: {model} (KEY={'KEY2' if api_key == os.environ.get('COMPASS_API_KEY2','').strip() else 'KEY1'})")
    try:
        op = client.models.generate_videos(
            model=model,
            prompt="A red apple on a white table, static shot.",
            config=GenerateVideosConfig(
                aspect_ratio="16:9",
                output_gcs_uri="",
                duration_seconds=8,
            ),
        )
        print("结果: 首包未被拒绝 — 已创建异步任务（服务端会继续跑，可能产生费用）。")
        print(f"operation: {getattr(op, 'name', op)}")
    except Exception as e:
        print("结果: 请求阶段报错（多为组织策略或参数）:")
        print(f"  {type(e).__name__}: {e}")


if __name__ == "__main__":
    models = sys.argv[1:] or [
        "veo-3.0-generate-001",
        "veo-3.1-fast-generate-001",
    ]
    for m in models:
        probe(m)
