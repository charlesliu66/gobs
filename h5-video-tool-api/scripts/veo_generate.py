#!/usr/bin/env python3
"""
Compass Veo 视频生成 - 与文档一致的 Python SDK 实现
用法: python veo_generate.py "A cat reading a book" 16:9
参考图: 通过环境变量 COMPASS_REF_IMAGE_B64（base64）和 COMPASS_REF_IMAGE_MIME（可选）
"""
import sys
import os
import time
import json

# 从环境变量读取（Node 会为 VEO3 注入已解析的 COMPASS_API_KEY；CLI 直连时按模型在 KEY / KEY2 间选择）
BASE_URL = os.environ.get("COMPASS_API_URL", "https://compass.llm.shopee.io/compass-api/v1").strip()
REF_IMAGE_B64 = os.environ.get("COMPASS_REF_IMAGE_B64", "").strip()
REF_IMAGE_MIME = os.environ.get("COMPASS_REF_IMAGE_MIME", "image/png").strip() or "image/png"
DEFAULT_MODEL = os.environ.get("COMPASS_VIDEO_MODEL", "veo-2.0-generate-001").strip() or "veo-2.0-generate-001"


def _resolve_api_key(model: str) -> str:
    key1 = os.environ.get("COMPASS_API_KEY", "").strip()
    key2 = os.environ.get("COMPASS_API_KEY2", "").strip()
    if "veo-3" in model.lower():
        return key2 or key1
    return key1


def main():
    prompt = sys.argv[1] if len(sys.argv) > 1 else "A cat reading a book"
    aspect_ratio = sys.argv[2] if len(sys.argv) > 2 else "16:9"
    model = os.environ.get("VEO_MODEL", "").strip() or DEFAULT_MODEL
    api_key = _resolve_api_key(model)
    if not api_key:
        print("ERROR: COMPASS_API_KEY (或 VEO3 时 COMPASS_API_KEY2) not set", file=sys.stderr)
        sys.exit(1)
    try:
        from google import genai
        from google.genai.types import GenerateVideosConfig, HttpOptions, Image
    except ImportError:
        print("ERROR: pip install google-genai", file=sys.stderr)
        sys.exit(1)

    client = genai.Client(
        vertexai=True,
        api_key=api_key,
        http_options=HttpOptions(
            api_version="v1",
            base_url=BASE_URL,
        ),
    )

    duration_str = os.environ.get("VEO_DURATION", "").strip()
    duration_seconds = int(duration_str) if duration_str and duration_str.isdigit() else 5
    duration_seconds = max(4, min(8, duration_seconds))  # Veo 支持 4–8 秒
    resolution = os.environ.get("VEO_RESOLUTION", "").strip() or None  # 720p/1080p/4k，空则用默认
    config_kw = {"aspect_ratio": aspect_ratio, "output_gcs_uri": "", "duration_seconds": duration_seconds}
    if resolution and resolution.lower() in ("720p", "1080p", "4k"):
        config_kw["resolution"] = resolution.lower()
    gen_kw = {
        "model": model,
        "prompt": prompt,
        "config": GenerateVideosConfig(**config_kw),
    }
    if REF_IMAGE_B64:
        gen_kw["image"] = Image(image_bytes=REF_IMAGE_B64, mime_type=REF_IMAGE_MIME)

    operation = client.models.generate_videos(**gen_kw)

    while not operation.done:
        time.sleep(15)
        operation = client.operations.get(operation)
        print(f"[poll] done={operation.done}", file=sys.stderr)

    if operation.response:
        uri = operation.result.generated_videos[0].video.uri
        print(json.dumps({"ok": True, "uri": uri}))
    else:
        print(json.dumps({"ok": False, "error": str(operation)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
