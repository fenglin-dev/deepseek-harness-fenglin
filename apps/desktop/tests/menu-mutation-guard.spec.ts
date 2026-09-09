import { mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { inspectProfileMutationLock, menuMutationActive } from '../src/menu-mutation-guard.ts'
import { createDesktopLifecycle } from '../src/window-lifecycle.ts'
const homes: string[] = []
afterEach(() => { vi.restoreAllMocks(); for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true }) })
function home() {
  const root = mkdtempSync(join(tmpdir(), 'desktop-menu-lock-'))
  homes.push(root)
  const directory = join(root, 'plugin-snapshots', 'v1')
  mkdirSync(directory, { recursive: true })
  return { root, lock: join(directory, '.profile-plugin-mutation.web.lock') }
}
describe('read-only plugin mutation guard', () => {
  it('blocks quit and restart for an external plugin lease until its owner releases it', async () => {
    const b = home()
    const source = JSON.stringify({ pid: process.pid, operationKind: 'profile-mutation' })
    writeFileSync(b.lock, source)
    const disposeHost = vi.fn(async () => {})
    const releaseQuit = vi.fn()
    const relaunch = vi.fn()
    const lifecycle = createDesktopLifecycle({
      getWindow: () => undefined,
      createWindow: () => { throw new Error('unexpected window creation') },
      readCloseBehavior: () => 'quit',
      canQuit: () => !menuMutationActive(b.root),
      disposeHost, releaseQuit, reportError: vi.fn(),
    })
    await lifecycle.requestQuit()
    await lifecycle.requestRestart(relaunch)
    expect(disposeHost).not.toHaveBeenCalled()
    expect(relaunch).not.toHaveBeenCalled()
    expect(readFileSync(b.lock, 'utf8')).toBe(source)
    unlinkSync(b.lock)
    await lifecycle.requestQuit()
    expect(disposeHost).toHaveBeenCalledOnce()
    expect(releaseQuit).toHaveBeenCalledOnce()
  })
  it('wires external mutation protection into the production recovery and exit routes', () => {
    const source = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8')
    const busy = source.slice(source.indexOf('function menuBusy()'), source.indexOf('function reportMenuError'))
    expect(busy).toContain('menuMutationActive(activeMenuHome)')
    for (const route of ['dsh:desktop:recovery:enter', 'dsh:desktop:recovery:exit']) {
      const handler = source.split(`ipcMain.handle('${route}',`)[1]?.split('\n  })')[0]
      expect(handler).toContain('if (menuBusy()) throw new Error(menuCopy(menuLocale).busy)')
    }
    expect(source).toContain('if (!menuBusy()) return true')
  })
  it('allows a missing lease but blocks live and malformed leases', () => {
    const b = home()
    expect(menuMutationActive(b.root)).toBe(false)
    writeFileSync(b.lock, JSON.stringify({ pid: process.pid }))
    expect(menuMutationActive(b.root)).toBe(true)
    expect(inspectProfileMutationLock(b.root)).toMatchObject({ active: true, state: 'live', pid: process.pid })
    writeFileSync(b.lock, '{')
    expect(menuMutationActive(b.root)).toBe(true)
    expect(inspectProfileMutationLock(b.root)).toMatchObject({ active: true, state: 'malformed' })
  })
  it('allows a proven dead owner but fails closed on permission errors', () => {
    const b = home()
    writeFileSync(b.lock, JSON.stringify({ pid: 99999999 }))
    const probe = vi.spyOn(process, 'kill').mockImplementation(() => { throw Object.assign(new Error('dead'), { code: 'ESRCH' }) })
    expect(menuMutationActive(b.root)).toBe(false)
    expect(inspectProfileMutationLock(b.root)).toMatchObject({ active: false, state: 'dead', pid: 99999999 })
    probe.mockImplementation(() => { throw Object.assign(new Error('denied'), { code: 'EPERM' }) })
    expect(menuMutationActive(b.root)).toBe(true)
  })
})
