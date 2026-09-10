import { afterEach, describe, expect, it, vi } from 'vitest'
import { preparePersistentPluginUninstall } from '../src/client/persistent-process-bridge.ts'

const desktopGlobal = globalThis as typeof globalThis & { deepSeekHarnessDesktop?: unknown }

afterEach(() => {
  delete desktopGlobal.deepSeekHarnessDesktop
})

describe('Desktop persistent-process uninstall bridge', () => {
  it('does nothing outside Desktop', async () => {
    await expect(preparePersistentPluginUninstall('fixture-plugin')).resolves.toBeUndefined()
  })

  it('requires Desktop cleanup before package removal', async () => {
    const preparePluginUninstall = vi.fn(async () => ({ prepared: true as const }))
    desktopGlobal.deepSeekHarnessDesktop = { processes: { preparePluginUninstall } }

    await preparePersistentPluginUninstall('@scope/fixture-plugin')

    expect(preparePluginUninstall).toHaveBeenCalledWith('@scope/fixture-plugin')
  })

  it('propagates cleanup failures so uninstall cannot continue', async () => {
    desktopGlobal.deepSeekHarnessDesktop = {
      processes: { preparePluginUninstall: vi.fn(async () => { throw new Error('range still running') }) },
    }

    await expect(preparePersistentPluginUninstall('fixture-plugin')).rejects.toThrow('range still running')
  })
})
