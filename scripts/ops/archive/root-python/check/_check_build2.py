import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

dist = r'c:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool\dist\assets'

unique_strings = [
    '暂无生成任务',
    '生成队列',
    '版本时间线',
    '批量生成',
    '即梦生成',
    '已持久化',
    '关闭面板',
    '高级制片',    # existing string
    '仅保留当前',  # existing string
    'useGlobalJobsProvider',
]

for fn in sorted(os.listdir(dist)):
    if not fn.endswith('.js'):
        continue
    fp = os.path.join(dist, fn)
    with open(fp, 'r', encoding='utf-8') as f:
        content = f.read()
    for s in unique_strings:
        if s in content:
            idx = content.index(s)
            ctx = content[max(0,idx-30):idx+len(s)+30]
            print(f'  Found "{s}" in {fn} (context: ...{ctx}...)')
