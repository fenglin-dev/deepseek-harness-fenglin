import { afterEach, describe, expect, it, vi } from 'vitest'
import { desktopPluginSnapshotsAvailable } from '../src/client/plugin-snapshot-bridge.ts'

afterEach(() => {
  delete (globalThis as typeof globalThis & { deepSeekHarnessDesktop?: unknown }).deepSeekHarnessDesktop
})

describe('desktop plugin snapshot bridge', () => {
  it('stays unavailable outside Electron Desktop', () => {
    expect(desktopPluginSnapshotsAvailable()).toBeUndefined()
  })

  it('forwards only opaque ids, labels, and network confirmation', async () => {
    const list = vi.fn(async () => [])
    const create = vi.fn(async () => ({ snapshotId: 'snapshot' }))
    const remove = vi.fn(async () => [])
    const startRestore = vi.fn(async () => ({ operationId: 'operation', snapshotId: 'snapshot', phase: 'restoring-files' }))
    const onStatus = vi.fn(() => () => {})
    ;(globalThis as typeof globalThis & { deepSeekHarnessDesktop?: unknown }).deepSeekHarnessDesktop = {
      pluginSnapshots: { list, create, remove, startRestore, onStatus },
    }
    const bridge = desktopPluginSnapshotsAvailable()
    await bridge?.create('Known good')
    await bridge?.remove('snapshot')
    await bridge?.startRestore('snapshot', true)
    expect(create).toHaveBeenCalledWith('Known good')
    expect(remove).toHaveBeenCalledWith('snapshot')
    expect(startRestore).toHaveBeenCalledWith('snapshot', true)
  })
})
