/** Narrow desktop-only settings recovery bridge. */

export interface SettingsRecoveryInjected {
  openSettingsDocument(): Promise<{ error: string }>
  backupAndResetSettings(): Promise<{ backupName?: string; restarting: true }>
}

/**
 * Resolve the fixed-operation settings recovery bridge exposed by Electron Desktop.
 * @returns Complete bridge when every required operation is available.
 */
export function desktopSettingsRecoveryAvailable(): SettingsRecoveryInjected | undefined {
  const desktop = (globalThis as typeof globalThis & { deepSeekHarnessDesktop?: unknown }).deepSeekHarnessDesktop
  const shell = (desktop as { shell?: unknown } | undefined)?.shell
  if (shell === null || typeof shell !== 'object') return undefined
  const candidate = shell as Partial<SettingsRecoveryInjected>
  return typeof candidate.openSettingsDocument === 'function'
    && typeof candidate.backupAndResetSettings === 'function'
    ? {
      openSettingsDocument: () => candidate.openSettingsDocument?.() as ReturnType<SettingsRecoveryInjected['openSettingsDocument']>,
      backupAndResetSettings: () => candidate.backupAndResetSettings?.() as ReturnType<SettingsRecoveryInjected['backupAndResetSettings']>,
    }
    : undefined
}
