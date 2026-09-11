import { afterEach, describe, expect, it, vi } from 'vitest'
import { RemoteError } from '@deepseek-ai/dsh-client-test-runtime'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import { SettingsDescribeMirror } from '@deepseek-ai/dsh-client-ui-settings/src/client/settings-mirror.ts'
import { SettingsDocumentStore } from '../src/client/settings-document-store.ts'

/** Store over a real mirror derived from the same scripted context. */
function derivedDocumentStore(remote: object) {
  const ctx = { remote } as never
  return new SettingsDocumentStore(ctx, new SettingsDescribeMirror(ctx))
}

function response(hasDocument = false) {
  return { ok: true, value: { writable: true, hasDocument, namespaces: [] } }
}

function opened(): RemoteResult<{ opened: true }> {
  return { ok: true, value: { opened: true } }
}

function describeFailed(message: string) {
  return { ok: false as const, error: new RemoteError('gateway/internal', message, {}) }
}

afterEach(() => {
  delete (globalThis as typeof globalThis & { deepSeekHarnessDesktop?: unknown }).deepSeekHarnessDesktop
})

describe('SettingsDocumentStore', () => {
  it('loads provider metadata and asks the settings domain to open its document', async () => {
    const describe = vi.fn(() => Promise.resolve(response(true)))
    const openDocument = vi.fn(() => Promise.resolve(opened()))
    const controller = derivedDocumentStore({ settings: { describe, openSettingsDocument: openDocument } })
    await controller.load()
    expect(controller.store.getSnapshot()).toEqual({
      status: 'ready', opening: false, error: null,
    })
    await controller.open()
    expect(openDocument).toHaveBeenCalledWith()
  })

  it('marks absent or failed metadata unavailable without opening anything', async () => {
    const openDocument = vi.fn(() => Promise.resolve(opened()))
    const absent = derivedDocumentStore({
      settings: { describe: () => Promise.resolve(response()), openSettingsDocument: openDocument },
    })
    await absent.load()
    await absent.open()
    expect(absent.store.getSnapshot().status).toBe('unavailable')
    expect(openDocument).not.toHaveBeenCalled()

    const failed = derivedDocumentStore({
      settings: { describe: () => Promise.reject(new Error('offline')), openSettingsDocument: openDocument },
    })
    await failed.load()
    expect(failed.store.getSnapshot()).toMatchObject({ status: 'unavailable', error: 'offline' })

    const rejected = derivedDocumentStore({
      settings: { describe: () => Promise.resolve(describeFailed('provider failed')), openSettingsDocument: openDocument },
    })
    await rejected.load()
    expect(rejected.store.getSnapshot()).toMatchObject({
      status: 'unavailable', error: 'provider failed',
    })
  })

  it('collapses concurrent open gestures and recovers after a failure', async () => {
    let resolveOpen!: (response: RemoteResult<{ opened: true }>) => void
    const openDocument = vi.fn(() => new Promise<RemoteResult<{ opened: true }>>((resolve) => { resolveOpen = resolve }))
    const controller = derivedDocumentStore({
      settings: { describe: () => Promise.resolve(response(true)), openSettingsDocument: openDocument },
    })
    await controller.load()
    const first = controller.open()
    const second = controller.open()
    expect(openDocument).toHaveBeenCalledOnce()
    resolveOpen({ ok: false, error: new RemoteError('gateway/internal', 'no default editor', {}) })
    await Promise.all([first, second])
    expect(controller.store.getSnapshot()).toMatchObject({
      status: 'ready', opening: false, error: 'no default editor',
    })
  })

  it('reports a rejected native-open request instead of leaving a silent click', async () => {
    const controller = derivedDocumentStore({
      settings: {
        describe: () => Promise.resolve(response(true)),
        openSettingsDocument: () => Promise.reject(new Error('connection closed')),
      },
    })
    await controller.load()
    await controller.open()
    expect(controller.store.getSnapshot()).toMatchObject({
      status: 'ready', opening: false, error: 'connection closed',
    })
  })

  it('uses the Electron fixed operation instead of asking the Harness process to open the file', async () => {
    const desktopOpen = vi.fn(async () => ({ error: '' }))
    ;(globalThis as typeof globalThis & { deepSeekHarnessDesktop?: unknown }).deepSeekHarnessDesktop = {
      shell: { openSettingsDocument: desktopOpen },
    }
    const hostOpen = vi.fn(() => Promise.resolve(opened()))
    const controller = derivedDocumentStore({
      settings: { describe: () => Promise.resolve(response(true)), openSettingsDocument: hostOpen },
    })
    await controller.load()
    await controller.open()
    expect(desktopOpen).toHaveBeenCalledOnce()
    expect(hostOpen).not.toHaveBeenCalled()
  })

  it('recovers the button with visible error state when an open request does not settle', async () => {
    vi.useFakeTimers()
    try {
      const controller = derivedDocumentStore({
        settings: {
          describe: () => Promise.resolve(response(true)),
          openSettingsDocument: () => new Promise(() => {}),
        },
      })
      await controller.load()
      const opening = controller.open()
      expect(controller.store.getSnapshot().opening).toBe(true)
      await vi.advanceTimersByTimeAsync(10_000)
      await opening
      expect(controller.store.getSnapshot()).toMatchObject({
        status: 'ready', opening: false, error: 'settings document open timed out',
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('recovers availability via a mirror refresh after a failed first read', async () => {
    // A first read that failed leaves the action unavailable with the miss
    // recorded; the mirror's next refresh (a commit or reconnect) recovers it.
    const ctx = {
      remote: {
        settings: {
          describe: vi.fn()
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce(response(true)),
          openSettingsDocument: vi.fn(),
        },
      },
    } as never
    const mirror = new SettingsDescribeMirror(ctx)
    const caught = new SettingsDocumentStore(ctx, mirror)
    await caught.load()
    expect(caught.store.getSnapshot()).toMatchObject({ status: 'unavailable', error: 'offline' })
    await mirror.load()
    expect(caught.store.getSnapshot()).toMatchObject({ status: 'ready', error: null })
  })
})
