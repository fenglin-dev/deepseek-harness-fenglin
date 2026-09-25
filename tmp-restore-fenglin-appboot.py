from pathlib import Path
import subprocess

root = Path(r'D:\10140\deepseek-harness-v2-wt-clean')
FENGLIN = 'e186e0db82'
REF = 'dsh-v0.1.7-rc.2'

def show(rel, ref):
    data = subprocess.check_output(['git', 'show', f'{ref}:{rel}'], cwd=root)
    return data.decode('utf-16') if data[:2] in (b'\xff\xfe', b'\xfe\xff') else data.decode('utf-8')

# restore fenglin app-boot (src + tests) — desktop depends on these exports
for prefix in ['packages/boot/app-boot/src', 'packages/boot/app-boot/tests']:
    for rel in subprocess.check_output(['git','ls-tree','-r','--name-only',FENGLIN,'--',prefix], cwd=root).decode().splitlines():
        p = root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(show(rel, FENGLIN).encode('utf-8'))
    print('fenglin', prefix)

# keep official plugin-inventory + cli (already synced)
print('done restore fenglin app-boot')
