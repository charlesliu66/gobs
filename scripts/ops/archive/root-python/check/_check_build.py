import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

dist = r'c:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool\dist\assets'
main_js = os.path.join(dist, 'index-DBgq_VZn.js')

with open(main_js, 'r', encoding='utf-8') as f:
    content = f.read()

print(f'File size: {len(content)} chars')
searches = ['react', 'NavLink', 'GOBS', 'GlobalJobs', 'useGlobalJobsProvider',
            'batch-jobs/stream', 'VersionTimeline', 'ThemeToggle']
for s in searches:
    found = s in content
    print(f'  Contains "{s}": {found}')

print(f'\nFirst 300 chars:\n{content[:300]}')
print(f'\n--- All JS files in dist ---')
for fn in sorted(os.listdir(dist)):
    if fn.endswith('.js'):
        fp = os.path.join(dist, fn)
        sz = os.path.getsize(fp)
        with open(fp, 'r', encoding='utf-8') as f:
            head = f.read(500)
        has_global = 'GlobalJobs' in head or 'VersionTimeline' in head or 'batch-jobs/stream' in head
        print(f'  {fn:50s} {sz:>10,d}  {"*** HAS NEW CODE ***" if has_global else ""}')

# Also search ALL JS files for the new strings
print('\n--- Searching ALL JS files for new code ---')
for fn in sorted(os.listdir(dist)):
    if fn.endswith('.js'):
        fp = os.path.join(dist, fn)
        with open(fp, 'r', encoding='utf-8') as f:
            full = f.read()
        for s in ['GlobalJobsPanel', 'VersionTimeline', 'useGlobalJobsProvider', 'batch-jobs/stream?token']:
            if s in full:
                print(f'  Found "{s}" in {fn}')
