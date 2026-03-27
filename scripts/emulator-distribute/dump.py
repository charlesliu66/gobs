#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
导出当前界面 XML，用于调试 TikTok 界面元素
参考 edde746/tiktok-uploader
用法：python dump.py
"""
import os
import sys
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)

config = json.load(open('config.json', 'r', encoding='utf-8'))

try:
    from uiautomator import Device
except ImportError:
    print('请先安装: pip install uiautomator')
    sys.exit(1)

d = Device(config['device'])
d.dump('dump.xml')
print('已导出到 dump.xml，可用文本编辑器搜索 resourceId、text 等')
