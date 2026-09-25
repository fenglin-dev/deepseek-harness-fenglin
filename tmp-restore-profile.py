from pathlib import Path
import subprocess

root = Path(r'D:\10140\deepseek-harness-v2-wt-clean')
data = subprocess.check_output(['git', 'show', 'dsh-v0.1.7-rc.2:packages/boot/app-boot/src/profile.ts'], cwd=root)
# strip UTF-16 BOM if present
if data[:2] == b'\xff\xfe':
    text = data.decode('utf-16')
elif data[:2] == b'\xfe\xff':
    text = data.decode('utf-16')
else:
    text = data.decode('utf-8')

# re-apply fenglin loader fallbacks from previous fenglin profile.ts
old = subprocess.check_output(['git', 'show', 'e186e0db82:packages/boot/app-boot/src/profile.ts'], cwd=root)
old_t = old.decode('utf-8', errors='replace') if old[:2] not in (b'\xff\xfe', b'\xfe\xff') else old.decode('utf-16')

# If official dropped resolveProfileLoaderModule entirely, restore fenglin version
if 'resolveProfileLoaderModule' not in text and 'resolveProfileLoaderModule' in old_t:
    i = old_t.find('export function resolveProfileLoaderModule')
    j = old_t.find('\nexport ', i + 10)
    fn = old_t[i:j] if j > i else old_t[i:]
    text = text.rstrip() + '\n\n' + fn.rstrip() + '\n'
    print('restored resolveProfileLoaderModule')
elif 'resolveProfileLoaderModule' in text:
    print('official already has resolveProfileLoaderModule')
    # ensure fenglin fallbacks exist
    if 'Direct profile layout fallback' not in text and 'Direct profile layout fallback' in old_t:
        text = text.replace(
            "const packageDir = packageDirFromAnchor(join(profileDir, 'package.json'), packageName)\n  if (packageDir === undefined) return undefined",
            "const packageDir = packageDirFromAnchor(join(profileDir, 'package.json'), packageName)\n    ?? (() => {\n      // Direct profile layout fallback when Node's path probe misses a sealed copy.\n      const direct = join(profileDir, 'node_modules', ...packageName.split('/'))\n      return existsSync(join(direct, 'package.json')) ? direct : undefined\n    })()\n  if (packageDir === undefined) return undefined",
        )
        print('inserted direct layout fallback')
    if 'main/lib fallbacks' not in text and 'main/lib fallbacks' in old_t:
        # port the fallback loop into exports resolution if missing
        print('NOTE: main/lib fallbacks missing, copying block from fenglin')
        k = old_t.find("for (const fallback of [manifest.main, 'lib/index.js', 'index.js'])")
        print(old_t[k:k+600] if k>=0 else 'block not found')
else:
    print('resolveProfileLoaderModule missing in BOTH?')

# write UTF-8 no BOM
(root / 'packages/boot/app-boot/src/profile.ts').write_bytes(text.encode('utf-8'))
print('wrote', len(text), 'chars')
print('verify', (root / 'packages/boot/app-boot/src/profile.ts').read_text(encoding='utf-8')[:20])
