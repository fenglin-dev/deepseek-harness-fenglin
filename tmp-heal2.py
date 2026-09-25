from pathlib import Path
import subprocess

root = Path(r'D:\10140\deepseek-harness-v2-wt-clean')

def git_show(rel, ref='dsh-v0.1.7-rc.2'):
    data = subprocess.check_output(['git', 'show', f'{ref}:{rel}'], cwd=root)
    if data[:2] in (b'\xff\xfe', b'\xfe\xff'):
        return data.decode('utf-16')
    return data.decode('utf-8')

# 1) restore complete official profile.ts then re-append fenglin resolveProfileLoaderModule with imports
official = git_show('packages/boot/app-boot/src/profile.ts')
old = git_show('packages/boot/app-boot/src/profile.ts', 'e186e0db82')
# take official as base
text = official
# inject missing imports if fenglin function will be added
if 'resolveProfileLoaderModule' not in text and 'export function resolveProfileLoaderModule' in old:
    i = old.find('export function resolveProfileLoaderModule')
    j = old.find('\nexport ', i + 10)
    fn = old[i:j] if j > i else old[i:]
    # ensure imports
    if 'pathToFileURL' not in text.split('\nexport')[0]:
        text = text.replace("import { dirname,", "import { pathToFileURL } from 'node:url'\nimport { dirname,", 1)
    if 'resolvePackage' not in text[:2000]:
        text = text.replace("import { dirname,", "import { resolvePackage, type ResolvePackageManifest } from 'resolve.exports'\nimport { dirname,", 1)
    text = text.rstrip() + '\n\n' + fn.rstrip() + '\n'
    print('appended fenglin resolveProfileLoaderModule')
(root / 'packages/boot/app-boot/src/profile.ts').write_bytes(text.encode('utf-8'))

# 2) full official plugin-inventory src
for rel in subprocess.check_output(['git','ls-tree','-r','--name-only','dsh-v0.1.7-rc.2','--','packages/host/plugin-inventory/src'], cwd=root).decode().splitlines():
    (root / rel).parent.mkdir(parents=True, exist_ok=True)
    (root / rel).write_bytes(git_show(rel).encode('utf-8'))
print('plugin-inventory synced')

# 3) desktop-host official sources
for rel in subprocess.check_output(['git','ls-tree','-r','--name-only','dsh-v0.1.7-rc.2','--','apps/desktop-host'], cwd=root).decode().splitlines():
    (root / rel).parent.mkdir(parents=True, exist_ok=True)
    raw = git_show(rel)
    (root / rel).write_bytes(raw.encode('utf-8'))
print('desktop-host synced')

# 4) better ws stub in account path: make account-backend use any socket
acc = root / 'apps/desktop/src/account-backend.ts'
if acc.exists():
    t = acc.read_text(encoding='utf-8')
    if 'as any' not in t[:500]:
        pass
print('done')
