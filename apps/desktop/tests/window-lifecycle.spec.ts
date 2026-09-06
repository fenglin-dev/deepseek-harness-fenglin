import { describe, expect, it, vi } from 'vitest'
import { createDesktopLifecycle, type DesktopLifecycleOptions } from '../src/window-lifecycle.ts'

function bench(closeBehavior: 'tray' | 'quit', options: Partial<DesktopLifecycleOptions> = {}) {
  const window = {
    hide: vi.fn(), show: vi.fn(), focus: vi.fn(), restore: vi.fn(), isMinimized: vi.fn(() => false),
  }
  const disposeHost = vi.fn(() => Promise.resolve())
  const releaseQuit = vi.fn()
  const lifecycle = createDesktopLifecycle({
    getWindow: () => window as never,
    createWindow: () => window as never,
    readCloseBehavior: () => closeBehavior,
    disposeHost,
    releaseQuit,
    reportError: vi.fn(),
    ...options,
  })
  return { lifecycle, window, disposeHost, releaseQuit }
}

describe('desktop lifecycle', () => {
  it('does not schedule a relaunch or stop Harness while a plugin mutation is active', async () => {
    const b = bench('quit', { canQuit: () => false })
    const relaunch = vi.fn()
    await b.lifecycle.requestRestart(relaunch)
    await b.lifecycle.requestQuit()
    expect(relaunch).not.toHaveBeenCalled()
    expect(b.disposeHost).not.toHaveBeenCalled()
    expect(b.lifecycle.isQuitting).toBe(false)
  })
  it('keeps the window accessible when tray creation failed', () => {
    const warning = vi.fn()
    const b = bench('tray', { canHideToTray: () => false, onTrayUnavailable: warning })
    b.lifecycle.onWindowClose({ preventDefault: vi.fn() } as never)
    expect(warning).toHaveBeenCalledOnce()
    expect(b.window.hide).not.toHaveBeenCalled()
    expect(b.disposeHost).not.toHaveBeenCalled()
  })
  it('hides an ordinary close when tray behavior is selected', () => {
    const b = bench('tray')
    const event = { preventDefault: vi.fn() }
    b.lifecycle.onWindowClose(event as never)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(b.window.hide).toHaveBeenCalledOnce()
    expect(b.disposeHost).not.toHaveBeenCalled()
  })

  it('serializes quit requests and releases only after host disposal', async () => {
    const b = bench('quit')
    const first = b.lifecycle.requestQuit()
    const second = b.lifecycle.requestQuit()
    expect(first).toBe(second)
    await first
    expect(b.disposeHost).toHaveBeenCalledOnce()
    expect(b.releaseQuit).toHaveBeenCalledOnce()
  })

  it('schedules one relaunch and performs the same graceful host disposal', async () => {
    const b = bench('tray')
    const relaunch = vi.fn()
    const first = b.lifecycle.requestRestart(relaunch)
    const second = b.lifecycle.requestRestart(relaunch)

    expect(first).toBe(second)
    expect(relaunch).toHaveBeenCalledOnce()
    await first
    expect(b.disposeHost).toHaveBeenCalledOnce()
    expect(b.releaseQuit).toHaveBeenCalledOnce()
  })
})
