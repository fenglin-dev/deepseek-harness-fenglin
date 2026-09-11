import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DOWNLOAD_NETWORK_SETTINGS, DownloadNetworkSettingsStore, npmRegistryUrl,
  type SecretEncryption,
} from '../src/download-network-settings.ts'

const encryption: SecretEncryption = {
  available: () => true,
  encrypt: value => Buffer.from(`sealed:${value}`),
  decrypt: value => value.toString().replace(/^sealed:/u, ''),
}

describe('download network settings', () => {
  it('defaults to GitHub/system and preserves existing plugin routing', () => {
    const store = new DownloadNetworkSettingsStore(join(mkdtempSync(join(tmpdir(), 'dsh-network-')), 'settings.json'), encryption)
    expect(store.read()).toEqual(DEFAULT_DOWNLOAD_NETWORK_SETTINGS)
  })

  it('persists redacted credentials with strict per-target validation', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'dsh-network-')), 'settings.json')
    const store = new DownloadNetworkSettingsStore(path, encryption)
    const settings = store.update({
      target: 'npm',
      npm: {
        registry: 'custom', registryUrl: 'https://registry.example.test/',
        proxy: { mode: 'custom', url: 'http://127.0.0.1:7890', username: 'user' }, password: 'secret',
      },
    })
    expect(settings.npm).toEqual({
      registry: 'custom', registryUrl: 'https://registry.example.test',
      proxy: { mode: 'custom', url: 'http://127.0.0.1:7890', username: 'user', passwordSet: true },
    })
    expect(store.password('npm')).toBe('secret')
    expect(readFileSync(path, 'utf8')).not.toContain('"secret"')
    expect(() => store.update({ target: 'npm', npm: {
      registry: 'custom', registryUrl: 'http://unsafe.test', proxy: { mode: 'direct' },
    } })).toThrow(/HTTPS/u)
  })

  it('retains a password in memory when secure encryption is unavailable', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'dsh-network-')), 'settings.json')
    const store = new DownloadNetworkSettingsStore(path, { ...encryption, available: () => false })
    expect(store.update({ target: 'github', github: {
      download: 'original', proxy: { mode: 'custom', url: 'https://proxy.example.test' }, password: 'session-only',
    } }).github.proxy.passwordSet).toBe(true)
    expect(readFileSync(path, 'utf8')).not.toContain('session-only')
    expect(store.password('github')).toBe('session-only')
  })

  it('resolves only explicitly selected npm registries', () => {
    expect(npmRegistryUrl({ registry: 'existing', proxy: { mode: 'existing', passwordSet: false } })).toBeUndefined()
    expect(npmRegistryUrl({ registry: 'npmmirror', proxy: { mode: 'direct', passwordSet: false } })).toBe('https://registry.npmmirror.com')
  })

  it('retains bounded operation revisions across later saves', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'dsh-network-')), 'settings.json')
    const store = new DownloadNetworkSettingsStore(path, encryption)
    store.update({ target: 'npm', npm: {
      registry: 'npmmirror', proxy: { mode: 'custom', url: 'https://proxy.old.test' }, password: 'old-secret',
    } })
    const operationRevision = store.read().revision
    store.update({ target: 'npm', npm: {
      registry: 'npmjs', proxy: { mode: 'custom', url: 'https://proxy.new.test' }, password: 'new-secret',
    } })
    expect(store.operationSnapshot(operationRevision)).toMatchObject({
      settings: { revision: operationRevision, npm: { registry: 'npmmirror', proxy: { url: 'https://proxy.old.test' } } },
      passwords: { npm: 'old-secret' },
    })
  })
})
