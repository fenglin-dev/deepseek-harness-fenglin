from pathlib import Path
import subprocess

root = Path(r'D:\10140\deepseek-harness-v2-wt-clean')

def show(rel):
    data = subprocess.check_output(['git', 'show', f'dsh-v0.1.7-rc.2:{rel}'], cwd=root)
    return data.decode('utf-16') if data[:2] in (b'\xff\xfe', b'\xfe\xff') else data.decode('utf-8')

for prefix in ['apps/cli/src', 'packages/host/plugin-inventory/src', 'packages/boot/app-boot/src']:
    for rel in subprocess.check_output(['git','ls-tree','-r','--name-only','dsh-v0.1.7-rc.2','--', prefix], cwd=root).decode().splitlines():
        (root/rel).parent.mkdir(parents=True, exist_ok=True)
        (root/rel).write_bytes(show(rel).encode('utf-8'))
    print('synced', prefix)
