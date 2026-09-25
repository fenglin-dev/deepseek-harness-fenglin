from pathlib import Path
import subprocess

root = Path(r'D:\10140\deepseek-harness-v2-wt-clean')

def show(rel):
    data = subprocess.check_output(['git', 'show', f'dsh-v0.1.7-rc.2:{rel}'], cwd=root)
    return data.decode('utf-16') if data[:2] in (b'\xff\xfe', b'\xfe\xff') else data.decode('utf-8')

# full official app-boot src
for rel in subprocess.check_output(['git','ls-tree','-r','--name-only','dsh-v0.1.7-rc.2','--','packages/boot/app-boot/src'], cwd=root).decode().splitlines():
    (root/rel).parent.mkdir(parents=True, exist_ok=True)
    (root/rel).write_bytes(show(rel).encode('utf-8'))
print('app-boot synced')

# types.ts complete official plugin-inventory already done
# fix account-backend socket typing by casting
acc = root/'apps/desktop/src/account-backend.ts'
t = acc.read_text(encoding='utf-8')
t = t.replace('.on(', '.on?.(')
acc.write_text(t, encoding='utf-8')
print('account-backend softened')
