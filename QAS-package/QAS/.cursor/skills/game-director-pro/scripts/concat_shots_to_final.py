#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将按镜号命名的镜头按顺序剪辑合成成片。
用法: python concat_shots_to_final.py [--input-dir <目录>] [--output <输出文件名>]
默认: input-dir=当前脚本所在目录的上一级/ronin_video_output, output=ronin_promo_final.mp4
需安装 FFmpeg 并加入 PATH。
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="按镜号顺序合成 shot_xx.mp4 为成片")
    parser.add_argument("--input-dir", default="", help="镜头所在目录（默认: 同目录../ronin_video_output 或 cwd）")
    parser.add_argument("--output", default="ronin_promo_final.mp4", help="输出成片文件名")
    parser.add_argument("--shots", default="01,02,03,04,05,06,07", help="镜号顺序，逗号分隔，如 01,02,03,04,05,06 或含 07")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    if args.input_dir:
        input_dir = Path(args.input_dir)
    else:
        input_dir = script_dir.parent / "ronin_video_output"
        if not input_dir.exists():
            input_dir = Path.cwd()

    if not input_dir.exists():
        print(f"错误: 目录不存在 {input_dir}")
        sys.exit(1)

    shot_nums = [s.strip() for s in args.shots.split(",") if s.strip()]
    list_lines = []
    for num in shot_nums:
        f = input_dir / f"shot_{num}.mp4"
        if f.exists():
            list_lines.append(f"file '{f.as_posix()}'")
        else:
            print(f"跳过不存在的镜头: {f.name}")

    if not list_lines:
        print("错误: 未找到任何 shot_xx.mp4 文件")
        sys.exit(1)

    out_path = input_dir / args.output
    list_path = input_dir / "concat_list.txt"
    with open(list_path, "w", encoding="utf-8") as f:
        f.write("\n".join(list_lines))

    # FFmpeg concat demuxer (no re-encode)
    cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(list_path),
        "-c", "copy",
        str(out_path)
    ]
    print("合成顺序:", [Path(p.replace("file '", "").rstrip("'")).name for p in list_lines])
    print("输出:", out_path)
    print("执行:", " ".join(cmd))
    try:
        subprocess.run(cmd, check=True)
        print("完成:", out_path)
        list_path.unlink(missing_ok=True)
    except FileNotFoundError:
        print("错误: 未找到 ffmpeg，请安装 FFmpeg 并加入 PATH")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print("FFmpeg 执行失败:", e)
        sys.exit(1)

if __name__ == "__main__":
    main()
