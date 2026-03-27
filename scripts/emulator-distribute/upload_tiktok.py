#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
TikTok 模拟器上传 CLI - 参考 edde746/tiktok-uploader
用法: python upload_tiktok.py [--video path] [--caption "文案"]
若 --video 未指定，则使用 to_upload/ 目录下的视频
"""
from __future__ import print_function
import os
import sys
import argparse
import shutil

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TO_UPLOAD = os.path.join(SCRIPT_DIR, 'to_upload')


def main():
    parser = argparse.ArgumentParser(description='TikTok 模拟器上传')
    parser.add_argument('--video', help='视频路径（可选，不传则用 to_upload/ 下文件）')
    parser.add_argument('--caption', default='', help='发布文案')
    parser.add_argument('--draft', action='store_true', help='保存为草稿')
    args = parser.parse_args()

    if args.video:
        if not os.path.exists(args.video):
            print('视频文件不存在:', args.video)
            sys.exit(1)
        if not os.path.exists(TO_UPLOAD):
            os.mkdir(TO_UPLOAD)
        # 清空 to_upload 后放入指定视频
        for f in os.listdir(TO_UPLOAD):
            try:
                os.remove(os.path.join(TO_UPLOAD, f))
            except Exception:
                pass
        dest = os.path.join(TO_UPLOAD, os.path.basename(args.video))
        shutil.copy2(args.video, dest)

    from api.uploader import upload_tiktok
    ok = upload_tiktok(description=args.caption or None, draft=args.draft, photo_mode=False)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
