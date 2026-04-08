"""
TikTok 评论定时发布
- 在指定 TikTok 链接下发布评论（云手机执行）
- 评论内容：手动输入 或 AI 生成后人工确认
- 支持定时发布与时区选择
"""

import os
import random
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

# 使用项目内 geelark_client
from geelark_client import post, check_config

from zoneinfo import ZoneInfo


# --- 云手机与任务 API ---

def get_cloud_phones(page: int = 1, page_size: int = 100):
    """获取云手机列表，便于选择设备。"""
    r = post("phone/list", data={"page": page, "pageSize": page_size})
    r.raise_for_status()
    data = r.json()
    if data.get("code") != 0:
        raise RuntimeError(data.get("msg", "unknown error"))
    return data.get("data", {}).get("items", [])


def schedule_tiktok_comment(
    phone_id: str,
    tiktok_url: str,
    comment: str,
    schedule_at: int,
    *,
    use_asia_api: bool = False,
    name: Optional[str] = None,
    remark: Optional[str] = None,
    comment_probability: int = 100,
) -> dict:
    """
    创建 TikTok 评论定时任务。
    - phone_id: 云手机 ID
    - tiktok_url: 目标视频链接（可多个，传 list 时会在第一个链接下评论）
    - comment: 评论内容（useAi=2 固定使用该内容）
    - schedule_at: 预定执行时间（Unix 秒级时间戳）
    - use_asia_api: True 使用亚洲版接口 tiktokRandomCommentAsia
    - comment_probability: 0-100，默认 100 表示必定评论
    返回 API 的 data（含 taskId）。
    """
    path = "rpa/task/tiktokRandomCommentAsia" if use_asia_api else "rpa/task/tiktokRandomComment"
    links = [tiktok_url] if isinstance(tiktok_url, str) else list(tiktok_url)
    body = {
        "id": phone_id,
        "scheduleAt": schedule_at,
        "useAi": 2,
        "comment": comment[:500],
        "links": links,
        "commentProbability": max(0, min(100, comment_probability)),
    }
    if name is not None:
        body["name"] = name[:128]
    if remark is not None:
        body["remark"] = remark[:200]

    r = post(path, data=body)
    r.raise_for_status()
    data = r.json()
    if data.get("code") != 0:
        raise RuntimeError(data.get("msg", "unknown error"))
    return data.get("data", {})


# --- 定时时间解析（支持时区）---

def parse_schedule_time(datetime_str: str, timezone_str: str = "Asia/Shanghai") -> int:
    """
    将「日期时间 + 时区」转为 Unix 秒级时间戳。
    - datetime_str: 如 "2025-03-20 14:30" 或 "2025/03/20 14:30"
    - timezone_str: 如 "Asia/Shanghai", "America/New_York", "UTC"
    """
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M", "%Y/%m/%d %H:%M:%S"):
        try:
            dt_naive = datetime.strptime(datetime_str.strip(), fmt)
            break
        except ValueError:
            continue
    else:
        raise ValueError(f"无法解析时间: {datetime_str}，请使用例如 2025-03-20 14:30")

    tz = ZoneInfo(timezone_str)
    dt = dt_naive.replace(tzinfo=tz)
    return int(dt.timestamp())


# --- AI 评论生成（可选 OpenAI，否则返回预设建议）---

COMMENT_SUGGESTIONS = [
    "Nice! 🔥",
    "So good!",
    "Love this!",
    "Amazing content!",
    "真不错！",
    "太棒了！",
    "收藏了～",
    "Great share!",
    "This is fire! 🔥",
]


def generate_comment_suggestions(tiktok_url: str, count: int = 5) -> list[str]:
    """
    生成评论备选。若配置了 OPENAI_API_KEY 则尝试用 AI 生成；否则从预设中随机返回。
    AI 生成时也会返回若干条供人工选择。
    """
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY_BASE")
    if api_key:
        try:
            return _generate_via_openai(tiktok_url, count, api_key)
        except Exception:
            pass
    # 预设随机
    return list(random.sample(COMMENT_SUGGESTIONS, min(count, len(COMMENT_SUGGESTIONS))))


def _generate_via_openai(tiktok_url: str, count: int, api_key: str) -> list[str]:
    try:
        import openai
    except ImportError:
        return list(random.sample(COMMENT_SUGGESTIONS, min(count, len(COMMENT_SUGGESTIONS))))

    client = openai.OpenAI(api_key=api_key)
    base = os.getenv("OPENAI_API_BASE")
    if base:
        client.base_url = base

    prompt = f"""Generate {count} short, natural TikTok comment suggestions for a video (we only have the link, no video content). 
One per line, no numbering. Mix English and Chinese. Keep each under 100 characters. 
Video link: {tiktok_url}"""

    resp = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        messages=[{"role": "user", "content": prompt}],
        max_tokens=300,
    )
    text = (resp.choices[0].message.content or "").strip()
    lines = [line.strip() for line in text.splitlines() if line.strip()][:count]
    if not lines:
        return list(random.sample(COMMENT_SUGGESTIONS, min(count, len(COMMENT_SUGGESTIONS))))
    return lines


def run_interactive():
    """交互式：输入链接、选择/输入评论、选择时间时区、选择云手机并提交。"""
    ok, missing = check_config("token")
    if not ok:
        print("缺少 GeeLark 配置:", ", ".join(missing))
        return

    print("=== TikTok 评论定时发布 ===\n")

    # 1. TikTok 链接
    tiktok_url = input("TikTok 视频链接: ").strip()
    if not tiktok_url:
        print("未输入链接，退出")
        return

    # 2. 评论：手动 或 AI 生成后确认
    comment_source = input("评论来源 [1=手动输入 2=AI生成后确认]: ").strip() or "1"
    if comment_source == "2":
        suggestions = generate_comment_suggestions(tiktok_url, 5)
        print("\n生成的评论备选：")
        for i, c in enumerate(suggestions, 1):
            print(f"  {i}. {c}")
        choice = input("请选择序号(1-5)或直接输入你要的评论: ").strip()
        if choice.isdigit() and 1 <= int(choice) <= len(suggestions):
            comment = suggestions[int(choice) - 1]
        else:
            comment = choice if choice else suggestions[0]
        print("已确认评论:", comment)
    else:
        comment = input("评论内容: ").strip()
        if not comment:
            print("未输入评论，退出")
            return

    # 3. 定时时间 + 时区
    tz = input("时区 [默认 Asia/Shanghai]: ").strip() or "Asia/Shanghai"
    dt_str = input("预定发布时间 (例 2025-03-20 14:30): ").strip()
    if not dt_str:
        print("未输入时间，退出")
        return
    try:
        schedule_at = parse_schedule_time(dt_str, tz)
        print("将在此时间执行(本地):", datetime.fromtimestamp(schedule_at))
    except Exception as e:
        print("时间解析失败:", e)
        return

    # 4. 云手机
    print("\n正在获取云手机列表...")
    try:
        phones = get_cloud_phones()
    except Exception as e:
        print("获取云手机失败:", e)
        return
    if not phones:
        print("没有可用云手机")
        return
    for i, p in enumerate(phones[:20], 1):
        print(f"  {i}. {p.get('serialName', '')} (ID: {p.get('id', '')})")
    idx = input("选择云手机序号: ").strip()
    if not idx.isdigit() or not (1 <= int(idx) <= len(phones)):
        print("无效序号")
        return
    phone_id = phones[int(idx) - 1]["id"]

    # 5. 是否使用亚洲版接口
    use_asia = input("使用亚洲版接口? [y/N]: ").strip().lower() == "y"

    try:
        result = schedule_tiktok_comment(
            phone_id=phone_id,
            tiktok_url=tiktok_url,
            comment=comment,
            schedule_at=schedule_at,
            use_asia_api=use_asia,
            name="TikTok评论",
            comment_probability=100,
        )
        print("\n任务已创建成功。taskId:", result.get("taskId"))
    except Exception as e:
        print("创建任务失败:", e)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="TikTok 评论定时发布（指定链接，可选 AI 生成+人工确认，支持时区定时）")
    parser.add_argument("--url", "-u", help="TikTok 视频链接")
    parser.add_argument("--comment", "-c", help="评论内容（不填则走 AI 生成+确认或交互输入）")
    parser.add_argument("--schedule", "-s", help="预定发布时间，例 2025-03-20 14:30")
    parser.add_argument("--timezone", "-t", default="Asia/Shanghai", help="时区，默认 Asia/Shanghai")
    parser.add_argument("--phone-id", "-p", help="云手机 ID（不填则交互选择）")
    parser.add_argument("--asia", action="store_true", help="使用亚洲版接口")
    parser.add_argument("--list-phones", action="store_true", help="仅列出云手机后退出")
    parser.add_argument("--non-interactive", action="store_true", help="非交互：缺少参数则报错不提示输入")
    args = parser.parse_args()

    if args.list_phones:
        ok, missing = check_config("token")
        if not ok:
            print("缺少配置:", ", ".join(missing))
            return
        for p in get_cloud_phones():
            print(p.get("id"), p.get("serialName", ""), p.get("serialNo", ""))
        return

    if args.url and args.comment and args.schedule and args.phone_id:
        schedule_at = parse_schedule_time(args.schedule, args.timezone)
        result = schedule_tiktok_comment(
            phone_id=args.phone_id,
            tiktok_url=args.url,
            comment=args.comment,
            schedule_at=schedule_at,
            use_asia_api=args.asia,
        )
        print("任务已创建。taskId:", result.get("taskId"))
        return

    if args.non_interactive:
        print("非交互模式需要同时提供: --url --comment --schedule --phone-id")
        return
    run_interactive()


if __name__ == "__main__":
    main()
