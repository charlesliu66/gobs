"""SQLite：已处理视频、评论发送日志。"""

from __future__ import annotations

import sqlite3
from pathlib import Path
from config import DB_PATH


def _connect() -> sqlite3.Connection:
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(DB_PATH)


def init_db() -> None:
    conn = _connect()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS processed_videos (
                video_id TEXT PRIMARY KEY,
                url TEXT,
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS comment_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id TEXT,
                account_id TEXT,
                comment TEXT,
                status TEXT,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def get_processed_video_ids() -> set[str]:
    conn = _connect()
    rows = conn.execute("SELECT video_id FROM processed_videos").fetchall()
    conn.close()
    return {r[0] for r in rows}


def mark_processed(video_id: str, url: str) -> None:
    conn = _connect()
    conn.execute(
        "INSERT OR IGNORE INTO processed_videos (video_id, url) VALUES (?, ?)",
        (video_id, url),
    )
    conn.commit()
    conn.close()


def log_comment(
    video_id: str, account_id: str, comment: str, status: str
) -> None:
    conn = _connect()
    conn.execute(
        """
        INSERT INTO comment_logs (video_id, account_id, comment, status)
        VALUES (?, ?, ?, ?)
        """,
        (video_id, account_id, comment, status),
    )
    conn.commit()
    conn.close()
