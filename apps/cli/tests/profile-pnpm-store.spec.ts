import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { load } from 'js-yaml'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { rebindProfilePnpmStore } from '../src/profile-pnpm-store.ts'
import { runProfilePackageManager } from '../src/profile-package-manager.ts'

const roots: string[] = []
function temporary(): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh store 中文 '))
  roots.push(root)
  return root
}
afterEach(() => {
  vi.unstubAllEnvs()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('configuration-local pnpm store', () => {
  it('leaves missing metadata alone and rejects corrupt or symlinked metadata', () => {
    const root = temporary()
    const store = join(root, '.pnpm-store', 'v11')
    expect(() => { rebindProfilePnpmStore(root, store) }).not.toThrow()
    mkdirSync(join(root, 'node_modules'))
    const metadata = join(root, 'node_modules', '.modules.yaml')
    writeFileSync(metadata, '[]')
    expect(() => { rebindProfilePnpmStore(root, store) }).toThrow('invalid pnpm')
    rmSync(metadata)
    const outside = join(root, 'outside.yaml')
    writeFileSync(outside, '{}')
    symlinkSync(outside, metadata)
    expect(() => { rebindProfilePnpmStore(root, store) }).toThrow('linked pnpm')
    expect(readFileSync(outside, 'utf8')).toBe('{}')
  })
  it('rebinds only the cache locator, retaining build decisions and bundle-independent metadata', () => {
    const root = temporary()
    mkdirSync(join(root, 'node_modules', '.pnpm'), { recursive: true })
    const metadata = join(root, 'node_modules', '.modules.yaml')
    const old = { storeDir: join(root, 'old', 'v11'), virtualStoreDir: '.pnpm', pendingBuilds: ['a'], ignoredBuilds: ['b'], layoutVersion: 5 }
    writeFileSync(metadata, JSON.stringify(old))
    const target = join(root, '.pnpm-store', 'v11')
    rebindProfilePnpmStore(root, target)
    expect(load(readFileSync(metadata, 'utf8'))).toEqual({ ...old, storeDir: target })
  })

  it('does not hide store-format or external virtual-store incompatibilities', () => {
    const root = temporary()
    mkdirSync(join(root, 'node_modules'))
    const metadata = join(root, 'node_modules', '.modules.yaml')
    for (const record of [
      { storeDir: join(root, 'old', 'v3'), virtualStoreDir: '.pnpm' },
      { storeDir: join(root, 'old', 'v11'), virtualStoreDir: join(root, 'external') },
    ]) {
      const original = JSON.stringify(record)
      writeFileSync(metadata, original)
      rebindProfilePnpmStore(root, join(root, '.pnpm-store', 'v11'))
      expect(readFileSync(metadata, 'utf8')).toBe(original)
    }
  })

  it.each(['isolated', 'hoisted'])('uses bundled pnpm with %s layout to reuse an old installation and switch homes', (nodeLinker) => {
    const root = temporary()
    const profile = join(root, 'profiles', 'web')
    const pkg = join(root, 'package')
    mkdirSync(profile, { recursive: true })
    mkdirSync(pkg)
    writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: 'store-fixture', version: '1.0.0', main: 'index.js' }))
    writeFileSync(join(pkg, 'index.js'), 'module.exports = 42\n')
    const archive = join(root, 'fixture.tgz')
    execFileSync('tar', ['-czf', archive, '-C', root, 'package'])
    writeFileSync(join(profile, 'package.json'), JSON.stringify({ private: true }))
    writeFileSync(join(profile, 'pnpm-workspace.yaml'), `nodeLinker: ${nodeLinker}\n`)
    const pnpm = resolve('apps/desktop/node_modules/pnpm/bin/pnpm.mjs')
    const oldStore = join(root, 'old-cache')
    execFileSync(process.execPath, [pnpm, '--store-dir', oldStore, 'add', archive, '--ignore-scripts'], {
      cwd: profile, env: { ...process.env, CI: 'true' }, stdio: 'pipe', timeout: 30_000,
    })
    const lock = readFileSync(join(profile, 'pnpm-lock.yaml'), 'utf8')
    vi.stubEnv('DSH_HOME', root)
    vi.stubEnv('DSH_PNPM_BIN', pnpm)
    const result = runProfilePackageManager(profile, ['install', '--offline', '--frozen-lockfile', '--ignore-scripts'])
    expect(result, result.diagnostic).toMatchObject({ exitCode: 0 })
    const data = load(readFileSync(join(profile, 'node_modules', '.modules.yaml'), 'utf8')) as { storeDir: string }
    expect(data.storeDir).toBe(join(root, '.pnpm-store', 'v11'))
    expect(readFileSync(join(profile, 'pnpm-lock.yaml'), 'utf8')).toBe(lock)
    expect(readFileSync(join(profile, 'node_modules', 'store-fixture', 'index.js'), 'utf8')).toContain('42')
    expect(runProfilePackageManager(profile, ['add', archive, '--offline', '--ignore-scripts']).exitCode).toBe(0)
    const removed = runProfilePackageManager(profile, ['remove', 'store-fixture'])
    expect(removed.exitCode, removed.diagnostic).toBe(0)
    const nextHome = join(root, 'another home')
    const nextProfile = join(nextHome, 'profiles', 'web')
    mkdirSync(nextProfile, { recursive: true })
    writeFileSync(join(nextProfile, 'package.json'), JSON.stringify({ private: true }))
    vi.stubEnv('DSH_HOME', nextHome)
    vi.stubEnv('pnpm_config_store_dir', oldStore)
    const added = runProfilePackageManager(nextProfile, ['add', archive, '--offline', '--ignore-scripts'])
    expect(added.exitCode, added.diagnostic).toBe(0)
    const fresh = load(readFileSync(join(nextProfile, 'node_modules', '.modules.yaml'), 'utf8')) as { storeDir: string }
    expect(fresh.storeDir).toBe(join(nextHome, '.pnpm-store', 'v11'))
  }, 60_000)
})
