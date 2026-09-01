// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '../src/client/index.ts'
import { DesktopPreferencesRow } from '../src/client/DesktopPreferencesRow.tsx'

afterEach(() => {
  delete (globalThis as unknown as Record<string, unknown>).deepSeekHarnessDesktop
})

function installBridge(): ReturnType<typeof vi.fn> {
  const reportReadiness = vi.fn()
  ;(globalThis as unknown as Record<string, unknown>).deepSeekHarnessDesktop = {
    shell: {
      getCapabilities: vi.fn(() => Promise.resolve({
        platform: 'darwin', packaged: true, launchAtLoginAvailable: true, sourceUpdateAvailable: false,
        commandLineAvailable: true,
      })),
      getDataHome: vi.fn(() => Promise.resolve({
        activePath: '/desktop/dsh-home', activeKind: 'desktop', desktopPath: '/desktop/dsh-home',
        officialPath: '/home/user/.dsh', officialAvailable: true, managedExternally: false,
      })),
      chooseDataHome: vi.fn(), switchDataHome: vi.fn(),
      getPreferences: vi.fn(() => Promise.resolve({
        closeBehavior: 'tray', notificationsEnabled: true, launchAtLoginEnabled: false,
      })),
      updatePreferences: vi.fn(), onPreferences: vi.fn(() => () => {}), openLog: vi.fn(),
      getCommandLine: vi.fn(() => Promise.resolve({
        phase: 'uninstalled', commandPath: '/desktop/cli/bin/dsh', dataHome: '/desktop/dsh-home',
      })),
      installCommandLine: vi.fn(), removeCommandLine: vi.fn(),
      reportReadiness,
    },
    releases: {
      getStatus: vi.fn(() => Promise.resolve({ phase: 'current', currentVersion: '0.1.0' })),
      check: vi.fn(), onStatus: vi.fn(() => () => {}), openDownload: vi.fn(),
      getDownloadStatus: vi.fn(() => Promise.resolve({ phase: 'idle' })),
      startDownload: vi.fn(), cancelDownload: vi.fn(), openInstaller: vi.fn(),
      onDownloadStatus: vi.fn(() => () => {}),
    },
  }
  return reportReadiness
}

async function bench() {
  const ctx = new Context()
  let generation: { id: number; host: { home: string } } | undefined
  const generationListeners = new Set<() => void>()
  ctx.provide('connection', {
    isLoopback: true,
    generation: {
      getSnapshot: () => generation,
      subscribe: (listener: () => void) => {
        generationListeners.add(listener)
        return () => { generationListeners.delete(listener) }
      },
    },
  } as never)
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)
  const slots = ctx.get('slots') as SlotRegistry
  slots.register({
    name: 'root',
    children: {
      'settings.general.item': { kind: 'list', scope: 'root' },
    },
  } as never, () => null)
  return {
    ctx,
    slots,
    connect: () => {
      generation = { id: 1, host: { home: '/desktop/dsh-home' } }
      for (const listener of generationListeners) listener()
    },
  }
}

describe('ui-desktop-shell apply', () => {
  it('registers nothing in an ordinary browser', async () => {
    const b = await bench()
    const fiber = b.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(b.slots.entries('settings.general.item')).toEqual([])
    await fiber.dispose()
  })

  it('registers desktop preferences and Release checks when the bridge exists', async () => {
    const reportReadiness = installBridge()
    const b = await bench()
    const fiber = b.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(reportReadiness).toHaveBeenCalledWith('client')
    expect(reportReadiness).not.toHaveBeenCalledWith('event-dispatch')
    b.connect()
    expect(reportReadiness).toHaveBeenCalledWith('event-dispatch')
    expect(b.slots.entries('settings.general.item')[0]?.component).toBe(DesktopPreferencesRow)
    await fiber.dispose()
    expect(b.slots.entries('settings.general.item')).toEqual([])
  })
})
