import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../..')
const read = path => readFile(join(root, path), 'utf8')

test('desktop installers exclude optional Python payloads while the Harness closure keeps adapters', async () => {
  const builderConfigs = await Promise.all([
    'apps/desktop/electron-builder.yml',
    'apps/desktop/electron-builder.macos.yml',
    'apps/desktop/electron-builder.linux.yml',
  ].map(read))
  for (const config of builderConfigs) {
    assert.match(config, /- scripts\/primary-runtime-lock\.json/u)
    assert.doesNotMatch(config, /workspace-runtime-(?!lock)[^\n]*\.(?:tar|zip)|\.whl|python(?:3|\.exe)/iu)
  }

  const cli = JSON.parse(await read('apps/cli/package.json'))
  for (const name of [
    '@deepseek-ai/dsh-host-workspace-runtime',
    '@deepseek-ai/dsh-skill-office',
    '@deepseek-ai/dsh-experimental-ptc-runtime-python',
  ]) assert.equal(typeof cli.dependencies[name], 'string', `${name} must remain in the production closure`)

  assert.doesNotMatch(await read('apps/desktop-host/src/index.ts'), /primary-runtime|desktopOffice/u)
})

test('the optional runtime lock and package workflow cover the exact supported targets and Office set', async () => {
  const lock = JSON.parse(await read('apps/desktop/scripts/primary-runtime-lock.json'))
  assert.equal(lock.pythonVersion.startsWith('3.12.'), true)
  assert.deepEqual(Object.keys(lock.targets).sort(), ['linux-x64', 'mac-arm64', 'mac-x64', 'win-x64'])
  for (const name of [
    'numpy', 'pandas', 'Pillow', 'lxml', 'python-docx', 'python-pptx', 'openpyxl', 'XlsxWriter',
  ]) assert.equal(typeof lock.pythonPackages[name], 'string', `${name} must be locked`)

  const workflow = await read('.github/workflows/desktop-packages.yml')
  assert.match(workflow, /workspace-runtime-win32-x64/u)
  assert.match(workflow, /workspace-runtime-linux-x64/u)
  assert.match(workflow, /workspace-runtime-darwin-\$\{\{ matrix\.arch \}\}/u)
  assert.match(workflow, /arch: arm64/u)
  assert.match(workflow, /arch: x64/u)
})
