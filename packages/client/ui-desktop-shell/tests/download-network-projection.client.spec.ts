import { describe, expect, it, vi } from 'vitest'
import type { DesktopDownloadNetworkBridge, DownloadNetworkSettings } from '../src/client/bridge.ts'
import { DownloadNetworkProjection } from '../src/client/download-network-projection.ts'

const INITIAL: DownloadNetworkSettings = {
  schema: 'open-dsh-desktop/download-network/v1',
  revision: 0,
  application: { source: 'github', proxy: { mode: 'system', passwordSet: false } },
  npm: { registry: 'npmmirror', proxy: { mode: 'existing', passwordSet: false } },
  github: { download: 'original', proxy: { mode: 'existing', passwordSet: false } },
}

function bench() {
  let settings = INITIAL
  let publishSettings: ((settings: DownloadNetworkSettings) => void) | undefined
  const update = vi.fn<DesktopDownloadNetworkBridge['update']>((patch) => {
    settings = patch.target === 'application' && patch.application !== undefined
      ? { ...settings, revision: settings.revision + 1,
        application: { ...patch.application, proxy: { ...patch.application.proxy, passwordSet: false } } }
      : settings
    return Promise.resolve(settings)
  })
  const bridge: DesktopDownloadNetworkBridge = {
    get: vi.fn(() => Promise.resolve(settings)),
    update,
    reset: vi.fn(() => Promise.resolve(INITIAL)),
    getTestStatus: vi.fn<DesktopDownloadNetworkBridge['getTestStatus']>(() => Promise.resolve({ phase: 'idle' })),
    test: vi.fn<DesktopDownloadNetworkBridge['test']>(target => Promise.resolve({
      phase: 'succeeded', target, stage: 'metadata', elapsedMs: 4,
    })),
    onSettings: vi.fn<DesktopDownloadNetworkBridge['onSettings']>((listener) => {
      publishSettings = listener
      return () => { publishSettings = undefined }
    }),
    onTestStatus: vi.fn(() => () => {}),
  }
  const projection = new DownloadNetworkProjection(bridge)
  return { projection, update, publish: (next: DownloadNetworkSettings) => { publishSettings?.(next) } }
}

describe('DownloadNetworkProjection', () => {
  it('owns loading, draft editing, persistence, tests, and main-process publications', async () => {
    const b = bench()
    b.projection.start()
    await vi.waitFor(() => { expect(b.projection.getSnapshot().draft).not.toBeNull() })

    b.projection.setApplicationSource('cnb')
    b.projection.setPassword('application', 'secret')
    await b.projection.save('application')
    const patch = b.update.mock.calls[0]?.[0]
    expect(patch?.target).toBe('application')
    expect(patch?.application?.source).toBe('cnb')
    expect(patch?.application?.password).toBe('secret')
    expect(b.projection.getSnapshot().passwords.application).toBe('')

    await b.projection.test('application')
    expect(b.projection.getSnapshot().test.phase).toBe('succeeded')

    b.publish({ ...INITIAL, revision: 8, application: { ...INITIAL.application, source: 'cnb' } })
    expect(b.projection.getSnapshot().saved?.revision).toBe(8)
    expect(b.projection.getSnapshot().draft?.application.source).toBe('cnb')
    b.projection.dispose()
  })
})
