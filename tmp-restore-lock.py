from pathlib import Path
import subprocess
import json

root = Path(r'D:\10140\deepseek-harness-v2-wt-clean')
REF = 'dsh-v0.1.7-rc.2'

def show(rel):
    data = subprocess.check_output(['git', 'show', f'{REF}:{rel}'], cwd=root)
    return data.decode('utf-16') if data[:2] in (b'\xff\xfe', b'\xfe\xff') else data.decode('utf-8')

# restore official lock + package manifests so frozen-lockfile matches
for rel in [
    'pnpm-lock.yaml',
    'package.json',
    'apps/cli/package.json',
    'apps/desktop/package.json',
    'apps/desktop-host/package.json',
]:
    try:
        text = show(rel)
    except Exception as e:
        print('skip', rel, e)
        continue
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    # keep fenglin desktop product version
    if rel == 'apps/desktop/package.json':
        try:
            obj = json.loads(text)
            obj['version'] = '3.0.3'
            obj['description'] = 'Cross-platform Electron host for the DeepSeek Harness Web GUI'
            text = json.dumps(obj, indent=2, ensure_ascii=False) + '\n'
        except Exception:
            pass
    if rel == 'package.json':
        try:
            obj = json.loads(text)
            obj['version'] = '3.1.1'
            text = json.dumps(obj, indent=2, ensure_ascii=False) + '\n'
        except Exception:
            pass
    p.write_bytes(text.encode('utf-8'))
    print('restored', rel)

# also restore every workspace package.json that exists in official
for rel in subprocess.check_output(['git','ls-tree','-r','--name-only',REF], cwd=root).decode().splitlines():
    if rel.endswith('/package.json') or rel == 'package.json':
        if rel in ('package.json', 'apps/cli/package.json', 'apps/desktop/package.json', 'apps/desktop-host/package.json'):
            continue
        try:
            p = root / rel
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(show(rel).encode('utf-8'))
        except Exception:
            pass
print('all package.json restored from official lock era')
