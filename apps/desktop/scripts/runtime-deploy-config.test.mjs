import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

for (const script of ['prepare-unix-runtime.mjs', 'prepare-windows-runtime.mjs']) {
  test(`${script} allows target-specific patches to remain unused`, async () => {
    const source = await readFile(new URL(script, import.meta.url), 'utf8')
    assert.match(source, /'--config\.allow-unused-patches=true'/u)
  })
}

test('Windows installed smoke isolates Electron application data', async () => {
  const source = await readFile(new URL('smoke-windows-package.ps1', import.meta.url), 'utf8')
  assert.match(source, /--dsh-package-smoke-root=\$desktopAppDataRoot/u)
  assert.match(source, /--dsh-native-smoke/u)
  assert.match(source, /RedirectStandardError = \$true/u)
  assert.match(source, /desktop-entry\.log/u)
})

test('Desktop ships the runtime peers required by dsh-subprocess', async () => {
  const desktop = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const subprocess = JSON.parse(await readFile(new URL('../../../packages/subprocess/subprocess/package.json', import.meta.url), 'utf8'))
  for (const peer of Object.keys(subprocess.peerDependencies ?? {})) {
    assert.equal(desktop.dependencies?.[peer], 'workspace:^', `${peer} must be packaged with Desktop`)
  }
})
