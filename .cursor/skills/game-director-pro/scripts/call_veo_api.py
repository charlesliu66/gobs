#!/usr/bin/env python3
"""
Compass Veo 视频生成 — Game Director Video Skill（替代火山 Ark）

使用与 QAS h5-video-tool-api 相同的 Compass Veo API，支持文生视频与图生视频。
当无火山 Ark API 时，使用本脚本。

Usage:
    python call_veo_api.py --mode text-to-video --prompt "..." --duration 5
    python call_veo_api.py --mode image-to-video --image <url或base64> --prompt "..." --duration 5
    python call_veo_api.py --batch --input <shots_json> [--output-dir <dir>]

环境变量: COMPASS_API_KEY, COMPASS_API_URL（与 h5-video-tool-api/.env 一致）
"""

import os
import sys
import json
import time
import base64
import argparse
import urllib.request
from pathlib import Path
from typing import Optional, Dict, Any, List

# 加载 .env（skill 目录、QAS/h5-video-tool-api、cwd）
try:
    from dotenv import load_dotenv
    _base = Path(__file__).resolve().parent.parent
    for _p in [_base / ".env", _base.parent.parent.parent / "h5-video-tool-api" / ".env", Path.cwd() / ".env"]:
        if _p.exists():
            load_dotenv(_p)
            break
    else:
        load_dotenv(Path.cwd() / ".env")
except ImportError:
    pass

API_KEY = os.environ.get("COMPASS_API_KEY", "").strip()
BASE_URL = os.environ.get("COMPASS_API_URL", "http://compass.llm.shopee.io/compass-api/v1").strip()
DEFAULT_MODEL = os.environ.get("COMPASS_VIDEO_MODEL", "veo-2.0-generate-001").strip()
DEFAULT_DURATION = 5
VEO_DURATION_RANGE = (4, 8)  # Veo 支持 4-8 秒


def _fetch_image_as_base64(url: str) -> str:
    """从 URL 下载图片并转为 base64。"""
    req = urllib.request.Request(url, headers={"User-Agent": "GameDirectorPro/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return base64.b64encode(resp.read()).decode("ascii")


def _generate_veo_shot(
    prompt: str,
    duration: int,
    aspect_ratio: str = "9:16",
    image_base64: Optional[str] = None,
    image_mime: str = "image/png",
    model: Optional[str] = None,
) -> Dict[str, Any]:
    """调用 Compass Veo 生成单段视频，返回 {ok, uri} 或 {ok: False, error}。"""
    if not API_KEY:
        return {"ok": False, "error": "COMPASS_API_KEY 未设置"}
    try:
        from google import genai
        from google.genai.types import GenerateVideosConfig, HttpOptions, Image
    except ImportError:
        return {"ok": False, "error": "请安装: pip install google-genai"}

    duration = max(VEO_DURATION_RANGE[0], min(VEO_DURATION_RANGE[1], duration))
    client = genai.Client(
        vertexai=True,
        api_key=API_KEY,
        http_options=HttpOptions(api_version="v1", base_url=BASE_URL),
    )
    m = model or os.environ.get("VEO_MODEL", "").strip() or DEFAULT_MODEL
    config_kw = {"aspect_ratio": aspect_ratio, "output_gcs_uri": "", "duration_seconds": duration}
    gen_kw = {
        "model": m,
        "prompt": prompt,
        "config": GenerateVideosConfig(**config_kw),
    }
    if image_base64:
        img_bytes = base64.b64decode(image_base64) if isinstance(image_base64, str) else image_base64
        gen_kw["image"] = Image(image_bytes=img_bytes, mime_type=image_mime)

    operation = client.models.generate_videos(**gen_kw)
    while not operation.done:
        time.sleep(15)
        operation = client.operations.get(operation)

    if operation.response and operation.result and operation.result.generated_videos:
        uri = operation.result.generated_videos[0].video.uri
        return {"ok": True, "uri": uri}
    return {"ok": False, "error": str(operation)}


def _download_video(uri: str) -> bytes:
    """从 URI 下载视频（支持 https 或 gs://）。"""
    url = uri
    if uri.startswith("gs://"):
        # gs://bucket/path -> https://storage.googleapis.com/bucket/path
        url = "https://storage.googleapis.com/" + uri[5:]
    req = urllib.request.Request(url, headers={"User-Agent": "GameDirectorPro/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def generate_shot(
    shot: Dict,
    aspect_ratio: str = "9:16",
    model: Optional[str] = None,
    output_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    生成单镜视频。
    shot: { shot_id, video_prompt, duration, asset_source }
    asset_source: "library:<url>" 为图生视频，否则文生视频。
    """
    shot_id = shot.get("shot_id", "?")
    prompt = shot.get("video_prompt", "")
    duration = int(shot.get("duration", DEFAULT_DURATION))
    asset_source = shot.get("asset_source", "ai_generate")

    use_i2v = asset_source.startswith("library:")
    image_base64 = None
    if use_i2v:
        src = asset_source.replace("library:", "").strip()
        if src.startswith("http://") or src.startswith("https://"):
            try:
                image_base64 = _fetch_image_as_base64(src)
            except Exception as e:
                return {"shot_id": shot_id, "status": "failed", "error": f"下载参考图失败: {e}"}
        elif len(src) > 100:  # 可能是 base64
            image_base64 = src.replace("data:image/", "").split(";base64,")[-1] if "base64," in src else src

    print(f"\n[Shot {shot_id}] Compass Veo …")
    result = _generate_veo_shot(
        prompt=prompt,
        duration=duration,
        aspect_ratio=aspect_ratio,
        image_base64=image_base64,
    )
    if not result.get("ok"):
        return {"shot_id": shot_id, "status": "failed", "error": result.get("error", "Unknown")}

    uri = result["uri"]
    try:
        video_bytes = _download_video(uri)
    except Exception as e:
        return {"shot_id": shot_id, "status": "failed", "error": f"下载视频失败: {e}"}

    out_path = None
    if output_dir:
        output_dir.mkdir(parents=True, exist_ok=True)
        out_path = output_dir / f"shot_{str(shot_id).zfill(2)}.mp4"
        with open(out_path, "wb") as f:
            f.write(video_bytes)
        print(f"[Shot {shot_id}] OK -> {out_path}")

    return {
        "shot_id": shot_id,
        "status": "success",
        "video_url": f"data:video/mp4;base64,{base64.b64encode(video_bytes).decode('ascii')}",
        "output_path": str(out_path) if out_path else None,
    }


def batch_generate(
    shots: List[Dict],
    aspect_ratio: str = "9:16",
    output_dir: Optional[str] = None,
) -> List[Dict]:
    """批量生成，保存到 output_dir。"""
    out = Path(output_dir) if output_dir else None
    results = []
    for i, shot in enumerate(shots, 1):
        print(f"\nProgress: [{i}/{len(shots)}]")
        r = generate_shot(shot, aspect_ratio=aspect_ratio, output_dir=out)
        results.append(r)
        if output_dir:
            with open(Path(output_dir) / "generation_results.json", "w", encoding="utf-8") as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
    return results


def main():
    parser = argparse.ArgumentParser(description="Compass Veo — Game Director 视频生成")
    parser.add_argument("--mode", choices=["text-to-video", "image-to-video"])
    parser.add_argument("--prompt", help="视频描述")
    parser.add_argument("--image", help="图生视频时的图片 URL 或 base64")
    parser.add_argument("--duration", type=int, default=DEFAULT_DURATION)
    parser.add_argument("--aspect-ratio", default="9:16", choices=["9:16", "16:9", "1:1"])
    parser.add_argument("--batch", action="store_true")
    parser.add_argument("--input", help="批量 JSON 文件")
    parser.add_argument("--output-dir", help="输出目录")
    parser.add_argument("--json-output", action="store_true")
    args = parser.parse_args()

    if not API_KEY:
        print("ERROR: 请设置 COMPASS_API_KEY（与 h5-video-tool-api/.env 一致）", file=sys.stderr)
        sys.exit(1)

    if args.batch:
        if not args.input:
            print("Error: --input 必填"); sys.exit(1)
        with open(args.input, encoding="utf-8") as f:
            data = json.load(f)
        shots = data if isinstance(data, list) else data.get("shots", [])
        results = batch_generate(shots, args.aspect_ratio, args.output_dir)
        print(json.dumps(results, indent=2, ensure_ascii=False) if args.json_output
              else f"\n完成: {sum(1 for r in results if r.get('status')=='success')}/{len(results)} 镜")

    elif args.mode == "text-to-video":
        if not args.prompt:
            print("Error: --prompt 必填"); sys.exit(1)
        shot = {"shot_id": "01", "video_prompt": args.prompt, "duration": args.duration, "asset_source": "ai_generate"}
        r = generate_shot(shot, args.aspect_ratio, output_dir=Path(args.output_dir) if args.output_dir else None)
        print(json.dumps(r, indent=2, ensure_ascii=False) if args.json_output
              else f"\n{'✅' if r.get('status')=='success' else '❌'} {r.get('output_path', r.get('error'))}")

    elif args.mode == "image-to-video":
        if not args.prompt or not args.image:
            print("Error: --prompt 和 --image 必填"); sys.exit(1)
        shot = {"shot_id": "01", "video_prompt": args.prompt, "duration": args.duration, "asset_source": f"library:{args.image}"}
        r = generate_shot(shot, args.aspect_ratio, output_dir=Path(args.output_dir) if args.output_dir else None)
        print(json.dumps(r, indent=2, ensure_ascii=False) if args.json_output
              else f"\n{'✅' if r.get('status')=='success' else '❌'} {r.get('output_path', r.get('error'))}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
