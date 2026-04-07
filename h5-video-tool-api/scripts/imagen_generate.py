#!/usr/bin/env python3
"""
Compass Imagen 图像生成 - 与 Compass Capabilities 文档一致
用法: python imagen_generate.py "A dog reading a newspaper" 16:9
长文案/中文：推荐由 Node 设置环境变量 COMPASS_IMAGEN_PROMPT、COMPASS_IMAGEN_ASPECT（避免 Windows 下 argv 编码导致与输入框不一致）
参考图: 环境变量 COMPASS_REF_IMAGE_B64（base64），用于保持风格一致
输出: JSON { "ok": true, "imageBase64": "..." } 到 stdout
"""
import sys
import os
import json
import base64
import tempfile

# 与 Node 一致：优先 COMPASS_API_KEY2（CLI 直连时）
API_KEY = (
    os.environ.get("COMPASS_API_KEY2", "").strip()
    or os.environ.get("COMPASS_API_KEY", "").strip()
)
BASE_URL = os.environ.get("COMPASS_API_URL", "https://compass.llm.shopee.io/compass-api/v1").strip()
# 优先用 COMPASS_IMAGEN_MODEL；未设置时按下列顺序尝试（仅 Gemini 3.x 图像模型，见 ai.google.dev 文档）
DEFAULT_MODEL = os.environ.get("COMPASS_IMAGEN_MODEL", "").strip()
# 重画质：先 Gemini 3 Pro Image，失败再 3.1 Flash Image（均为官方 preview id）
FALLBACK_MODELS = [
    "gemini-3-pro-image-preview",
    "gemini-3.1-flash-image-preview",
]
REF_B64 = os.environ.get("COMPASS_REF_IMAGE_B64", "").strip()
# 首镜首帧：后续镜头 Gemini 多模态锁定画风（非 edit_image，避免场景被垫图绑架）
STYLE_REF_B64 = os.environ.get("COMPASS_STYLE_REF_B64", "").strip()


def _is_gemini_image_model(model_id: str) -> bool:
    m = (model_id or "").lower()
    return "flash-image" in m or "pro-image" in m


def _generate_gemini_flash_image(client, model_id: str, prompt: str, aspect_ratio: str) -> bytes:
    """Gemini 图像模型（3.1 Flash Image / 3 Pro Image 等）：generate_content + IMAGE。"""
    from google.genai.types import GenerateContentConfig, Modality, ImageConfig

    ar = aspect_ratio or "16:9"
    cfg = GenerateContentConfig(
        response_modalities=[Modality.TEXT, Modality.IMAGE],
        image_config=ImageConfig(aspect_ratio=ar),
    )
    full = (
        "Render a single still image. Follow the scene description faithfully; "
        "do not replace with unrelated landscapes, vehicles, or generic stock scenes.\n\n"
        + prompt
    )
    response = client.models.generate_content(
        model=model_id,
        contents=full,
        config=cfg,
    )
    if not response.candidates:
        raise RuntimeError("Gemini image: empty candidates")
    parts = response.candidates[0].content.parts
    for part in parts:
        inline = getattr(part, "inline_data", None)
        if inline is None:
            continue
        data = getattr(inline, "data", None)
        if not data:
            continue
        if isinstance(data, bytes):
            return data
        if isinstance(data, str):
            return base64.b64decode(data)
        return bytes(data)
    raise RuntimeError("Gemini image: no inline_data in response")


def _gemini_image_with_style_ref(
    client, model_id: str, prompt: str, aspect_ratio: str, ref_bytes: bytes
) -> bytes:
    """首镜画面 + 文本：强制后续镜头与首镜影调一致。"""
    from google.genai.types import GenerateContentConfig, Modality, ImageConfig, Part

    ar = aspect_ratio or "16:9"
    cfg = GenerateContentConfig(
        response_modalities=[Modality.TEXT, Modality.IMAGE],
        image_config=ImageConfig(aspect_ratio=ar),
    )
    text = (
        "Image 1 is the opening shot of this film sequence. Match its color grading, lighting, texture, "
        "and character styling. Output ONE new still for the scene below (new composition and action). "
        "Stay in the same visual universe; do not switch to unrelated genres, vehicles, or stock landscapes.\n\n"
        + prompt
    )
    p_img = Part.from_bytes(data=ref_bytes, mime_type="image/png")
    p_txt = Part(text=text)
    response = client.models.generate_content(
        model=model_id,
        contents=[p_img, p_txt],
        config=cfg,
    )
    if not response.candidates:
        raise RuntimeError("Gemini style-ref: empty candidates")
    parts = response.candidates[0].content.parts
    for part in parts:
        inline = getattr(part, "inline_data", None)
        if inline is None:
            continue
        data = getattr(inline, "data", None)
        if not data:
            continue
        if isinstance(data, bytes):
            return data
        if isinstance(data, str):
            return base64.b64decode(data)
        return bytes(data)
    raise RuntimeError("Gemini style-ref: no image in response")


def _gemini_image_with_character_ref(
    client, model_id: str, prompt: str, aspect_ratio: str, ref_bytes: bytes
) -> bytes:
    """Imagen edit_image 失败时的回退：用用户参考图进 Gemini，强调保留五官/肤色/发型（与全片「画风图」语义不同）。"""
    from google.genai.types import GenerateContentConfig, Modality, ImageConfig, Part

    ar = aspect_ratio or "16:9"
    cfg = GenerateContentConfig(
        response_modalities=[Modality.TEXT, Modality.IMAGE],
        image_config=ImageConfig(aspect_ratio=ar),
    )
    text = (
        "Image 1 is the user's character reference. Preserve facial proportions, skin tone, hairstyle, "
        "and body type as closely as possible. Output a full-body portrait: entire figure from head to toe, "
        "front-facing, centered. Background must be solid pure white (#FFFFFF) only; ignore any scenery in the reference image. "
        "Only change clothing or facial lighting as requested in the text below. "
        "Do not change ethnicity or replace the face with a different person.\n\n"
        + prompt
    )
    p_img = Part.from_bytes(data=ref_bytes, mime_type="image/png")
    p_txt = Part(text=text)
    response = client.models.generate_content(
        model=model_id,
        contents=[p_img, p_txt],
        config=cfg,
    )
    if not response.candidates:
        raise RuntimeError("Gemini character-ref: empty candidates")
    parts = response.candidates[0].content.parts
    for part in parts:
        inline = getattr(part, "inline_data", None)
        if inline is None:
            continue
        data = getattr(inline, "data", None)
        if not data:
            continue
        if isinstance(data, bytes):
            return data
        if isinstance(data, str):
            return base64.b64decode(data)
        return bytes(data)
    raise RuntimeError("Gemini character-ref: no image in response")


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
    # 优先环境变量：与 h5-video-tool-api imagenPython 一致，保证 UTF-8 中文与长文本不被 argv 截断/乱码
    prompt = os.environ.get("COMPASS_IMAGEN_PROMPT", "").strip()
    aspect_ratio = os.environ.get("COMPASS_IMAGEN_ASPECT", "").strip()
    if not prompt:
        prompt = sys.argv[1] if len(sys.argv) > 1 else "A cute bear in a forest"
    if not aspect_ratio:
        aspect_ratio = sys.argv[2] if len(sys.argv) > 2 else "16:9"

    if os.environ.get("COMPASS_IMAGEN_DEBUG"):
        preview = (prompt[:400] + "…") if len(prompt) > 400 else prompt
        print(f"[imagen] DEBUG len={len(prompt)} prompt:\n{preview}", file=sys.stderr)

    if not API_KEY:
        print(
            json.dumps({"ok": False, "error": "COMPASS_API_KEY2 or COMPASS_API_KEY not set"}),
            file=sys.stderr,
        )
        sys.exit(1)
    try:
        from google import genai
        from google.genai.types import GenerateImagesConfig, HttpOptions
    except ImportError:
        print(json.dumps({"ok": False, "error": "pip install google-genai"}), file=sys.stderr)
        sys.exit(1)

    http_opts = HttpOptions(
        api_version="v1",
        base_url=BASE_URL,
    )
    client_vertex = genai.Client(
        vertexai=True,
        api_key=API_KEY,
        http_options=http_opts,
    )
    # Compass 文档中 Gemini 文/图 generate_content 示例不使用 vertexai=True
    client_gemini = genai.Client(
        api_key=API_KEY,
        http_options=http_opts,
    )

    model = os.environ.get("IMAGEN_MODEL", "").strip() or DEFAULT_MODEL
    models_to_try = [model] + [m for m in FALLBACK_MODELS if m != model] if model else FALLBACK_MODELS

    config_kw = {}
    if aspect_ratio:
        config_kw["aspect_ratio"] = aspect_ratio

    image = None
    used_model = None  # 实际调用成功的模型 id，回传给 Node 便于排查
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
                image = client_vertex.models.edit_image(
                    model=edit_model or model,
                    prompt=prompt,
                    reference_images=[raw_ref],
                    config=edit_config,
                )
                used_model = (edit_model or model) or None
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

    result_bytes = None
    if image is None:
        last_err = None
        style_ref_bytes = base64.b64decode(STYLE_REF_B64) if STYLE_REF_B64 else None
        ref_bytes = base64.b64decode(REF_B64) if REF_B64 else None
        for try_model in models_to_try:
            try:
                if _is_gemini_image_model(try_model):
                    if style_ref_bytes:
                        result_bytes = _gemini_image_with_style_ref(
                            client_gemini, try_model, prompt, aspect_ratio, style_ref_bytes
                        )
                    elif ref_bytes:
                        result_bytes = _gemini_image_with_character_ref(
                            client_gemini, try_model, prompt, aspect_ratio, ref_bytes
                        )
                    else:
                        result_bytes = _generate_gemini_flash_image(
                            client_gemini, try_model, prompt, aspect_ratio
                        )
                    used_model = try_model
                    print(f"[imagen] Gemini 生图成功: {try_model}", file=sys.stderr)
                    break
                imagen_prompt = prompt
                if STYLE_REF_B64:
                    imagen_prompt += (
                        "\n\n[Continuity] Match the same film color palette, lighting, lens texture, "
                        "and production design as the opening shot of this sequence. No genre or era shift."
                    )
                image = client_vertex.models.generate_images(
                    model=try_model,
                    prompt=imagen_prompt,
                    config=GenerateImagesConfig(**config_kw) if config_kw else GenerateImagesConfig(),
                )
                used_model = try_model
                break
            except Exception as e:
                last_err = e
                err_str = str(e).lower()
                if (
                    "404" in err_str
                    or "not found" in err_str
                    or "does not have access" in err_str
                    or "403" in err_str
                    or "permission" in err_str
                    or "no permission" in err_str
                ):
                    print(f"[imagen] 模型 {try_model} 不可用，尝试下一个", file=sys.stderr)
                    continue
                raise
        if image is None and result_bytes is None and last_err:
            raise last_err
        if image is None and result_bytes is None:
            print(json.dumps({"ok": False, "error": "No image model available"}), file=sys.stderr)
            sys.exit(1)

    if result_bytes is not None:
        b64 = base64.b64encode(result_bytes).decode("ascii")
        out = {"ok": True, "imageBase64": b64}
        if used_model:
            out["model"] = used_model
            print(f"[imagen] 本次成功模型: {used_model}", file=sys.stderr)
        print(json.dumps(out))
        return

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
    out = {"ok": True, "imageBase64": b64}
    if used_model:
        out["model"] = used_model
        print(f"[imagen] 本次成功模型: {used_model}", file=sys.stderr)
    print(json.dumps(out))


if __name__ == "__main__":
    main()
