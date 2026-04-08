"""环境变量与账号池（云手机 id 列表）。"""

from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv

# 本子目录与仓库根各一份 .env（从 tiktok-prd-bot 启动时也能读到上级 GeeLark 配置）
_PKG = Path(__file__).resolve().parent
_REPO_ROOT = _PKG.parent
load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_PKG / ".env")

# 数据库默认放在本包目录，也可用 TIKTOK_BOT_DB 覆盖
DB_PATH = os.getenv("TIKTOK_BOT_DB", str(_PKG / "tiktok_bot.db"))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL")  # 可选，兼容代理 / 第三方
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

GEELARK_USE_ASIA = os.getenv("GEELARK_USE_ASIA", "").lower() in ("1", "true", "yes")

# ms_token：首次从浏览器 Cookie 复制；也可在 Streamlit 侧边栏填写
MS_TOKEN = os.getenv("TIKTOK_MS_TOKEN", "").strip() or None


def load_accounts() -> list[dict]:
    """
    账号池：每项至少含 id（GeeLark 云手机 env id）。
    - 环境变量 GEELARK_ACCOUNTS_JSON：JSON 文件路径，如 [{"id":"xxx"},{"id":"yyy"}]
    - 或 GEELARK_PHONE_IDS：逗号分隔 id
    """
    path = os.getenv("GEELARK_ACCOUNTS_JSON", "").strip()
    if path:
        p = Path(path)
        if p.is_file():
            data = json.loads(p.read_text(encoding="utf-8"))
            if isinstance(data, list):
                return [x for x in data if isinstance(x, dict) and x.get("id")]
    raw = os.getenv("GEELARK_PHONE_IDS", "").strip()
    if raw:
        return [{"id": x.strip()} for x in raw.split(",") if x.strip()]
    return []
