import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { profilePackageDownloadEnvironment } from '../src/profile-package-manager.ts'

describe('profile package download environment', () => {
  it('applies the live desktop registry and operation proxy without changing its input', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'dsh package network ')), 'settings.json')
    writeFileSync(file, JSON.stringify({ revision: 7, npm: { registry: 'npmmirror' } }))
    const input = { DSH_DESKTOP_DOWNLOAD_NETWORK_FILE: file, DSH_DESKTOP_PACKAGE_PROXY_URL: 'http://plugins:token@127.0.0.1:3210' }
    expect(profilePackageDownloadEnvironment(input)).toMatchObject({
      npm_config_registry: 'https://registry.npmmirror.com',
      npm_config_https_proxy: 'http://plugins-7:token@127.0.0.1:3210',
      HTTPS_PROXY: 'http://plugins-7:token@127.0.0.1:3210',
      NO_PROXY: '',
    })
    expect(input).not.toHaveProperty('npm_config_registry')
  })

  it('preserves inherited registry settings when the settings file is unreadable or unchanged', () => {
    const input = { DSH_DESKTOP_DOWNLOAD_NETWORK_FILE: '/missing/settings.json', npm_config_registry: 'https://private.example.test' }
    expect(profilePackageDownloadEnvironment(input).npm_config_registry).toBe(input.npm_config_registry)
  })
})
