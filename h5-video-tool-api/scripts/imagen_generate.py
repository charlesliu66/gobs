#!/usr/bin/env python3
"""
Compass Imagen 图像生成 - 与 Compass Capabilities 文档一致
用法: python imagen_generate.py "A dog reading a newspaper" 16:9
参考图: 环境变量 COMPASS_REF_IMAGE_B64（base64），用于保持风格一致
输出: JSON { "ok": true, "imageBase64": "..." } 到 stdout
"""
import sys
import os
import json
import base64
import tempfile

API_KEY = os.environ.get("COMPASS_API_KEY", "").strip()
BASE_URL = os.environ.get("COMPASS_API_URL", "https://compass.llm.shopee.io/compass-api/v1").strip()
# 优先用环境变量；404 时依次尝试备选模型（Compass 项目可能未开通 imagen-4.0-preview）
DEFAULT_MODEL = os.environ.get("COMPASS_IMAGEN_MODEL", "").strip()
FALLBACK_MODELS = [
    "imagen-4.0-generate-preview-06-06",
    "imagen-4.0-generate-001",
    "imagen-3.0-generate-002",
]
REF_B64 = os.environ.get("COMPASS_REF_IMAGE_B64", "").strip()


def _extract_bytes(img):
    raw = getattr(img, "image_bytes", None) or getattr(img, "_image_bytes", None)
    if raw is None and hasattr(img, "save"):
        import tempfile as tf
        with tf.NamedTemporaryFile(suffix=".png", delete=False) as f:
            img.save(f.name)
            try:
                with open(f.name, "rb") as r:
                    raw = r.read()
            finally:
                try:
                    os.unlink(f.name)
                except OSError:
                    pass
    return raw


def main():
    prompt = sys.argv[1] if len(sys.argv) > 1 else "A cute bear in a forest"
    aspect_ratio = sys.argv[2] if len(sys.argv) > 2 else "16:9"
    if not API_KEY:
        print(json.dumps({"ok": False, "error": "COMPASS_API_KEY not set"}), file=sys.stderr)
        sys.exit(1)
    try:
        from google import genai
        from google.genai.types import GenerateImagesConfig, HttpOptions
    except ImportError:
        print(json.dumps({"ok": False, "error": "pip install google-genai"}), file=sys.stderr)
        sys.exit(1)

    client = genai.Client(
        vertexai=True,
        api_key=API_KEY,
        http_options=HttpOptions(
            api_version="v1",
            base_url=BASE_URL,
        ),
    )

    model = os.environ.get("IMAGEN_MODEL", "").strip() or DEFAULT_MODEL
    models_to_try = [model] + [m for m in FALLBACK_MODELS if m != model] if model else FALLBACK_MODELS

    config_kw = {}
    if aspect_ratio:
        config_kw["aspect_ratio"] = aspect_ratio

    image = None
    if REF_B64:
        try:
            from google.genai.types import (
                Image,
                RawReferenceImage,
                EditImageConfig,
            )
            ref_bytes = base64.b64decode(REF_B64)
            suffix = ".png"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tf:
                tf.write(ref_bytes)
                ref_path = tf.name
            try:
                if hasattr(Image, "from_file"):
                    img_obj = Image.from_file(location=ref_path)
                else:
                    img_obj = Image(image_bytes=ref_bytes, mime_type="image/png")
                raw_ref = RawReferenceImage(
                    reference_image=img_obj,
                    reference_id=0,
                    reference_type="REFERENCE_TYPE_RAW",
                )
                edit_model = os.environ.get("COMPASS_IMAGEN_EDIT_MODEL", "imagen-3.0-capability-001").strip()
                edit_config = EditImageConfig(aspect_ratio=aspect_ratio) if aspect_ratio else EditImageConfig()
                image = client.models.edit_image(
                    model=edit_model or model,
                    prompt=prompt,
                    reference_images=[raw_ref],
                    config=edit_config,
                )
            finally:
                try:
                    os.unlink(ref_path)
                except OSError:
                    pass
        except Exception as e:
            if os.environ.get("COMPASS_REF_DEBUG"):
                print(json.dumps({"ok": False, "error": f"edit_image failed: {e}"}), file=sys.stderr)
            err_str = str(e).lower()
            if "404" in err_str or "not found" in err_str:
                print("[imagen] edit_image 模型不可用，将使用纯文生图", file=sys.stderr)
            image = None

    if image is None:
        last_err = None
        for try_model in models_to_try:
            try:
                image = client.models.generate_images(
                    model=try_model,
                    prompt=prompt,
                    config=GenerateImagesConfig(**config_kw) if config_kw else GenerateImagesConfig(),
                )
                break
            except Exception as e:
                last_err = e
                err_str = str(e).lower()
                if "404" in err_str or "not found" in err_str or "does not have access" in err_str:
                    print(f"[imagen] 模型 {try_model} 不可用，尝试下一个", file=sys.stderr)
                    continue
                raise
        if image is None and last_err:
            raise last_err

    if not image.generated_images or len(image.generated_images) == 0:
        print(json.dumps({"ok": False, "error": "No image generated"}), file=sys.stderr)
        sys.exit(1)

    img = image.generated_images[0].image
    # image_bytes 可能是 bytes，转为 base64
    raw = getattr(img, "image_bytes", None) or getattr(img, "_image_bytes", None)
    if raw is None and hasattr(img, "save"):
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            img.save(f.name)
            with open(f.name, "rb") as r:
                raw = r.read()
            os.unlink(f.name)
    if raw is None:
        print(json.dumps({"ok": False, "error": "Cannot extract image bytes"}), file=sys.stderr)
        sys.exit(1)
    if isinstance(raw, str):
        b64 = raw
    else:
        b64 = base64.b64encode(raw).decode("ascii")
    print(json.dumps({"ok": True, "imageBase64": b64}))


if __name__ == "__main__":
    main()
