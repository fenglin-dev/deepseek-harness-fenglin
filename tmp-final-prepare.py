from pathlib import Path
import subprocess

root = Path(r'D:\10140\deepseek-harness-v2-wt-clean')
OLD = 'e186e0db82'
REF = 'dsh-v0.1.7-rc.2'

def show(rel, ref):
    data = subprocess.check_output(['git', 'show', f'{ref}:{rel}'], cwd=root)
    return data.decode('utf-16') if data[:2] in (b'\xff\xfe', b'\xfe\xff') else data.decode('utf-8')

# 1) take official app-boot tests
for rel in subprocess.check_output(['git','ls-tree','-r','--name-only',REF,'--','packages/boot/app-boot/tests'], cwd=root).decode().splitlines():
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(show(rel, REF).encode('utf-8'))
print('app-boot tests official')

# 2) append missing fenglin exports to official app-boot index if referenced by tests
idx = root / 'packages/boot/app-boot/src/index.ts'
t = idx.read_text(encoding='utf-8')
old = show('packages/boot/app-boot/src/index.ts', OLD)
need = []
for name in ['inspectProfileLegacySessionApi', 'watchUserPatches', 'loadDiagnosticProfile', 'resolveProfileLoaderModule', 'allowProfilePackageBuild', 'createProfilePluginSnapshot']:
    if name not in t and name in old:
        need.append(name)
print('need fenglin exports', need)

# extract export lines from old index for those names
if need:
    lines = old.splitlines()
    extra = []
    for i, line in enumerate(lines):
        if 'export' in line and any(n in line for n in need):
            extra.append(line)
            # include continuation lines if wrapped
            j = i + 1
            while j < len(lines) and lines[j].strip().startswith((' ', '}')) and 'from' not in lines[i]:
                extra.append(lines[j])
                if 'from' in lines[j]:
                    break
                j += 1
    if extra:
        t = t.rstrip() + '\n\n// Fenglin compatibility exports retained from 3.0.3 overlay\n' + '\n'.join(extra) + '\n'
        idx.write_text(t, encoding='utf-8')
        print('appended exports', extra[:5])

# 3) soft-include stub in tsconfig if missing
ts = root / 'tsconfig.host.json'
tt = ts.read_text(encoding='utf-8')
if 'type-stubs-optional-deps.d.ts' not in tt:
    tt = tt.replace('"packages/client/*/src/**"', '"packages/client/*/src/**",\n    "apps/desktop/src/type-stubs-optional-deps.d.ts"')
    ts.write_text(tt, encoding='utf-8')

print('final prepare done')
