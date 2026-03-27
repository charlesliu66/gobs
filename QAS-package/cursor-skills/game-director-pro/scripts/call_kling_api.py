#!/usr/bin/env python3
"""
Volcengine Seedance 1.5 Pro Video Client — Game Director Video Skill
Calls the Volcengine (ByteDance) Ark API to generate video clips for each shot.
Supports text-to-video and image-to-video via doubao-seedance-1-5-pro-251215.

Usage:
    python call_kling_api.py --mode text-to-video --prompt "..." --duration 5
    python call_kling_api.py --mode image-to-video --image <url> --prompt "..." --duration 5
    python call_kling_api.py --batch --input <shots_json> [--output-dir <dir>]

API Key: set SEEDANCE_API_KEY env var, or pass --api-key
Docs:    https://www.volcengine.com/docs/82379/1399008
"""

import os
import sys
import json
import time
import argparse
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional, Dict, Any, List


# ── Endpoints (Volcengine Ark) ─────────────────────────────────────────────────
ARK_BASE_URL      = "https://ark.cn-beijing.volces.com/api/v3"
SUBMIT_ENDPOINT   = f"{ARK_BASE_URL}/contents/generations/tasks"
STATUS_ENDPOINT   = f"{ARK_BASE_URL}/contents/generations/tasks/{{task_id}}"

# ── Model ──────────────────────────────────────────────────────────────────────
DEFAULT_MODEL = "doubao-seedance-1-5-pro-251215"

# ── Defaults ───────────────────────────────────────────────────────────────────
DEFAULT_DURATION  = 5      # seconds per shot
POLL_INTERVAL     = 8      # seconds between status checks
MAX_WAIT_TIME     = 600    # max 10 min per shot

HARDCODED_API_KEY = "1dd1ee9f-3b7e-4800-8541-d9ff6db58e08"


def _resolve_api_key(cli_key: str = "") -> str:
    """Resolve API key: CLI arg → SEEDANCE_API_KEY env → hardcoded default."""
    if cli_key:
        return cli_key
    env_key = os.environ.get("SEEDANCE_API_KEY", "")
    if env_key:
        return env_key
    return HARDCODED_API_KEY


def _make_request(url: str, method: str = "GET", data: Optional[dict] = None,
                  api_key: str = "") -> Dict[str, Any]:
    """Generic HTTP helper with error handling."""
    headers = {
        "Content-Type":  "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    body = json.dumps(data).encode("utf-8") if data else None
    req  = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8")
        try:
            detail = json.loads(detail)
        except Exception:
            pass
        return {"error": f"HTTP {e.code}: {e.reason}", "detail": detail}
    except urllib.error.URLError as e:
        return {"error": f"Connection error: {e.reason}"}
    except Exception as e:
        return {"error": str(e)}


# ── Build prompt string with Seedance parameters ───────────────────────────────

def _build_prompt(prompt: str, duration: int, camera_fixed: bool = False,
                  watermark: bool = False) -> str:
    """
    Append Seedance inline parameters to the prompt string.
    Seedance 1.5 supports inline flags:
      --duration <seconds>
      --camerafixed <true|false>
      --watermark <true|false>
    """
    flags = f"--duration {duration} --camerafixed {str(camera_fixed).lower()} --watermark {str(watermark).lower()}"
    return f"{prompt}  {flags}"


# ── Submission ─────────────────────────────────────────────────────────────────

def _submit_job(prompt: str, image_url: Optional[str], duration: int,
                api_key: str, model: str = DEFAULT_MODEL,
                camera_fixed: bool = False, watermark: bool = False) -> Dict[str, Any]:
    """
    Submit a video generation task to Volcengine Ark.
    Content array: always starts with text, optionally followed by image_url.
    """
    full_prompt = _build_prompt(prompt, duration, camera_fixed, watermark)

    content: List[Dict] = [{"type": "text", "text": full_prompt}]
    if image_url:
        content.append({"type": "image_url", "image_url": {"url": image_url}})

    payload = {
        "model":   model,
        "content": content,
    }
    return _make_request(SUBMIT_ENDPOINT, method="POST", data=payload, api_key=api_key)


# ── Polling ────────────────────────────────────────────────────────────────────

def _poll_task(task_id: str, api_key: str) -> Dict[str, Any]:
    """Poll task status until completed, failed, or timeout."""
    url     = STATUS_ENDPOINT.format(task_id=task_id)
    elapsed = 0

    while elapsed < MAX_WAIT_TIME:
        result = _make_request(url, method="GET", api_key=api_key)

        if result.get("error"):
            return result

        status = result.get("status", "")   # queued / running / succeeded / failed

        if status == "succeeded":
            # content may be a dict (not array) in actual API response
            content = result.get("content", {})
            if isinstance(content, dict):
                video_url = content.get("video_url", "")
            else:
                # fallback: iterate array
                video_url = ""
                for item in (content or []):
                    if isinstance(item, dict) and item.get("type") == "video_url":
                        video_url = item.get("video_url", {}).get("url", "")
                        break
            return {
                "status":    "success",
                "task_id":   task_id,
                "video_url": video_url,
                "raw":       result,
            }

        if status in ("failed", "error"):
            return {
                "status":  "failed",
                "task_id": task_id,
                "error":   result.get("error", {}).get("message", "Unknown error")
                           if isinstance(result.get("error"), dict)
                           else result.get("error", "Unknown error"),
                "raw":     result,
            }

        time.sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL
        print(f"  ... [{task_id}] {status or 'processing'} ({elapsed}s)", flush=True)

    return {
        "status":  "timeout",
        "task_id": task_id,
        "error":   f"Task did not complete within {MAX_WAIT_TIME}s",
    }


# ── Single shot ────────────────────────────────────────────────────────────────

def generate_shot(shot: Dict, api_key: str, aspect_ratio: str = "9:16",
                  model: str = DEFAULT_MODEL) -> Dict[str, Any]:
    """
    Generate one video shot.

    shot dict keys:
        shot_id      : str
        video_prompt : str   (English preferred, Chinese also works)
        duration     : int   (seconds, default 5)
        asset_source : str   ("library:<url>"  |  "ai_generate")
    """
    shot_id      = shot.get("shot_id", "?")
    prompt       = shot.get("video_prompt", "")
    duration     = int(shot.get("duration", DEFAULT_DURATION))
    asset_source = shot.get("asset_source", "ai_generate")

    use_i2v   = asset_source.startswith("library:")
    image_url = asset_source.replace("library:", "").strip() if use_i2v else None
    mode_label = "image-to-video" if use_i2v else "text-to-video"

    print(f"\n[Shot {shot_id}] Starting generation …")
    print(f"  Model    : {model}  ({mode_label})")
    print(f"  Duration : {duration}s  |  Ratio target: {aspect_ratio}")
    print(f"  Prompt   : {prompt[:90]}{'…' if len(prompt) > 90 else ''}")
    if image_url:
        print(f"  Image    : {image_url[:80]}")

    submit_resp = _submit_job(prompt, image_url, duration, api_key, model)

    if submit_resp.get("error"):
        print(f"[Shot {shot_id}] Submit failed: {submit_resp['error']}")
        return {"shot_id": shot_id, "status": "failed", "error": submit_resp["error"]}

    task_id = submit_resp.get("id", "")
    status  = submit_resp.get("status", "")
    print(f"[Shot {shot_id}] Task submitted → ID: {task_id}  status: {status}")

    if not task_id:
        return {"shot_id": shot_id, "status": "failed",
                "error": "No task id in response", "raw": submit_resp}

    # Poll
    result = _poll_task(task_id, api_key)
    result["shot_id"] = shot_id

    if result.get("status") == "success":
        print(f"[Shot {shot_id}] OK -> {result['video_url']}")
    else:
        print(f"[Shot {shot_id}] FAIL: {result.get('error', 'Unknown error')}")

    return result


# ── Batch ──────────────────────────────────────────────────────────────────────

def batch_generate(shots: List[Dict], api_key: str, aspect_ratio: str = "9:16",
                   model: str = DEFAULT_MODEL,
                   output_dir: Optional[str] = None) -> List[Dict]:
    """Generate all shots sequentially, saving incremental results."""
    results = []
    total   = len(shots)
    print(f"\n[Batch] {total} shots | Model: {model} | Ratio: {aspect_ratio}")
    print("=" * 60)

    for i, shot in enumerate(shots, 1):
        print(f"\nProgress: [{i}/{total}]")
        result = generate_shot(shot, api_key, aspect_ratio, model)
        results.append(result)

        if output_dir:
            Path(output_dir).mkdir(parents=True, exist_ok=True)
            out_path = Path(output_dir) / "generation_results.json"
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(results, f, indent=2, ensure_ascii=False)

    return results


def format_final_report(results: List[Dict]) -> str:
    lines = ["## Video Generation Complete", ""]
    lines.append("| Shot | Status | URL |")
    lines.append("|------|--------|-----|")
    ok = 0
    for r in results:
        sid = r.get("shot_id", "?")
        if r.get("status") == "success":
            url = r.get("video_url", "N/A")
            lines.append(f"| {sid} | OK | {url} |")
            ok += 1
        else:
            err = str(r.get("error", "Unknown"))[:60]
            lines.append(f"| {sid} | FAIL | {err} |")
    lines += ["", f"**Result**: {ok}/{len(results)} shots generated successfully"]
    if ok == len(results):
        lines += ["", "**Next step**: Download clips → assemble in Premiere / DaVinci / CapCut."]
    return "\n".join(lines)


# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Volcengine Seedance 1.5 Pro — Game Director Video Skill"
    )
    parser.add_argument("--api-key",  default="",
                        help="API key (or set SEEDANCE_API_KEY env var)")
    parser.add_argument("--model",    default=DEFAULT_MODEL,
                        help=f"Model name (default: {DEFAULT_MODEL})")
    parser.add_argument("--mode",     choices=["text-to-video", "image-to-video"],
                        help="Generation mode for single shot")
    parser.add_argument("--prompt",   help="Video prompt")
    parser.add_argument("--image",    help="Image URL (image-to-video mode)")
    parser.add_argument("--duration", type=int, default=DEFAULT_DURATION,
                        help=f"Duration in seconds (default: {DEFAULT_DURATION})")
    parser.add_argument("--aspect-ratio", default="9:16",
                        choices=["9:16", "16:9", "1:1"])
    parser.add_argument("--camera-fixed", action="store_true",
                        help="Fix camera position (--camerafixed true)")
    parser.add_argument("--watermark",    action="store_true",
                        help="Add watermark")
    parser.add_argument("--batch",        action="store_true",
                        help="Batch mode from JSON file")
    parser.add_argument("--input",        help="JSON file with shots array (batch)")
    parser.add_argument("--output-dir",   help="Directory to save results JSON")
    parser.add_argument("--json-output",  action="store_true",
                        help="Print raw JSON result")

    args    = parser.parse_args()
    api_key = _resolve_api_key(args.api_key)

    if args.batch:
        if not args.input:
            print("Error: --input required for batch mode"); sys.exit(1)
        with open(args.input, encoding="utf-8") as f:
            data = json.load(f)
        shots   = data if isinstance(data, list) else data.get("shots", [])
        results = batch_generate(shots, api_key, args.aspect_ratio, args.model, args.output_dir)
        print(json.dumps(results, indent=2, ensure_ascii=False) if args.json_output
              else "\n" + format_final_report(results))

    elif args.mode == "text-to-video":
        if not args.prompt:
            print("Error: --prompt required"); sys.exit(1)
        shot   = {"shot_id": "01", "video_prompt": args.prompt,
                  "duration": args.duration, "asset_source": "ai_generate"}
        result = generate_shot(shot, api_key, args.aspect_ratio, args.model)
        print(json.dumps(result, indent=2, ensure_ascii=False) if args.json_output
              else f"\n{'✅' if result.get('status')=='success' else '❌'}  {result.get('video_url', result.get('error'))}")

    elif args.mode == "image-to-video":
        if not args.prompt or not args.image:
            print("Error: --prompt and --image required"); sys.exit(1)
        shot   = {"shot_id": "01", "video_prompt": args.prompt,
                  "duration": args.duration, "asset_source": f"library:{args.image}"}
        result = generate_shot(shot, api_key, args.aspect_ratio, args.model)
        print(json.dumps(result, indent=2, ensure_ascii=False) if args.json_output
              else f"\n{'✅' if result.get('status')=='success' else '❌'}  {result.get('video_url', result.get('error'))}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
