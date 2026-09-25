from pathlib import Path
import subprocess

root = Path(r'D:\10140\deepseek-harness-v2-wt-clean')

def git_show(ref_path: str) -> bytes:
    return subprocess.check_output(['git', 'show', ref_path], cwd=root)

def write_utf8(path: Path, data: bytes) -> None:
    if data[:2] in (b'\xff\xfe', b'\xfe\xff'):
        text = data.decode('utf-16')
    elif data[:8] == b'\x89PNG\r\n\x1a\n' or data[:2] == b'\xff\xd8' or data[:4] == b'\x00\x00\x01\x00':
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return
    else:
        try:
            text = data.decode('utf-8')
        except UnicodeDecodeError:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(text.encode('utf-8'))

# 1) restore every official apps/desktop file that is missing OR starts with UTF-16 BOM
official = subprocess.check_output(
    ['git', 'ls-tree', '-r', '--name-only', 'dsh-v0.1.7-rc.2', '--', 'apps/desktop'],
    cwd=root).decode().splitlines()
fixed = 0
for rel in official:
    if not rel.startswith('apps/desktop/'):
        continue
    p = root / rel
    need = False
    if not p.exists():
        need = True
    else:
        raw = p.read_bytes()[:2]
        if raw in (b'\xff\xfe', b'\xfe\xff'):
            need = True
    if need:
        write_utf8(p, git_show(f'dsh-v0.1.7-rc.2:{rel}'))
        fixed += 1
print('restored desktop files', fixed)

# 2) take official for remaining mismatched packages
for rel in [
    'packages/subagent/tool-subagent/src/index.ts',
    'packages/session/session-log-deepseek/tests/config.spec.ts',
    'packages/host/plugin-inventory/src/index.ts',
]:
    data = git_show(f'dsh-v0.1.7-rc.2:{rel}')
    write_utf8(root / rel, data)
    print('official', rel)

# 3) ensure profile.ts is fenglin-enriched official
profile = root / 'packages/boot/app-boot/src/profile.ts'
raw = profile.read_bytes()
if raw[:2] in (b'\xff\xfe', b'\xfe\xff'):
    write_utf8(profile, raw)
print('profile encoding ok', profile.read_bytes()[:3])
print('resolve in profile', b'resolveProfileLoaderModule' in profile.read_bytes())
