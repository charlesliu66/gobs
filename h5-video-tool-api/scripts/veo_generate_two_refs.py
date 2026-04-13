#!/usr/bin/env python3
"""
双参考图 Veo 图生视频（ingredients）：与 google-genai GenerateVideosConfig.reference_images 一致。
VEO3 使用 COMPASS_API_KEY2（或由环境注入的 COMPASS_API_KEY）。

用法:
  python scripts/veo_generate_two_refs.py \\
    --img1 "C:/path/浪人.png" --img2 "C:/path/怪物.jpg" \\
    --out "C:/path/out/ronin_vs_monster.mp4" \\
    --duration 5

依赖 .env：COMPASS_API_URL, COMPASS_API_KEY2（VEO3）, 可选 COMPASS_API_KEY
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.request
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


def resolve_api_key(model: str) -> str:
    k1 = os.environ.get("COMPASS_API_KEY", "").strip()
    k2 = os.environ.get("COMPASS_API_KEY2", "").strip()
    if "veo-3" in model.lower():
        return k2 or k1
    return k1


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    load_dotenv(root / ".env")

    ap = argparse.ArgumentParser()
    ap.add_argument("--img1", required=True, help="参考图1（浪人）本地路径")
    ap.add_argument("--img2", required=True, help="参考图2（怪物）本地路径")
    ap.add_argument("--out", required=True, help="输出 mp4 路径")
    ap.add_argument("--duration", type=int, default=5, help="秒数 4-8")
    ap.add_argument("--aspect", default="16:9", help="16:9 或 9:16")
    ap.add_argument(
        "--model",
        default=os.environ.get("VEO_MODEL", "veo-3.1-generate-001").strip()
        or "veo-3.1-generate-001",
    )
    ap.add_argument(
        "--prompt",
        default=(
            "Cinematic action: the ronin warrior from the first reference image "
            "fights the creature from the second reference image in a misty bamboo "
            "forest at dusk. Dynamic sword choreography, leaves and dust swirling, "
            "dramatic rim light, wide to medium shots, fantasy epic style, 8K, film grain. "
            "No blood or gore."
        ),
    )
    args = ap.parse_args()

    model = args.model.strip()
    api_key = resolve_api_key(model)
    if not api_key:
        print("ERROR: COMPASS_API_KEY2 (VEO3) or COMPASS_API_KEY missing", file=sys.stderr)
        sys.exit(1)

    p1, p2 = Path(args.img1), Path(args.img2)
    if not p1.is_file() or not p2.is_file():
        print("ERROR: image file not found", file=sys.stderr)
        sys.exit(1)

    base_url = os.environ.get(
        "COMPASS_API_URL", "http://compass.llm.shopee.io/compass-api/v1"
    ).strip()

    dur = max(4, min(8, int(args.duration)))

    try:
        from google import genai
        from google.genai.types import (
            GenerateVideosConfig,
            HttpOptions,
            VideoGenerationReferenceImage,
            VideoGenerationReferenceType,
        )
    except ImportError:
        print("ERROR: pip install google-genai", file=sys.stderr)
        sys.exit(1)

    client = genai.Client(
        vertexai=True,
        api_key=api_key,
        http_options=HttpOptions(api_version="v1", base_url=base_url),
    )

    im1 = genai.types.Image.from_file(location=str(p1))
    im2 = genai.types.Image.from_file(location=str(p2))

    ref_images = [
        VideoGenerationReferenceImage(
            image=im1,
            reference_type=VideoGenerationReferenceType.ASSET,
        ),
        VideoGenerationReferenceImage(
            image=im2,
            reference_type=VideoGenerationReferenceType.ASSET,
        ),
    ]

    cfg = GenerateVideosConfig(
        aspect_ratio=args.aspect,
        output_gcs_uri="",
        duration_seconds=dur,
        reference_images=ref_images,
    )

    print(f"[veo_two_refs] model={model} duration={dur}s aspect={args.aspect}", file=sys.stderr)
    operation = client.models.generate_videos(
        model=model,
        prompt=args.prompt.strip(),
        config=cfg,
    )

    while not operation.done:
        time.sleep(15)
        operation = client.operations.get(operation)
        print(f"[poll] done={operation.done}", file=sys.stderr)

    if not operation.response:
        print(json.dumps({"ok": False, "error": str(operation)}), file=sys.stderr)
        sys.exit(1)

    res = operation.result
    if res is None or not getattr(res, "generated_videos", None):
        err = getattr(operation, "error", None) or str(operation)
        print(json.dumps({"ok": False, "error": f"no video in result: {err}"}), file=sys.stderr)
        sys.exit(1)

    uri = res.generated_videos[0].video.uri
    print(json.dumps({"ok": True, "uri": uri}))

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(uri, str(out_path))
    print(f"[saved] {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
