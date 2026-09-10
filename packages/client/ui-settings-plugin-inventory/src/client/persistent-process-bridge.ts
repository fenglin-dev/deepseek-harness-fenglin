/** Optional Desktop hook that stops and revokes a plugin's persistent services before uninstall. */

interface DesktopPersistentProcessBridge {
  readonly preparePluginUninstall: (pluginName: string) => Promise<{ readonly prepared: true }>
}

function readBridge(): DesktopPersistentProcessBridge | undefined {
  const desktop = (globalThis as typeof globalThis & { deepSeekHarnessDesktop?: unknown }).deepSeekHarnessDesktop
  if (desktop === null || typeof desktop !== 'object') return undefined
  const processes = (desktop as { processes?: unknown }).processes
  if (processes === null || typeof processes !== 'object') return undefined
  const candidate = processes as Partial<DesktopPersistentProcessBridge>
  return typeof candidate.preparePluginUninstall === 'function'
    ? candidate as DesktopPersistentProcessBridge
    : undefined
}

/**
 * Stop and revoke persistent services owned by one plugin before package removal.
 * Non-Desktop clients have no persistent-process authority and require no hook.
 * @param pluginName - Validated direct dependency selected for uninstall.
 */
export async function preparePersistentPluginUninstall(pluginName: string): Promise<void> {
  await readBridge()?.preparePluginUninstall(pluginName)
}
