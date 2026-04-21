import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')

# Check what index.html references
stdin, stdout, stderr = ssh.exec_command('cat /home/ubuntu/qas-h5/frontend/index.html')
html = stdout.read().decode('utf-8')
print('=== index.html content ===')
print(html)

# Check if the referenced JS files exist
import re
js_refs = re.findall(r'assets/[^"]+\.js', html)
css_refs = re.findall(r'assets/[^"]+\.css', html)
print(f'\n=== JS refs in index.html ({len(js_refs)}) ===')
for ref in js_refs:
    stdin, stdout, stderr = ssh.exec_command(f'ls -la /home/ubuntu/qas-h5/frontend/{ref} 2>/dev/null || echo "MISSING: {ref}"')
    print(stdout.read().decode('utf-8').strip())

# Check the newest build's main chunk for GlobalJobs content
print('\n=== Check newest index JS for useGlobalJobs ===')
for ref in js_refs:
    stdin, stdout, stderr = ssh.exec_command(f'grep -c "useGlobalJobs\\|GlobalJobsPanel\\|GlobalJobsTrigger" /home/ubuntu/qas-h5/frontend/{ref} 2>/dev/null')
    count = stdout.read().decode('utf-8').strip()
    if count and count != '0':
        print(f'{ref}: {count} matches')

# Check nginx config location
stdin, stdout, stderr = ssh.exec_command('ls /etc/nginx/sites-enabled/')
print('\n=== nginx sites ===')
print(stdout.read().decode('utf-8'))

stdin, stdout, stderr = ssh.exec_command('cat /etc/nginx/sites-enabled/qas 2>/dev/null || cat /etc/nginx/sites-enabled/qas.conf 2>/dev/null || echo "trying conf.d..."')
out = stdout.read().decode('utf-8')
if 'trying' in out:
    stdin, stdout, stderr = ssh.exec_command('ls /etc/nginx/conf.d/ && cat /etc/nginx/conf.d/*.conf 2>/dev/null | head -80')
    out = stdout.read().decode('utf-8')
print(out)

ssh.close()
