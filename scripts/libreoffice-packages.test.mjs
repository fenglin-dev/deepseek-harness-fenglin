import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { verifyBundledOfficeIdentity } from './libreoffice-packages.mjs'

test('deployed Office package must match the installer catalog before packaging', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-office-identity-'))
  const kitRoot = join(root, 'node_modules', '@deepseek-ai', 'libreoffice-kit')
  const engineRoot = join(root, 'node_modules', '@deepseek-ai', 'libreoffice-kit-win32-x64')
  const metadata = join(root, 'workspace-runtime-win32-x64.json')
  const enginePackage = '@deepseek-ai/libreoffice-kit-win32-x64'
  const target = { release: 'win32-x64', platform: 'win32', arch: 'x64' }
  try {
    await Promise.all([mkdir(kitRoot, { recursive: true }), mkdir(engineRoot, { recursive: true })])
    await writeFile(metadata, JSON.stringify({
      target: 'win32-x64', office: { enginePackage, engineVersion: '0.1.1' },
    }))
    const writeKit = version => writeFile(join(kitRoot, 'package.json'), JSON.stringify({
      name: '@deepseek-ai/libreoffice-kit', version,
      optionalDependencies: { [enginePackage]: version },
    }))
    const writeEngine = version => writeFile(join(engineRoot, 'package.json'), JSON.stringify({
      name: enginePackage, version,
    }))
    await Promise.all([writeKit('0.1.2'), writeEngine('0.1.2')])
    await assert.rejects(verifyBundledOfficeIdentity(root, target, metadata), /expected .*@0\.1\.1, deployed kit 0\.1\.2/u)
    await Promise.all([writeKit('0.1.1'), writeEngine('0.1.1')])
    assert.equal(await verifyBundledOfficeIdentity(root, target, metadata), enginePackage)
    await writeFile(join(engineRoot, 'package.json'), JSON.stringify({ name: enginePackage, version: '0.1.2' }))
    await assert.rejects(verifyBundledOfficeIdentity(root, target, metadata), /deployed kit 0\.1\.1, .*@0\.1\.2/u)
    const fragment = JSON.parse(await readFile(metadata, 'utf8'))
    fragment.target = 'darwin-arm64'
    await writeFile(metadata, JSON.stringify(fragment))
    await assert.rejects(verifyBundledOfficeIdentity(root, target, metadata), /metadata target darwin-arm64/u)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
