"""
TikTok 舆情评论系统 — 单应用全流程（Python + Streamlit）

PRD 四模块在同一页面完成：
1. 关键词 → TikTokApi 搜索视频 → 相对热度排序 → 过滤已处理
2. 选中视频 → 自动拉取评论 → LLM 舆情分析
3. 基于分析生成 10 条差异化评论（可编辑）
4. 本页直接调用 GeeLark API 创建评论任务（不经过 Next.js）

运行：cd tiktok-prd-bot && streamlit run app.py
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path
from typing import Any

import streamlit as st

# 确保能提示 GeeLark 配置（geelark_client 在仓库根）
_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from analyze import analyze_sentiment, fetch_comments
from config import (
    GEELARK_USE_ASIA,
    MS_TOKEN,
    OPENAI_MODEL,
    load_accounts,
)
from discover import discover_videos
from generate import generate_comments
from sender import batch_send


def _run(coro):
    return asyncio.run(coro)


def _keywords_from_text(text: str) -> list[str]:
    return [ln.strip() for ln in text.splitlines() if ln.strip()]


def _ms_token(sidebar_token: str) -> str | None:
    t = (sidebar_token or "").strip() or MS_TOKEN
    return t or None


def _comments_for_video(vid: str, fallback: list[str]) -> list[str]:
    """优先使用文本框内编辑后的内容。"""
    key = f"ta_{vid}_{st.session_state.cmt_ver}"
    raw = st.session_state.get(key)
    if isinstance(raw, str):
        lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
        if lines:
            return lines
    return list(fallback)


def _run_analyze(
    *,
    openai_key: str,
    base_url: str | None,
    openai_model: str,
    ms_token: str | None,
    product_name: str,
) -> dict[str, Any]:
    analyses: dict[str, Any] = dict(st.session_state.analyses)
    for r in st.session_state.selected_rows:
        vid = r["id"]
        try:
            comments = _run(
                fetch_comments(
                    vid,
                    count=100,
                    ms_token=ms_token,
                    sleep_after=3,
                )
            )
            analyses[vid] = {
                "fetched_count": len(comments),
                "comments_sample": comments[:20],
                "analysis": analyze_sentiment(
                    comments,
                    product_name,
                    api_key=openai_key,
                    base_url=base_url,
                    model=openai_model or None,
                ),
            }
        except Exception as e:
            analyses[vid] = {"error": str(e), "fetched_count": 0}
    return analyses


def _run_generate(
    *,
    openai_key: str,
    base_url: str | None,
    openai_model: str,
    product_name: str,
    language: str,
    count: int,
) -> dict[str, list[str]]:
    out: dict[str, list[str]] = dict(st.session_state.comments_by_video)
    for r in st.session_state.selected_rows:
        vid = r["id"]
        block = st.session_state.analyses.get(vid) or {}
        if block.get("error") or "analysis" not in block:
            continue
        out[vid] = generate_comments(
            block["analysis"],
            product_name,
            language=language or "en",
            count=count,
            api_key=openai_key,
            base_url=base_url,
            model=openai_model or None,
        )
    return out


def main() -> None:
    st.set_page_config(page_title="TikTok 舆情评论（Streamlit）", layout="wide")
    st.title("TikTok 舆情评论系统")
    st.success(
        "**本应用为 PRD 指定技术栈：Python + Streamlit + TikTokApi + OpenAI + GeeLark。** "
        "关键词发现视频、抓取评论、舆情分析、生成评论、提交云手机任务均在**本页**完成，无需 Next.js。"
    )

    if "discovered" not in st.session_state:
        st.session_state.discovered = []
    if "selected_rows" not in st.session_state:
        st.session_state.selected_rows = []
    if "analyses" not in st.session_state:
        st.session_state.analyses = {}
    if "comments_by_video" not in st.session_state:
        st.session_state.comments_by_video = {}
    if "cmt_ver" not in st.session_state:
        st.session_state.cmt_ver = 0

    geelark_ok = False
    geelark_missing: list[str] = []
    try:
        from geelark_client import check_config

        geelark_ok, geelark_missing = check_config("token")
    except Exception as e:
        geelark_missing = [f"无法加载 geelark_client: {e}"]

    with st.sidebar:
        st.header("全局配置")
        kw_text = st.text_area(
            "关键词（每行一个）",
            value=os.getenv("TIKTOK_KEYWORDS_SAMPLE", "mobile game\ngacha"),
            height=100,
        )
        product_name = st.text_input("产品名称", value=os.getenv("TIKTOK_PRODUCT_NAME", "示例游戏"))
        top_n = st.number_input("Top N 视频（跨关键词合并后取前 N）", min_value=1, max_value=50, value=5)
        per_kw = st.number_input("每个关键词最多抓取条数", min_value=10, max_value=60, value=30)
        openai_key = st.text_input("OpenAI API Key", value=os.getenv("OPENAI_API_KEY", ""), type="password")
        openai_base = st.text_input("OpenAI Base URL（可选）", value=os.getenv("OPENAI_BASE_URL", "") or "")
        openai_model = st.text_input("模型", value=os.getenv("OPENAI_MODEL", OPENAI_MODEL))
        ms_token_in = st.text_input(
            "TikTok ms_token（强烈建议）",
            value=os.getenv("TIKTOK_MS_TOKEN", ""),
            type="password",
        )
        st.caption("从浏览器 Cookie 复制 msToken，见 TikTok-Api 文档。sleep_after=3 防限流。")
        use_asia = st.checkbox("GeeLark：亚洲接口 tiktokRandomCommentAsia", value=GEELARK_USE_ASIA)
        st.divider()
        st.subheader("GeeLark")
        if geelark_ok:
            st.caption("已检测到 GEELARK_BEARER_TOKEN（仓库根或本目录 .env）")
        else:
            st.warning("缺少：" + "、".join(geelark_missing))
        accs = load_accounts()
        st.caption(f"账号池（云手机 id）：**{len(accs)}** 个 · `GEELARK_PHONE_IDS` 或 `GEELARK_ACCOUNTS_JSON`")

    keywords = _keywords_from_text(kw_text)
    base_url = openai_base.strip() or None
    model_s = openai_model.strip() or OPENAI_MODEL

    st.markdown("### 模块一 · 视频发现（TikTokApi + Playwright）")
    c1, c2 = st.columns(2)
    with c1:
        discover_clicked = st.button("搜索并排序", type="primary")
    with c2:
        pipeline_clicked = st.button("一键：分析 → 生成", help="对当前勾选视频自动拉评、舆情分析并生成评论")

    if discover_clicked:
        if not keywords:
            st.error("请填写至少一个关键词")
        else:
            with st.spinner("TikTokApi 正在搜索（可能较慢）…"):
                try:
                    rows = _run(
                        discover_videos(
                            keywords,
                            top_n=int(top_n),
                            per_keyword_count=int(per_kw),
                            ms_token=_ms_token(ms_token_in),
                            sleep_after=3,
                        )
                    )
                    st.session_state.discovered = rows
                    st.session_state.selected_rows = []
                    st.session_state.analyses = {}
                    st.session_state.comments_by_video = {}
                    st.success(f"已发现 **{len(rows)}** 条候选（已排除已处理视频）")
                except Exception as e:
                    st.exception(e)

    if st.session_state.discovered:
        opts = {
            f"{r['keyword']} | ❤{r['likes']} 💬{r['comments']} | {r['score']:.3f} | `{r['id']}`": r
            for r in st.session_state.discovered
        }
        picked = st.multiselect("勾选要处理的视频", options=list(opts.keys()))
        st.session_state.selected_rows = [opts[k] for k in picked]
        with st.expander("候选列表", expanded=False):
            for r in st.session_state.discovered:
                st.markdown(
                    f"- [{r['url']}]({r['url']}) · `{r['keyword']}` · 赞 {r['likes']} · 评 {r['comments']} · 分 **{r['score']:.4f}**"
                )

    st.markdown("### 模块二 · 舆情分析（系统自动抓取评论 + LLM）")
    analyze_clicked = st.button("拉取评论并分析舆情", disabled=not st.session_state.selected_rows)
    if analyze_clicked:
        if not openai_key.strip():
            st.error("请填写 OpenAI API Key")
        elif not st.session_state.selected_rows:
            st.error("请先勾选视频")
        else:
            with st.spinner("正从 TikTok 拉取评论并调用模型…"):
                try:
                    st.session_state.analyses = _run_analyze(
                        openai_key=openai_key.strip(),
                        base_url=base_url,
                        openai_model=model_s,
                        ms_token=_ms_token(ms_token_in),
                        product_name=product_name.strip() or "产品",
                    )
                    st.success("分析完成")
                except Exception as e:
                    st.exception(e)

    if pipeline_clicked:
        if not openai_key.strip():
            st.error("请填写 OpenAI API Key")
        elif not st.session_state.selected_rows:
            st.error("请先发现并勾选视频")
        else:
            lang = st.session_state.get("pipeline_lang", "en")
            cnt = int(st.session_state.get("pipeline_count", 10))
            with st.spinner("一键执行：拉评 → 分析 → 生成…"):
                try:
                    st.session_state.analyses = _run_analyze(
                        openai_key=openai_key.strip(),
                        base_url=base_url,
                        openai_model=model_s,
                        ms_token=_ms_token(ms_token_in),
                        product_name=product_name.strip() or "产品",
                    )
                    st.session_state.comments_by_video = _run_generate(
                        openai_key=openai_key.strip(),
                        base_url=base_url,
                        openai_model=model_s,
                        product_name=product_name.strip() or "产品",
                        language=lang,
                        count=cnt,
                    )
                    st.session_state.cmt_ver += 1
                    st.success("已完成分析并生成评论，可在下方编辑后发送")
                except Exception as e:
                    st.exception(e)

    for r in st.session_state.selected_rows:
        vid = r["id"]
        block = st.session_state.analyses.get(vid)
        if not block:
            continue
        with st.expander(f"舆情结果 · {vid}（抓取 {block.get('fetched_count', '?')} 条）", expanded=True):
            if block.get("error"):
                st.error(block["error"])
            else:
                st.json(block.get("analysis", {}))

    st.markdown("### 模块三 · 生成评论（差异化文案，可改）")
    g1, g2 = st.columns(2)
    with g1:
        lang = st.text_input("语言", value="en", key="gen_lang")
    with g2:
        gen_count = st.number_input("条数", min_value=1, max_value=20, value=10, key="gen_count")
    st.session_state.pipeline_lang = lang
    st.session_state.pipeline_count = int(gen_count)

    gen_clicked = st.button("生成 / 重新生成评论", disabled=not st.session_state.selected_rows)
    if gen_clicked:
        if not openai_key.strip():
            st.error("请填写 OpenAI API Key")
        elif not st.session_state.selected_rows:
            st.error("请先勾选视频并完成分析")
        else:
            missing = [r["id"] for r in st.session_state.selected_rows if "analysis" not in (st.session_state.analyses.get(r["id"]) or {})]
            if missing:
                st.error(f"请先完成舆情分析，缺少：{', '.join(missing)}")
            else:
                with st.spinner("正在生成评论…"):
                    try:
                        st.session_state.comments_by_video = _run_generate(
                            openai_key=openai_key.strip(),
                            base_url=base_url,
                            openai_model=model_s,
                            product_name=product_name.strip() or "产品",
                            language=lang.strip() or "en",
                            count=int(gen_count),
                        )
                        st.session_state.cmt_ver += 1
                        st.success("已生成")
                    except Exception as e:
                        st.exception(e)

    for r in st.session_state.selected_rows:
        vid = r["id"]
        cur = st.session_state.comments_by_video.get(vid)
        if not cur:
            continue
        st.text_area(
            f"待发送文案（每行一条）· `{vid}`",
            value="\n".join(cur),
            height=180,
            key=f"ta_{vid}_{st.session_state.cmt_ver}",
        )

    st.markdown("### 模块四 · GeeLark 发送（本页直接调 API）")
    st.caption("每条评论对应一个云手机账号；发送间隔随机 30–120 秒；完成后标记视频已处理。")

    if not geelark_ok:
        st.error("无法发送：请配置仓库根目录 `.env` 中的 `GEELARK_BEARER_TOKEN`。")
    elif len(accs) == 0:
        st.error("无法发送：请配置 `GEELARK_PHONE_IDS` 或 `GEELARK_ACCOUNTS_JSON`。")
    else:
        b1, b2 = st.columns(2)
        with b1:
            id_list = [r["id"] for r in st.session_state.selected_rows]
            send_one = (
                st.selectbox(
                    "发送到单个视频",
                    options=id_list,
                    format_func=lambda x: next(
                        (f"{x} — {r['url']}" for r in st.session_state.selected_rows if r["id"] == x),
                        str(x),
                    ),
                    key="send_pick_one",
                )
                if id_list
                else None
            )
            if st.button("确认发送到该视频", type="primary", disabled=not id_list):
                row = next((r for r in st.session_state.selected_rows if r["id"] == send_one), None)
                sid = send_one or ""
                comments = _comments_for_video(
                    sid, st.session_state.comments_by_video.get(sid) or []
                )
                if row and comments:
                    with st.spinner("提交 GeeLark 任务…"):
                        try:
                            st.session_state.last_send = batch_send(
                                send_one or "",
                                row["url"],
                                comments,
                                accounts=accs,
                                use_asia=use_asia,
                            )
                            st.success("已提交")
                            st.json(st.session_state.last_send)
                        except Exception as e:
                            st.exception(e)
                else:
                    st.error("请填写待发送评论")

        with b2:
            if st.button("发送到全部已选视频（依次）", help="每个勾选视频使用各自文本框中的评论列表"):
                if not id_list:
                    st.error("请先勾选视频")
                else:
                    all_results: dict[str, Any] = {}
                    with st.spinner("批量提交中（间隔较长）…"):
                        try:
                            for r in st.session_state.selected_rows:
                                vid = r["id"]
                                comments = _comments_for_video(
                                    vid, st.session_state.comments_by_video.get(vid) or []
                                )
                                if not comments:
                                    all_results[vid] = {"skipped": "无评论文案"}
                                    continue
                                all_results[vid] = batch_send(
                                    vid,
                                    r["url"],
                                    comments,
                                    accounts=accs,
                                    use_asia=use_asia,
                                )
                            st.session_state.last_send_all = all_results
                            st.success("全部处理完毕")
                            st.json(all_results)
                        except Exception as e:
                            st.exception(e)

    if st.session_state.get("last_send"):
        with st.expander("上次单视频发送结果"):
            st.json(st.session_state.last_send)
    if st.session_state.get("last_send_all"):
        with st.expander("上次批量发送结果"):
            st.json(st.session_state.last_send_all)


if __name__ == "__main__":
    main()
