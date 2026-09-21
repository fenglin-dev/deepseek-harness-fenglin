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

  const [unixRuntime, windowsRuntime, optionalRuntime] = await Promise.all([
    read('apps/desktop/scripts/prepare-unix-runtime.mjs'),
    read('apps/desktop/scripts/prepare-windows-runtime.mjs'),
    read('apps/desktop/scripts/prepare-workspace-runtime.ts'),
  ])
  assert.match(unixRuntime, /removeOptionalOfficeEngines/u)
  assert.match(windowsRuntime, /libreoffice-kit-/u)
  assert.match(optionalRuntime, /officialOfficeArtifact/u)
  assert.doesNotMatch(optionalRuntime, /DeepSeek-Harness-office-runtime/u)
})

test('optional runtimes use separate sources instead of the desktop package workflow', async () => {
  const lock = JSON.parse(await read('apps/desktop/scripts/primary-runtime-lock.json'))
  assert.equal(lock.pythonVersion.startsWith('3.12.'), true)
  assert.deepEqual(Object.keys(lock.targets).sort(), ['linux-x64', 'mac-arm64', 'mac-x64', 'win-x64'])
  for (const name of [
    'numpy', 'pandas', 'Pillow', 'lxml', 'python-docx', 'python-pptx', 'openpyxl', 'XlsxWriter',
  ]) assert.equal(typeof lock.pythonPackages[name], 'string', `${name} must be locked`)

  const workflow = await read('.github/workflows/desktop-packages.yml')
  assert.doesNotMatch(workflow, /prepare-workspace-runtime|workspace-runtime-|assemble-workspace-runtime-manifest/u)
  assert.doesNotMatch(workflow, /DeepSeek-Harness-office-runtime/u)
  assert.match(await read('apps/desktop/scripts/official-office-runtime.ts'), /registry\.npmjs\.org/u)
  const metadataWorkflow = await read('.github/workflows/workspace-runtime-release.yml')
  assert.match(metadataWorkflow, /hecoococ\/open-dsh-runtime-assets/u)
  assert.doesNotMatch(metadataWorkflow, /DeepSeek-Harness-office-runtime/u)
  assert.match(metadataWorkflow, /workspace-runtimes-\*\.v2\.json/u)
  assert.match(metadataWorkflow, /DeepSeek-Harness-workspace-runtime-\*\.tar\.gz/u)
  assert.match(metadataWorkflow, /workspace-runtime-release-metadata/u)
  assert.match(metadataWorkflow, /ref: \$\{\{ inputs\.source_sha \}\}/u)
  assert.match(metadataWorkflow, /git rev-parse HEAD/u)
  assert.match(metadataWorkflow, /workspace-runtime-manifest-from-release\.ts dist '\$\{\{ inputs\.tag \}\}' '\$\{\{ inputs\.source_sha \}\}'/u)
  assert.doesNotMatch(metadataWorkflow, /gh release upload|sync-cnb-desktop-releases/u)
})
