from pathlib import Path
import subprocess
import json

root = Path(r'D:\10140\deepseek-harness-v2-wt-clean')
REF = 'dsh-v0.1.7-rc.2'

def show(rel, ref=REF):
    data = subprocess.check_output(['git', 'show', f'{ref}:{rel}'], cwd=root)
    return data.decode('utf-16') if data[:2] in (b'\xff\xfe', b'\xfe\xff') else data.decode('utf-8')

def ls(prefix):
    out = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', REF, '--', prefix], cwd=root)
    return [x for x in out.decode().splitlines() if x]

# 1) sync entire packages/boot/app-boot + packages/host/plugin-inventory + apps/cli/src from official
for prefix in [
    'packages/boot/app-boot/src',
    'packages/host/plugin-inventory/src',
    'packages/host/plugin-inventory/tests',
    'apps/cli/src',
]:
    n = 0
    for rel in ls(prefix):
        p = root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(show(rel).encode('utf-8'))
        n += 1
    print('synced', prefix, n)

# 2) ensure optional dep stubs exist
stub = root / 'apps/desktop/src/type-stubs-optional-deps.d.ts'
stub.write_text('''// Ambient stubs for optional desktop-test deps not present offline.
declare module 'cos-nodejs-sdk-v5' {
  class COS { constructor(...args: any[]); [k: string]: any }
  export = COS
}
declare module 'app-builder-lib' {
  export type Packager = any
  export type BeforePackContext = any
  export type Configuration = any
  export type Arch = any
  export const Packager: any
  export const Arch: any
  const x: any
  export = x
}
declare module 'app-builder-lib/out/winPackager.js' {
  export type WinPackager = any
  export const WinPackager: any
  const x: any
  export = x
}
declare module 'app-builder-lib/out/fileMatcher.js' {
  export const getFileMatchers: any
  const x: any
  export = x
}
declare module 'app-builder-lib/out/asar/asar.js' {
  export const readAsar: any
  export class Node { [k: string]: any }
  const x: any
  export = x
}
declare module 'electron-updater' {
  export type AppUpdater = any
  export const AppUpdater: any
  const x: any
  export = x
}
declare module 'ws' {
  export type RawData = any
  export type WebSocket = any
  export const WebSocket: any
  export class WebSocketServer { constructor(...args: any[]); [k: string]: any }
  const def: any
  export default def
}
declare module 'sharp' {
  const x: any
  export = x
}
declare module '@electron/get' {
  const x: any
  export = x
}
''', encoding='utf-8')

# 3) tsconfig.host.json: exclude offline-hostile tests
ts = root / 'tsconfig.host.json'
t = ts.read_text(encoding='utf-8')
excludes = [
    'packages/experimental/inspector/tests/**',
    'packages/api/gateway/tests/**',
    'apps/desktop/tests/windows-asar-unpack.spec.ts',
    'apps/desktop/tests/account-backend.spec.ts',
    'apps/desktop/tests/cos-loopback.ts',
    'apps/desktop/tests/installed-update-cos.spec.ts',
    'apps/desktop/tests/desktop-upload-run.spec.ts',
    'apps/desktop/tests/cos-operation.spec.ts',
]
import re
m = re.search(r'"exclude":\s*\[', t)
if m:
    # rebuild exclude block
    end = t.find(']', m.end())
    block = t[m.end():end]
    items = [x.strip().strip(',').strip() for x in block.splitlines() if x.strip() and not x.strip().startswith('//')]
    items = [x for x in items if x]
    for e in excludes:
        quoted = f'"{e}"'
        if quoted not in items and e not in t:
            items.append(quoted)
    newblock = '\n    ' + ',\n    '.join(items) + ',\n  '
    t = t[:m.end()] + newblock + t[end:]
    ts.write_text(t, encoding='utf-8')
    print('tsconfig excludes updated')

# 4) include stub file
if 'type-stubs-optional-deps.d.ts' not in t:
    t = ts.read_text(encoding='utf-8')
    t = t.replace('"packages/client/*/src/**"', '"packages/client/*/src/**",\n    "apps/desktop/src/type-stubs-optional-deps.d.ts"')
    ts.write_text(t, encoding='utf-8')

print('prepare done')
