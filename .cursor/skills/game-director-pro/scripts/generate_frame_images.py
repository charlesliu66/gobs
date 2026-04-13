#!/usr/bin/env python3
"""
首帧/尾帧图批量生成 — Game Director Video Skill

**根据脚本/分镜表**：按每个镜头的 first_frame_prompt / last_frame_prompt 调用生图 API，产出**每镜不同构图**的 shot_XX_first_frame.png、shot_XX_last_frame.png（如镜1=背影废墟、镜2=刀特写、镜3=侧脸等），同一角色靠 prompt 中的「角色设定卡」前缀尽量一致。禁止把同一张参考图简单缩放套用到所有镜头。

绑定方式：见 references/frame_image_api_guide.md（火山 Ark 设 FRAME_IMAGE_API_URL=volcano 等）

Usage:
  python generate_frame_images.py --input frames_batch.json [--output-dir ./output/frames]
"""

import os
import sys
import json
import base64
import time
import argparse
import urllib.request
import urllib.error
from pathlib import Path

# 尝试从 .env 加载（可选）：skill 目录、QAS/h5-video-tool-api、cwd
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

# 竖屏 9:16 常用分辨率
DEFAULT_WIDTH = 1080
DEFAULT_HEIGHT = 1920

# Gemini 生图模型（generateContent 接口）
GEMINI_IMAGEN_MODEL = os.environ.get("GEMINI_IMAGEN_MODEL", "gemini-1.5-flash")

# 火山 Ark 文生图（Seedream）：使用 /images/generations 同步接口
VOLCANO_ARK_IMAGE_MODEL = os.environ.get("FRAME_IMAGE_API_MODEL", "")
ARK_IMAGE_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations"


def _get_config():
    """从环境变量读取 API 绑定配置。优先：Compass → 火山 Ark → Gemini → generic。"""
    provider = os.environ.get("FRAME_IMAGE_PROVIDER", "").strip().lower()
    # Compass Imagen（与 QAS h5-video-tool-api 共用 COMPASS_API_KEY）
    compass_key = os.environ.get("COMPASS_API_KEY", "").strip()
    if compass_key and (provider == "compass" or provider == ""):
        return {
            "provider": "compass",
            "api_key": compass_key,
            "api_url": os.environ.get("COMPASS_API_URL", "http://compass.llm.shopee.io/compass-api/v1").strip(),
            "model": os.environ.get("COMPASS_IMAGEN_MODEL", "imagen-4.0-generate-preview-06-06").strip(),
        }
    # 火山 Ark 生图
    api_key = (os.environ.get("FRAME_IMAGE_API_KEY", "").strip() or
               os.environ.get("ARK_API_KEY", "").strip())
    api_url = os.environ.get("FRAME_IMAGE_API_URL", "").strip()
    if api_key and (provider == "volcano" or api_url.lower() == "volcano" or (not api_url and len(api_key) == 36 and "-" in api_key)):
        model = os.environ.get("FRAME_IMAGE_API_MODEL", "").strip() or VOLCANO_ARK_IMAGE_MODEL
        if not model:
            print("ERROR: 火山 Ark 生图需在控制台创建 Seedream 文生图模型单元，并将 Endpoint ID 设为 FRAME_IMAGE_API_MODEL（如 ep-2024xxxx-xxxx）。", file=sys.stderr)
            sys.exit(1)
        return {"provider": "volcano", "api_key": api_key, "api_url": ARK_IMAGE_URL, "model": model}
    # Gemini
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip() or os.environ.get("GOOGLE_API_KEY", "").strip()
    if gemini_key:
        return {"provider": "gemini", "api_key": gemini_key, "api_url": "", "model": GEMINI_IMAGEN_MODEL}
    model = os.environ.get("FRAME_IMAGE_API_MODEL", "").strip()
    if not api_key or not api_url:
        print("ERROR: 请设置 COMPASS_API_KEY（Compass Imagen）或 FRAME_IMAGE_API_KEY（火山 Ark）或 GEMINI_API_KEY。", file=sys.stderr)
        print("Compass 时设 FRAME_IMAGE_PROVIDER=compass 或留空；参见 references/frame_image_api_guide.md", file=sys.stderr)
        sys.exit(1)
    return {"provider": "generic", "api_key": api_key, "api_url": api_url, "model": model}


def _call_gemini_imagen(prompt: str, config: dict, width: int = DEFAULT_WIDTH, height: int = DEFAULT_HEIGHT) -> bytes:
    """使用 Gemini generateContent 原生图像生成（Nano Banana，AIzaSy Key）。"""
    api_key = config["api_key"]
    model = config.get("model") or GEMINI_IMAGEN_MODEL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"], "responseMimeType": "text/plain"},
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            out = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode(errors="replace")
        raise RuntimeError(f"Gemini API HTTP {e.code}: {err_body[:500]}")
    cands = out.get("candidates", [])
    if not cands:
        raise RuntimeError("Gemini 未返回 candidates: " + json.dumps(out)[:800])
    parts = cands[0].get("content", {}).get("parts", [])
    for part in parts:
        if "inlineData" in part:
            b64 = part["inlineData"].get("data")
            if b64:
                return base64.b64decode(b64)
    raise RuntimeError("Gemini 响应中无图片 inlineData: " + json.dumps(out)[:800])


def _call_compass_imagen(prompt: str, config: dict, width: int = DEFAULT_WIDTH, height: int = DEFAULT_HEIGHT) -> bytes:
    """Compass Imagen 文生图（与 QAS imagen_generate.py 一致）。"""
    try:
        from google import genai
        from google.genai.types import GenerateImagesConfig, HttpOptions
    except ImportError:
        raise RuntimeError("Compass Imagen 需要 pip install google-genai")
    api_key = config["api_key"]
    base_url = config.get("api_url", "http://compass.llm.shopee.io/compass-api/v1")
    model = config.get("model", "imagen-4.0-generate-preview-06-06")
    ar = "9:16" if height > width else ("16:9" if width > height else "1:1")
    client = genai.Client(
        vertexai=True,
        api_key=api_key,
        http_options=HttpOptions(api_version="v1", base_url=base_url),
    )
    image = client.models.generate_images(
        model=model,
        prompt=prompt,
        config=GenerateImagesConfig(aspect_ratio=ar),
    )
    if not image.generated_images or len(image.generated_images) == 0:
        raise RuntimeError("Compass Imagen 未返回图片")
    img = image.generated_images[0].image
    raw = getattr(img, "image_bytes", None) or getattr(img, "_image_bytes", None)
    if raw is None and hasattr(img, "save"):
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            img.save(f.name)
            with open(f.name, "rb") as r:
                raw = r.read()
            os.unlink(f.name)
    if raw is None:
        raise RuntimeError("无法从 Compass 响应提取图片")
    return raw if isinstance(raw, bytes) else base64.b64decode(raw)


def _call_volcano_ark_image(prompt: str, config: dict, width: int = DEFAULT_WIDTH, height: int = DEFAULT_HEIGHT) -> bytes:
    """火山 Ark 文生图（Seedream），同步接口 POST /api/v3/images/generations。"""
    api_key = config["api_key"]
    model = config.get("model") or VOLCANO_ARK_IMAGE_MODEL
    payload = {
        "model": model,
        "prompt": prompt,
        "sequential_image_generation": "disabled",
        "response_format": "url",
        "size": "2K",
        "stream": False,
        "watermark": True,
    }
    req = urllib.request.Request(
        ARK_IMAGE_URL,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
    )
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {api_key}")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            out = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Ark 生图失败 HTTP {e.code}: {e.read().decode(errors='replace')[:500]}")
    # 响应常见为 data[].url 或 data[].b64_json
    data = out.get("data", [])
    if not data:
        err = out.get("error", out)
        raise RuntimeError("Ark 未返回图片 data: " + json.dumps(err)[:400])
    item = data[0] if isinstance(data, list) else data
    image_url = item.get("url", "") or item.get("url", "")
    image_b64 = item.get("b64_json", "") or item.get("b64", "")
    if image_b64:
        return base64.b64decode(image_b64)
    if image_url:
        with urllib.request.urlopen(image_url, timeout=30) as r:
            return r.read()
    raise RuntimeError("Ark 响应中无 url/b64_json: " + json.dumps(out)[:500])


def _call_image_api(prompt: str, config: dict, width: int = DEFAULT_WIDTH, height: int = DEFAULT_HEIGHT) -> bytes:
    """
    调用生图 API，返回图片二进制内容。
    provider: compass → Compass Imagen；volcano → 火山 Ark；gemini → Google；否则 generic。
    """
    if config.get("provider") == "compass":
        return _call_compass_imagen(prompt, config, width, height)
    if config.get("provider") == "volcano":
        return _call_volcano_ark_image(prompt, config, width, height)
    if config.get("provider") == "gemini":
        return _call_gemini_imagen(prompt, config, width, height)
    url = config["api_url"]
    api_key = config["api_key"]
    model = config.get("model") or ""

    # 占位 body：Nano Banana 常见为 JSON，字段名以官方文档为准
    body = {
        "apiKey": api_key,
        "modelInputs": {
            "prompt": prompt,
            "image_width": width,
            "image_height": height,
        }
    }
    if model:
        body["modelInputs"]["model"] = model

    # 若 Nano Banana 使用不同结构（如 prompt 在顶层），请改这里
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as e:
        print(f"API 请求失败 HTTP {e.code}: {e.read().decode(errors='replace')}", file=sys.stderr)
        raise
    except Exception as e:
        print(f"请求异常: {e}", file=sys.stderr)
        raise

    # 响应可能是 JSON 内嵌 base64 图片，或直接为图片流，按实际 API 修改
    try:
        out = json.loads(raw.decode())
        # 常见：{ "modelOutputs": [ { "image_base64": "..." } ] } 或 "image": "base64..."
        if "modelOutputs" in out and len(out["modelOutputs"]) > 0:
            b64 = out["modelOutputs"][0].get("image_base64") or out["modelOutputs"][0].get("image")
        else:
            b64 = out.get("image_base64") or out.get("image")
        if b64:
            return base64.b64decode(b64)
    except (json.JSONDecodeError, KeyError, TypeError):
        pass
    # 若响应直接是图片
    return raw


def main():
    parser = argparse.ArgumentParser(description="按分镜脚本逐镜生成首帧/尾帧图（每镜不同构图，禁止拉伸同一张图）")
    parser.add_argument("--input", "-i", required=True, help="JSON：含 shot_id, first_frame_prompt, last_frame_prompt；或含 shots 数组的完整配置")
    parser.add_argument("--output-dir", "-o", default="./output/frames", help="输出目录")
    parser.add_argument("--width", type=int, default=DEFAULT_WIDTH, help="图片宽度")
    parser.add_argument("--height", type=int, default=DEFAULT_HEIGHT, help="图片高度")
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    with open(args.input, "r", encoding="utf-8") as f:
        raw = json.load(f)

    # 支持 [ {...}, ... ] 或 { "shots": [ ... ] }
    if isinstance(raw, dict) and "shots" in raw:
        items = raw["shots"]
    else:
        items = raw if isinstance(raw, list) else [raw]

    config = _get_config()

    for item in items:
        shot_id = str(item.get("shot_id", "")).zfill(2)
        first_prompt = item.get("first_frame_prompt", "")
        last_prompt = item.get("last_frame_prompt", "")
        if not first_prompt and not last_prompt:
            continue
        if first_prompt:
            try:
                data = _call_image_api(first_prompt, config, args.width, args.height)
                path = out_dir / f"shot_{shot_id}_first_frame.png"
                with open(path, "wb") as fp:
                    fp.write(data)
                print(f"OK shot_{shot_id}_first_frame.png")
            except Exception as e:
                print(f"FAIL shot_{shot_id}_first_frame: {e}", file=sys.stderr)
        if last_prompt:
            try:
                data = _call_image_api(last_prompt, config, args.width, args.height)
                path = out_dir / f"shot_{shot_id}_last_frame.png"
                with open(path, "wb") as fp:
                    fp.write(data)
                print(f"OK shot_{shot_id}_last_frame.png")
            except Exception as e:
                print(f"FAIL shot_{shot_id}_last_frame: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
