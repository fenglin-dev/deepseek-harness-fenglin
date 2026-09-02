import { afterEach, describe, expect, it, vi } from 'vitest'
import { desktopSettingsRecoveryAvailable } from '../src/client/settings-recovery-bridge.ts'

afterEach(() => {
  delete (globalThis as typeof globalThis & { deepSeekHarnessDesktop?: unknown }).deepSeekHarnessDesktop
})

describe('desktop settings recovery bridge', () => {
  it('is absent when Electron does not expose both fixed operations', () => {
    expect(desktopSettingsRecoveryAvailable()).toBeUndefined()
    ;(globalThis as typeof globalThis & { deepSeekHarnessDesktop?: unknown }).deepSeekHarnessDesktop = {
      shell: { openSettingsDocument: vi.fn() },
    }
    expect(desktopSettingsRecoveryAvailable()).toBeUndefined()
  })

  it('forwards no renderer-controlled path or document content', async () => {
    const openSettingsDocument = vi.fn(async () => ({ error: '' }))
    const backupAndResetSettings = vi.fn(async () => ({ backupName: 'settings.backup.yaml', restarting: true as const }))
    ;(globalThis as typeof globalThis & { deepSeekHarnessDesktop?: unknown }).deepSeekHarnessDesktop = {
      shell: { openSettingsDocument, backupAndResetSettings },
    }
    const bridge = desktopSettingsRecoveryAvailable()
    await bridge?.openSettingsDocument()
    await bridge?.backupAndResetSettings()
    expect(openSettingsDocument).toHaveBeenCalledWith()
    expect(backupAndResetSettings).toHaveBeenCalledWith()
  })
})
