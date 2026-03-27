# -*- coding: utf-8 -*-
"""
TikTok ADB 上传逻辑 - 参考 edde746/tiktok-uploader
"""
from __future__ import print_function
import os
import sys
import json
import time
import datetime
import subprocess

# 确保从脚本目录加载 config
SCRIPT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(SCRIPT_DIR)

config_path = os.path.join(SCRIPT_DIR, 'config.json')
config = json.load(open(config_path, 'r', encoding='utf-8'))

try:
    from uiautomator import Device
except ImportError:
    print('请先安装: pip install uiautomator')
    sys.exit(1)

# 静态配置
SD_CARD_INDEX = False
POSSIBLE_APPS = ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill']
RELATIVE_PATH = config.get('deviceStoragePath', 'Pictures/TTUploader')

d = Device(config['device'])


def adb(command):
    proc = subprocess.Popen(
        'adb -s %s %s' % (config['device'], command),
        stdout=subprocess.PIPE,
        shell=True
    )
    out, _ = proc.communicate()
    return out.decode('utf-8', errors='replace')


device_size = (0, 0)


def touch(x, y, relative=True):
    global device_size
    if device_size[0] == 0:
        device_size = (d.info['displayWidth'], d.info['displayHeight'])
    x = int(x * device_size[0]) if relative else x
    y = int(y * device_size[1]) if relative else y
    d.click(x, y)


def upload_tiktok(description=None, draft=False, photo_mode=False):
    APP_NAME = None
    packages = adb('shell pm list packages')
    for pkg in POSSIBLE_APPS:
        if pkg in packages:
            APP_NAME = pkg
            break

    if not APP_NAME:
        print('TikTok 未找到，请在模拟器内安装 TikTok')
        return False

    adb('shell am force-stop %s' % APP_NAME)
    adb('shell rm -rf /sdcard/%s' % RELATIVE_PATH)

    to_upload = os.path.join(SCRIPT_DIR, 'to_upload')
    if not os.path.exists(to_upload):
        os.mkdir(to_upload)
    files = [f for f in os.listdir(to_upload) if f.endswith(('.mp4', '.mov', '.avi', '.webm'))]
    if not files:
        print('to_upload 目录下没有视频文件')
        return False

    for f in files:
        time_str = datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')
        ext = os.path.splitext(f)[1]
        new_name = '%s%s' % (time_str, ext)
        src = os.path.join(to_upload, f)
        # Windows 路径转 Unix 风格供 adb 使用
        src_esc = os.path.normpath(src).replace('\\', '/')
        adb('push "%s" /sdcard/%s/%s' % (src_esc, RELATIVE_PATH, new_name))
        if SD_CARD_INDEX:
            adb('shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/%s/%s' % (RELATIVE_PATH, new_name))
        else:
            adb('shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///storage/emulated/0/%s/%s' % (RELATIVE_PATH, new_name))

    ITEM_COUNT = len(files)
    start = adb('shell am start -n %s/com.ss.android.ugc.aweme.splash.SplashActivity' % APP_NAME)
    if 'does not exist' in start:
        print('无法启动 TikTok')
        return False

    # 等待 Profile 出现，点击底部「我」
    if not d(text='Profile').wait.exists(timeout=10000) and not d(text='我').wait.exists(timeout=3000):
        print('等待 TikTok 加载超时')
        return False
    touch(0.5, 0.99)

    # 点击上传
    if d(text='Upload').exists:
        d(text='Upload').click.wait()
    elif d(text='上传').exists:
        d(text='上传').click.wait()
    else:
        print('未找到上传按钮')
        return False

    # 可选：多选
    select_multiple = d(text='Select multiple')
    if not select_multiple.exists:
        select_multiple = d(text='多选')
    if select_multiple.exists:
        try:
            cb = d(className='android.widget.CheckBox')
            if cb.exists and not cb.info.get('checked', False):
                select_multiple.click.wait()
        except Exception:
            pass

    # 选择第一个视频
    for i in range(ITEM_COUNT):
        try:
            rv = d(className='androidx.recyclerview.widget.RecyclerView')
            el = rv.child(index=i).child(className='android.widget.FrameLayout').child(className='android.widget.TextView')
            if i == ITEM_COUNT - 1:
                el.click.wait()
            else:
                el.click()
        except Exception as e:
            print('选择视频失败:', e)
            return False

    # Next
    for btn_text in ['Next (%s)' % ITEM_COUNT, 'Next', '下一步 (%s)' % ITEM_COUNT, '下一步']:
        if d(text=btn_text).exists:
            d(text=btn_text).click.wait()
            break
    else:
        for tv in d(className='android.widget.TextView'):
            try:
                if tv.text and ('Next' in tv.text or '下一步' in str(tv.text)):
                    tv.click.wait()
                    break
            except Exception:
                pass

    if photo_mode:
        if d(text='Switch to photo mode').exists:
            d(text='Switch to photo mode').click.wait()
        elif d(text='切换到照片模式').exists:
            d(text='切换到照片模式').click.wait()

    # 不加音乐，直接返回
    d.press.back()
    time.sleep(0.3)
    if d(text='Next').exists:
        d(text='Next').click.wait()
    elif d(text='下一步').exists:
        d(text='下一步').click.wait()

    if description:
        try:
            et = d(className='android.widget.EditText')
            if et.exists:
                et.set_text(description)
        except Exception as e:
            print('填写描述时出错:', e)
        d.press.back()

    if draft:
        if d(text='Drafts').exists:
            d(text='Drafts').click.wait()
        elif d(text='草稿').exists:
            d(text='草稿').click.wait()
    else:
        for btn in ['Post', '发布']:
            el = d(text=btn, instance=1)
            if el.exists:
                el.click.wait()
                break
        else:
            d(text='Post').click.wait()

    try:
        d(text='Post Now').click.wait(timeout=2000)
    except Exception:
        pass
    try:
        d(text='立即发布').click.wait(timeout=2000)
    except Exception:
        pass

    # 等待上传完成（进度条消失）
    progress_id = '%s:id/hs0' % APP_NAME
    wait_count = 0
    while d(resourceId=progress_id).exists and wait_count < 120:
        time.sleep(1)
        wait_count += 1
        if wait_count % 10 == 0:
            print('上传中... %ds' % wait_count)

    print('上传完成')
    return True
