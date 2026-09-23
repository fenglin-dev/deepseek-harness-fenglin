import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const script = resolve(import.meta.dirname, 'windows-package-candidate.mjs')

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout)
  return result.stdout
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-windows-candidate-'))
  await mkdir(join(root, 'apps', 'desktop', 'scripts'), { recursive: true })
  await mkdir(join(root, 'apps', 'desktop', 'bundled-plugins'), { recursive: true })
  await mkdir(join(root, '.artifacts', 'desktop-windows'), { recursive: true })
  await writeFile(join(root, 'apps', 'desktop', 'main.ts'), 'export const value = 1\n')
  await writeFile(join(root, 'apps', 'desktop', 'scripts', 'smoke-windows-package.ps1'), 'Write-Host smoke\n')
  await writeFile(join(root, 'apps', 'desktop', 'bundled-plugins', 'plugin.tgz'), 'plugin-v1')
  await writeFile(join(root, '.artifacts', 'desktop-windows', 'DeepSeek-Harness-windows-x64.exe'), 'installer-v1')
  run('git', ['init', '-q'], root)
  run('git', ['config', 'user.name', 'fixture'], root)
  run('git', ['config', 'user.email', 'fixture@example.invalid'], root)
  run('git', ['add', '.'], root)
  run('git', ['commit', '-qm', 'fixture'], root)
  return {
    root,
    installer: join(root, '.artifacts', 'desktop-windows', 'DeepSeek-Harness-windows-x64.exe'),
    plugins: join(root, 'apps', 'desktop', 'bundled-plugins'),
    manifest: join(root, '.artifacts', 'desktop-windows', 'candidate.json'),
  }
}

test('verifies reusable candidates by packaged inputs, plugin bytes and installer identity', async () => {
  const item = await fixture()
  run(process.execPath, [script, 'create', item.root, item.installer, item.plugins, item.manifest], item.root)
  const document = JSON.parse(await readFile(item.manifest, 'utf8'))
  assert.equal(document.schema, 'open-dsh/windows-package-candidate/v1')
  run(process.execPath, [script, 'verify', item.root, item.installer, item.plugins, item.manifest], item.root)

  await writeFile(join(item.root, 'apps', 'desktop', 'scripts', 'smoke-windows-package.ps1'), 'Write-Host fixed-smoke\n')
  run('git', ['add', '.'], item.root)
  run(process.execPath, [script, 'verify', item.root, item.installer, item.plugins, item.manifest], item.root)

  await writeFile(join(item.root, 'apps', 'desktop', 'main.ts'), 'export const value = 2\n')
  run('git', ['add', '.'], item.root)
  assert.throws(() => run(process.execPath, [script, 'verify', item.root, item.installer, item.plugins, item.manifest], item.root), /packagingInputDigest/u)
})

test('rejects changed plugin and installer bytes', async () => {
  const item = await fixture()
  run(process.execPath, [script, 'create', item.root, item.installer, item.plugins, item.manifest], item.root)
  await writeFile(join(item.plugins, 'plugin.tgz'), 'plugin-v2')
  assert.throws(() => run(process.execPath, [script, 'verify', item.root, item.installer, item.plugins, item.manifest], item.root), /bundledPluginDigest/u)
  await writeFile(join(item.plugins, 'plugin.tgz'), 'plugin-v1')
  await writeFile(item.installer, 'installer-v2')
  assert.throws(() => run(process.execPath, [script, 'verify', item.root, item.installer, item.plugins, item.manifest], item.root), /installer/u)
})
