"""
TikTok 评论定时发布 - 桌面窗口
支持单条与批量：多行「视频链接 + 评论」，每行可单独 AI 生成，统一定时与云手机批量提交。
"""

import threading
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
from datetime import datetime
from typing import List, Tuple, Any

from dotenv import load_dotenv
load_dotenv()

from tiktok_comment import (
    check_config,
    get_cloud_phones,
    generate_comment_suggestions,
    schedule_tiktok_comment,
    parse_schedule_time,
)


TIMEZONES = [
    "Asia/Shanghai",
    "Asia/Hong_Kong",
    "Asia/Tokyo",
    "Asia/Singapore",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "UTC",
]


def run_in_thread(root: tk.Tk, fn, on_done=None):
    def worker():
        err, result = None, None
        try:
            result = fn()
        except Exception as e:
            err = e
        def finish():
            if on_done:
                on_done(result, err)
        try:
            root.after(0, finish)
        except Exception:
            pass
    t = threading.Thread(target=worker)
    t.daemon = True
    t.start()


class TikTokCommentApp:
    def __init__(self):
        self.win = tk.Tk()
        self.win.title("TikTok 评论定时发布（支持批量）")
        self.win.geometry("720x680")
        self.win.minsize(600, 560)

        self.phones: list = []
        self.phone_var = tk.StringVar()
        self.use_asia_var = tk.BooleanVar(value=False)
        self.status_var = tk.StringVar(value="就绪")
        # 每行 (frame, url_entry, comment_entry)
        self.rows: List[Tuple[tk.Frame, tk.Entry, tk.Entry]] = []

        self._build_ui()
        self.win.after(200, self._load_phones)

    def _build_ui(self):
        pad = {"padx": 10, "pady": 6}
        main = ttk.Frame(self.win, padding=12)
        main.pack(fill=tk.BOTH, expand=True)

        # --- 任务列表（批量：每行 = 一个视频链接 + 一条评论）---
        ttk.Label(main, text="任务列表（每行一个视频链接 + 一条评论，可多行批量提交）", font=("", 10, "bold")).pack(anchor=tk.W, **pad)
        toolbar = ttk.Frame(main)
        toolbar.pack(anchor=tk.W, **pad)
        ttk.Button(toolbar, text="添加一行", command=self._add_row).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(toolbar, text="删除最后一行", command=self._remove_last_row).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(toolbar, text="清空全部", command=self._clear_rows).pack(side=tk.LEFT)

        # 表头
        head = ttk.Frame(main)
        head.pack(anchor=tk.W, fill=tk.X, **pad)
        ttk.Label(head, text="TikTok 视频链接", width=42).pack(side=tk.LEFT, padx=(0, 4))
        ttk.Label(head, text="评论内容", width=28).pack(side=tk.LEFT, padx=(0, 4))
        ttk.Label(head, text="操作", width=12).pack(side=tk.LEFT)

        # 可滚动区域
        row_container = ttk.Frame(main)
        row_container.pack(fill=tk.BOTH, expand=True, **pad)
        self.canvas = tk.Canvas(row_container, highlightthickness=0)
        self.scroll_region_frame = ttk.Frame(self.canvas)
        self.canvas_window = self.canvas.create_window((0, 0), window=self.scroll_region_frame, anchor=tk.NW)
        vsb = ttk.Scrollbar(row_container, orient=tk.VERTICAL, command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=vsb.set)
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        vsb.pack(side=tk.RIGHT, fill=tk.Y)

        def on_frame_configure(_):
            self.canvas.configure(scrollregion=self.canvas.bbox("all"))

        def on_canvas_configure(evt):
            self.canvas.itemconfig(self.canvas_window, width=evt.width)

        self.scroll_region_frame.bind("<Configure>", on_frame_configure)
        self.canvas.bind("<Configure>", on_canvas_configure)

        # 初始 3 行
        for _ in range(3):
            self._add_row()

        # --- 定时（统一）---
        ttk.Separator(main, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=10)
        ttk.Label(main, text="预定发布时间（所有任务同一时间）", font=("", 10, "bold")).pack(anchor=tk.W, **pad)
        schedule_frame = ttk.Frame(main)
        schedule_frame.pack(anchor=tk.W, **pad)
        self.date_entry = ttk.Entry(schedule_frame, width=12)
        self.date_entry.pack(side=tk.LEFT, padx=(0, 6))
        self.date_entry.insert(0, datetime.now().strftime("%Y-%m-%d"))
        ttk.Label(schedule_frame, text="日期").pack(side=tk.LEFT, padx=(0, 12))
        self.time_entry = ttk.Entry(schedule_frame, width=8)
        self.time_entry.pack(side=tk.LEFT, padx=(0, 6))
        self.time_entry.insert(0, "14:30")
        ttk.Label(schedule_frame, text="时间 (HH:MM)").pack(side=tk.LEFT, padx=(0, 12))
        ttk.Label(main, text="时区").pack(anchor=tk.W, **pad)
        self.tz_combo = ttk.Combobox(main, values=TIMEZONES, width=28, state="readonly")
        self.tz_combo.set("Asia/Shanghai")
        self.tz_combo.pack(anchor=tk.W, **pad)

        # --- 云手机 ---
        phone_frame = ttk.Frame(main)
        phone_frame.pack(anchor=tk.W, **pad)
        ttk.Label(phone_frame, text="云手机").pack(anchor=tk.W)
        self.phone_combo = ttk.Combobox(phone_frame, textvariable=self.phone_var, width=50, state="readonly")
        self.phone_combo.pack(side=tk.LEFT, padx=(0, 8))
        self.refresh_btn = ttk.Button(phone_frame, text="刷新列表", command=self._load_phones)
        self.refresh_btn.pack(side=tk.LEFT)

        ttk.Checkbutton(
            main, text="使用亚洲版接口 (tiktokRandomCommentAsia)", variable=self.use_asia_var
        ).pack(anchor=tk.W, **pad)

        # --- 提交 ---
        btn_frame = ttk.Frame(main)
        btn_frame.pack(**pad)
        self.submit_btn = ttk.Button(btn_frame, text="批量提交定时评论任务", command=self._on_submit)
        self.submit_btn.pack(side=tk.LEFT, padx=(0, 8))
        self.status_label = ttk.Label(main, textvariable=self.status_var, foreground="gray")
        self.status_label.pack(anchor=tk.W, **pad)
        self.log_text = scrolledtext.ScrolledText(main, height=5, width=88, wrap=tk.WORD, state=tk.DISABLED)
        self.log_text.pack(fill=tk.BOTH, expand=True, **pad)

    def _add_row(self):
        f = ttk.Frame(self.scroll_region_frame)
        f.pack(anchor=tk.W, fill=tk.X, pady=2)
        url_e = ttk.Entry(f, width=52)
        url_e.pack(side=tk.LEFT, padx=(0, 6), fill=tk.X, expand=True)
        url_e.insert(0, "https://www.tiktok.com/")
        comment_e = ttk.Entry(f, width=32)
        comment_e.pack(side=tk.LEFT, padx=(0, 6), fill=tk.X, expand=False)
        row_index = len(self.rows)
        ttk.Button(f, text="AI生成", width=6, command=lambda: self._ai_generate_row(row_index)).pack(side=tk.LEFT, padx=(0, 4))
        ttk.Button(f, text="删除", width=4, command=lambda: self._remove_row(row_index)).pack(side=tk.LEFT)
        self.rows.append((f, url_e, comment_e))

    def _remove_row(self, index: int):
        if 0 <= index < len(self.rows):
            frame, _, _ = self.rows[index]
            frame.destroy()
            self.rows.pop(index)
            # 重新绑定索引（删除后序号变化）
            for i, (f, _, _) in enumerate(self.rows):
                for w in f.winfo_children():
                    if isinstance(w, ttk.Button) and w.cget("text") == "AI生成":
                        w.config(command=lambda idx=i: self._ai_generate_row(idx))
                    elif isinstance(w, ttk.Button) and w.cget("text") == "删除":
                        w.config(command=lambda idx=i: self._remove_row(idx))

    def _remove_last_row(self):
        if self.rows:
            self._remove_row(len(self.rows) - 1)

    def _clear_rows(self):
        for f, _, _ in self.rows:
            f.destroy()
        self.rows.clear()
        for _ in range(2):
            self._add_row()

    def _ai_generate_row(self, index: int):
        if index < 0 or index >= len(self.rows):
            return
        _, url_e, comment_e = self.rows[index]
        url = url_e.get().strip() or "https://www.tiktok.com/"
        self.status_var.set("正在生成该行评论备选...")

        def gen():
            return generate_comment_suggestions(url, 5)

        def done(suggestions, err):
            self.status_var.set("就绪")
            if err or not suggestions:
                if err:
                    messagebox.showerror("错误", str(err))
                return
            self._show_suggestion_dialog_for_row(suggestions, comment_e)

        run_in_thread(self.win, gen, done)

    def _show_suggestion_dialog_for_row(self, suggestions: list, comment_entry: tk.Entry):
        d = tk.Toplevel(self.win)
        d.title("选择或编辑评论")
        d.geometry("420x260")
        d.transient(self.win)
        listframe = ttk.Frame(d, padding=10)
        listframe.pack(fill=tk.BOTH, expand=True)
        ttk.Label(listframe, text="点击选择一条，或在下框修改后点「使用」").pack(anchor=tk.W)
        lb = tk.Listbox(listframe, height=5, selectmode=tk.SINGLE, font=("", 10))
        lb.pack(fill=tk.BOTH, expand=True, pady=4)
        for s in suggestions:
            lb.insert(tk.END, s)
        if suggestions:
            lb.selection_set(0)
        ttk.Label(listframe, text="当前评论：").pack(anchor=tk.W, pady=(6, 0))
        edit = tk.Entry(listframe, width=55, font=("", 10))
        edit.pack(fill=tk.X, pady=2)
        edit.insert(0, suggestions[0])

        def on_select(evt):
            w = evt.widget
            idx = w.curselection()
            if idx:
                edit.delete(0, tk.END)
                edit.insert(0, suggestions[idx[0]])

        lb.bind("<<ListboxSelect>>", on_select)

        def use():
            text = edit.get().strip()
            comment_entry.delete(0, tk.END)
            comment_entry.insert(0, text or suggestions[0])
            d.destroy()

        ttk.Button(listframe, text="使用该评论", command=use).pack(pady=8)
        d.grab_set()
        self.win.wait_window(d)

    def _log(self, msg: str):
        self.log_text.config(state=tk.NORMAL)
        self.log_text.insert(tk.END, msg + "\n")
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)

    def _load_phones(self):
        self.status_var.set("正在加载云手机列表...")
        self.refresh_btn.config(state=tk.DISABLED)

        def load():
            return get_cloud_phones()

        def done(data, err):
            self.refresh_btn.config(state=tk.NORMAL)
            if err:
                self.status_var.set("加载云手机失败")
                self._log(f"错误: {err}")
                messagebox.showerror("错误", str(err))
                return
            self.phones = data or []
            names = []
            for p in self.phones:
                name = p.get("serialName") or p.get("serialNo") or ""
                pid = p.get("id", "")
                names.append(f"{name} ({pid})")
            self.phone_combo["values"] = names
            if names:
                self.phone_combo.current(0)
            self.status_var.set("就绪" if self.phones else "暂无云手机")

        run_in_thread(self.win, load, done)

    def _on_submit(self):
        ok, missing = check_config("token")
        if not ok:
            messagebox.showerror("错误", "缺少 GeeLark 配置: " + ", ".join(missing))
            return

        tasks: List[Tuple[str, str]] = []
        for _, url_e, comment_e in self.rows:
            url = url_e.get().strip()
            comment = comment_e.get().strip()
            if not url or url == "https://www.tiktok.com/":
                continue
            if not comment:
                continue
            tasks.append((url, comment))

        if not tasks:
            messagebox.showwarning("提示", "请至少填写一行有效的「视频链接 + 评论内容」")
            return

        date_str = self.date_entry.get().strip()
        time_str = self.time_entry.get().strip()
        tz = self.tz_combo.get().strip() or "Asia/Shanghai"
        try:
            schedule_at = parse_schedule_time(f"{date_str} {time_str}", tz)
        except ValueError as e:
            messagebox.showerror("时间格式错误", str(e))
            return

        idx = self.phone_combo.current()
        if idx < 0 or idx >= len(self.phones):
            messagebox.showwarning("提示", "请选择一台云手机")
            return
        phone_id = self.phones[idx]["id"]
        use_asia = self.use_asia_var.get()

        self.status_var.set(f"正在提交 {len(tasks)} 个任务...")
        self.submit_btn.config(state=tk.DISABLED)
        self._log(f"开始批量提交 {len(tasks)} 条任务...")

        def submit():
            results = []
            errors = []
            for i, (url, comment) in enumerate(tasks):
                try:
                    r = schedule_tiktok_comment(
                        phone_id=phone_id,
                        tiktok_url=url,
                        comment=comment,
                        schedule_at=schedule_at,
                        use_asia_api=use_asia,
                        name="TikTok评论",
                        comment_probability=100,
                    )
                    results.append((i + 1, r.get("taskId", ""), None))
                except Exception as e:
                    errors.append((i + 1, str(e)))
            return {"ok": results, "err": errors}

        def done(data: Any, err: Exception):
            self.submit_btn.config(state=tk.NORMAL)
            self.status_var.set("就绪")
            if err:
                self._log(f"批量提交失败: {err}")
                messagebox.showerror("提交失败", str(err))
                return
            ok_list = data.get("ok") or []
            err_list = data.get("err") or []
            for i, task_id, _ in ok_list:
                self._log(f"第 {i} 条成功 taskId: {task_id}")
            for i, msg in err_list:
                self._log(f"第 {i} 条失败: {msg}")
            success_count = len(ok_list)
            fail_count = len(err_list)
            messagebox.showinfo(
                "批量提交完成",
                f"成功: {success_count} 条\n失败: {fail_count} 条\n详见下方日志。"
            )

        run_in_thread(self.win, submit, done)

    def run(self):
        self.win.mainloop()


def main():
    app = TikTokCommentApp()
    app.run()


if __name__ == "__main__":
    main()
