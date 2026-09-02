/** Optional Electron bridge for durable Profile plugin rollback points. */

export interface PluginSnapshotSummary {
  readonly snapshotId: string
  readonly kind: 'automatic' | 'manual' | 'bootable' | 'safety'
  readonly trigger: string
  readonly label?: string
  readonly createdAt: string
  readonly offlineState: 'best-effort' | 'local-source-missing'
  readonly difference: {
    readonly added: readonly string[]
    readonly removed: readonly string[]
    readonly changed: readonly string[]
    readonly versionChanges: readonly {
      readonly name: string
      readonly currentVersion?: string
      readonly snapshotVersion?: string
      readonly direction: 'upgrade' | 'downgrade' | 'change'
    }[]
  }
}

/** Current phase of one desktop-owned plugin snapshot recovery transaction. */
export interface PluginSnapshotRestoreSnapshot {
  readonly operationId: string
  readonly snapshotId: string
  readonly phase: 'restoring-files' | 'installing-offline' | 'installing-online' | 'checking' | 'restarting'
    | 'verifying-startup' | 'needs-network' | 'succeeded' | 'rolled-back' | 'failed'
  readonly message?: string
}

/** Restricted snapshot operations injected into the diagnostics section. */
export interface PluginSnapshotsInjected {
  readonly list: () => Promise<readonly PluginSnapshotSummary[]>
  readonly create: (label?: string) => Promise<{ readonly snapshotId: string }>
  readonly remove: (snapshotId: string) => Promise<readonly PluginSnapshotSummary[]>
  readonly startRestore: (snapshotId: string, networkAllowed: boolean) => Promise<PluginSnapshotRestoreSnapshot>
  readonly subscribe: (callback: (snapshot: PluginSnapshotRestoreSnapshot) => void) => () => void
}

interface DesktopPluginSnapshotsBridge extends Omit<PluginSnapshotsInjected, 'subscribe'> {
  readonly onStatus: (callback: (snapshot: PluginSnapshotRestoreSnapshot) => void) => () => void
}

function readBridge(): DesktopPluginSnapshotsBridge | undefined {
  const desktop = (globalThis as typeof globalThis & { deepSeekHarnessDesktop?: unknown }).deepSeekHarnessDesktop
  if (desktop === null || typeof desktop !== 'object') return undefined
  const snapshots = (desktop as { pluginSnapshots?: unknown }).pluginSnapshots
  if (snapshots === null || typeof snapshots !== 'object') return undefined
  const candidate = snapshots as Partial<DesktopPluginSnapshotsBridge>
  if (typeof candidate.list !== 'function' || typeof candidate.create !== 'function'
    || typeof candidate.remove !== 'function' || typeof candidate.startRestore !== 'function'
    || typeof candidate.onStatus !== 'function') return undefined
  return candidate as DesktopPluginSnapshotsBridge
}

/**
 * Return the restricted desktop snapshot capability when Electron exposes it.
 * @returns Opaque snapshot operations, or undefined outside the desktop renderer.
 */
export function desktopPluginSnapshotsAvailable(): PluginSnapshotsInjected | undefined {
  const bridge = readBridge()
  return bridge === undefined ? undefined : {
    list: () => bridge.list(),
    create: label => bridge.create(label),
    remove: snapshotId => bridge.remove(snapshotId),
    startRestore: (snapshotId, networkAllowed) => bridge.startRestore(snapshotId, networkAllowed),
    subscribe: callback => bridge.onStatus(callback),
  }
}
