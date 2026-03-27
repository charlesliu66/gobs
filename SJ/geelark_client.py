"""
GeeLark API 客户端（按官方 en-doc 实现）
- 认证：Token 验证（Bearer）或 Key 验证（appId + sign）。
- 请求：POST + JSON，必带 traceId（UUID v4）。
- 文档：User Guide/Cloud Phone/Request_Instructions.md
"""

import hashlib
import os
import time
import uuid
from typing import Any, Literal, Optional

import requests
from dotenv import load_dotenv

load_dotenv()

GEELARK_API_KEY = os.getenv("GEELARK_API_KEY")
GEELARK_APP_ID = os.getenv("GEELARK_APP_ID")
GEELARK_BEARER_TOKEN = os.getenv("GEELARK_BEARER_TOKEN")
GEELARK_BASE_URL = (
    os.getenv("GEELARK_BASE_URL", "https://openapi.geelark.com/open/v1").rstrip("/")
)


def _trace_id() -> str:
    """生成请求唯一 ID：UUID v4 转大写（与官方示例一致）。"""
    return uuid.uuid4().hex.upper()


def _sign_key_verification(trace_id: str, ts: str, nonce: str) -> str:
    """Key 验证：sign = SHA256(appId + traceId + ts + nonce + apiKey)，十六进制大写。"""
    raw = f"{GEELARK_APP_ID}{trace_id}{ts}{nonce}{GEELARK_API_KEY}"
    return hashlib.sha256(raw.encode()).hexdigest().upper()


def get_headers(
    auth: Literal["token", "key"] = "token",
    trace_id: Optional[str] = None,
) -> dict[str, str]:
    """
    构建请求头（官方 Request Instructions）。
    - auth="token"：Token 验证，仅需 traceId + Authorization: Bearer <token>。
    - auth="key"：Key 验证，需 appId, traceId, ts, nonce, sign。
    """
    tid = trace_id or _trace_id()
    headers: dict[str, str] = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "traceId": tid,
    }
    if auth == "token":
        if GEELARK_BEARER_TOKEN:
            headers["Authorization"] = f"Bearer {GEELARK_BEARER_TOKEN}"
    else:
        ts = str(int(time.time() * 1000))
        nonce = tid[:6]
        headers["appId"] = GEELARK_APP_ID or ""
        headers["ts"] = ts
        headers["nonce"] = nonce
        headers["sign"] = _sign_key_verification(tid, ts, nonce)
    return headers


def request(
    path: str,
    method: str = "POST",
    json: Optional[dict[str, Any]] = None,
    auth: Literal["token", "key"] = "token",
    trace_id: Optional[str] = None,
    **kwargs: Any,
) -> requests.Response:
    """
    调用 GeeLark 开放 API。
    - path: 接口路径，如 phone/list、task/query（不要带域名和 /open/v1）。
    - method: 一般为 POST（官方规定所有请求为 POST）。
    - json: 请求体。
    - auth: "token" 使用 Bearer；"key" 使用 appId + sign。
    """
    url = f"{GEELARK_BASE_URL}/{path.lstrip('/')}"
    headers = get_headers(auth=auth, trace_id=trace_id)
    req_kw: dict[str, Any] = {
        "method": method,
        "url": url,
        "headers": headers,
        "timeout": kwargs.pop("timeout", 30),
    }
    if method.upper() == "GET":
        if "params" in kwargs:
            req_kw["params"] = kwargs.pop("params")
    else:
        req_kw["json"] = json or {}
    req_kw.update(kwargs)
    return requests.request(**req_kw)


def post(
    path: str,
    data: Optional[dict[str, Any]] = None,
    auth: Literal["token", "key"] = "token",
    **kwargs: Any,
) -> requests.Response:
    """POST 请求（GeeLark 默认均为 POST）。"""
    return request(path, method="POST", json=data, auth=auth, **kwargs)


def get(
    path: str,
    params: Optional[dict[str, Any]] = None,
    auth: Literal["token", "key"] = "token",
    **kwargs: Any,
) -> requests.Response:
    """GET 请求。"""
    return request(path, method="GET", params=params, auth=auth, **kwargs)


def check_config(auth: Literal["token", "key"] = "token") -> tuple[bool, list[str]]:
    """检查当前认证方式所需配置是否完整。"""
    if auth == "token":
        missing = [] if GEELARK_BEARER_TOKEN else ["GEELARK_BEARER_TOKEN"]
    else:
        missing = []
        if not GEELARK_APP_ID:
            missing.append("GEELARK_APP_ID")
        if not GEELARK_API_KEY:
            missing.append("GEELARK_API_KEY")
    return (len(missing) == 0, missing)


# 常用接口路径（与 en-doc 中 Request URL 一致）
PATHS = {
    "phone_list": "phone/list",
    "task_query": "task/query",
}

if __name__ == "__main__":
    ok, missing = check_config("token")
    if not ok:
        print("缺少配置:", ", ".join(missing))
        print("请在 .env 中设置 GEELARK_BEARER_TOKEN。")
        exit(1)
    # 官方示例：云手机列表
    r = post(PATHS["phone_list"], data={"page": 1, "pageSize": 10})
    print("状态码:", r.status_code)
    try:
        body = r.json()
        print("code:", body.get("code"), "msg:", body.get("msg"))
        if body.get("data"):
            print("data 键:", list(body["data"].keys()))
    except Exception:
        print("响应:", r.text[:500] if r.text else "(空)")
