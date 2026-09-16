import { describe, expect, it } from 'vitest'
import { claimDesktopWebLaunch } from '../src/desktop-web-launch.ts'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

describe('Desktop Web restart ownership', () => {
  it('stops an inherited replacement at the real CLI entry before initializing a Profile', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-owned-web-'))
    try {
      const home = join(root, 'home')
      const environment: NodeJS.ProcessEnv = { ...process.env, DSH_HOME: home, DSH_DESKTOP_WEB_RESTART_OWNER: String(process.pid) }
      expect(claimDesktopWebLaunch('web', home, environment)).toBe(true)
      const result = spawnSync(process.execPath, ['--import', 'tsx/esm', fileURLToPath(new URL('../src/bin.ts', import.meta.url)), 'web'], {
        env: environment, encoding: 'utf8', timeout: 15_000, windowsHide: true,
      })
      expect(result.status, result.stderr).toBe(0)
      expect(result.stderr).toContain('no second service started')
      expect(existsSync(join(home, 'profiles'))).toBe(false)
    } finally { rmSync(root, { recursive: true, force: true }) }
  })

  it('admits the Supervisor launch but not an inherited same-Profile replacement', () => {
    const environment: NodeJS.ProcessEnv = { DSH_DESKTOP_WEB_RESTART_OWNER: '123' }
    expect(claimDesktopWebLaunch('web', '/tmp/desktop home', environment)).toBe(true)
    expect(claimDesktopWebLaunch('web', '/tmp/desktop home', { ...environment })).toBe(false)
    expect(claimDesktopWebLaunch('web', '/tmp/desktop home/.', { ...environment })).toBe(false)
    expect(claimDesktopWebLaunch('sdk', '/tmp/desktop home', { ...environment })).toBe(true)
    expect(claimDesktopWebLaunch('web', '/tmp/another home', { ...environment })).toBe(true)
  })

  it('does not alter standalone CLI environments', () => {
    const environment = { DSH_HOME: '/tmp/standalone' }
    expect(claimDesktopWebLaunch('web', environment.DSH_HOME, environment)).toBe(true)
    expect(environment).toEqual({ DSH_HOME: '/tmp/standalone' })
  })

  it('fails closed for invalid inherited ownership', () => {
    expect(() => claimDesktopWebLaunch('web', '/tmp/home', { DSH_DESKTOP_WEB_RESTART_OWNER: 'bad' })).toThrow()
    for (const record of ['{', 'null', '{}', '{"ownerPid":124,"home":"/tmp/home","hostPid":12}']) {
      expect(() => claimDesktopWebLaunch('web', '/tmp/home', {
        DSH_DESKTOP_WEB_RESTART_OWNER: '123', DSH_DESKTOP_WEB_GENERATION: record,
      })).toThrow()
    }
  })
})
