/** Renderer adapter for the closed Desktop workspace-runtime bridge. */

/** Optional runtime capability managed by the Desktop application. */
export type WorkspaceRuntimeCapability = 'office' | 'ptc'

/** User-visible lifecycle phase for one optional runtime capability. */
export type WorkspaceRuntimePhase =
  | 'not-installed' | 'downloading' | 'paused' | 'verifying' | 'waiting-restart'
  | 'enabled' | 'needs-update' | 'cleaning' | 'failed' | 'unsupported' | 'nas-unavailable'

/** Current activation and transfer status for one runtime capability. */
export interface WorkspaceRuntimeCapabilityStatus {
  readonly capabilityId: WorkspaceRuntimeCapability
  readonly phase: WorkspaceRuntimePhase
  readonly message?: string
  readonly jobId?: string
  readonly transferredBytes?: number
  readonly totalBytes?: number
  readonly percent?: number
}

/** Desktop-owned runtime selection and capability state rendered by Settings. */
export interface WorkspaceRuntimeSnapshot {
  readonly currentHome: string
  readonly target?: string
  readonly sharedPayload?: { readonly payloadDigest: string; readonly path: string; readonly desktopVersion: string }
  readonly python?: {
    readonly source: 'managed' | 'custom'
    readonly probe?: {
      readonly executable: string
      readonly implementation: 'CPython'
      readonly version: string
      readonly architecture: string
      readonly pipVersion: string
      readonly sitePackages: string
      readonly writable: boolean
      readonly packages: Readonly<Record<string, string>>
    }
    readonly plan?: {
      readonly requiresConfirmation: boolean
      readonly changes: readonly {
        readonly name: string
        readonly installed?: string
        readonly target: string
        readonly action: 'add' | 'upgrade' | 'downgrade' | 'replace'
      }[]
    }
  }
  readonly capabilities: Readonly<Record<WorkspaceRuntimeCapability, WorkspaceRuntimeCapabilityStatus>>
}

/** Progress snapshot for one managed runtime download or activation job. */
export interface WorkspaceRuntimeJobSnapshot {
  readonly jobId: string
  readonly capabilityId: WorkspaceRuntimeCapability
  readonly phase: 'running' | 'paused' | 'succeeded' | 'cancelled' | 'failed'
  readonly stage: 'resolving' | 'downloading' | 'verifying' | 'extracting' | 'ready'
  readonly transferredBytes: number
  readonly totalBytes?: number
  readonly percent?: number
  readonly message?: string
}

/** Incremental, bounded terminal output returned for a managed runtime job. */
export interface WorkspaceRuntimeOutputRead {
  readonly text: string
  readonly nextOffset: number
  readonly lossy: boolean
  readonly settled: boolean
}

/** Host operations consumed by the workspace-runtime settings cards. */
export interface WorkspaceRuntimeInjected {
  getWorkspaceRuntimes: () => Promise<WorkspaceRuntimeSnapshot>
  chooseWorkspacePython: () => Promise<WorkspaceRuntimeSnapshot | undefined>
  useManagedWorkspacePython: () => Promise<WorkspaceRuntimeSnapshot>
  installWorkspaceOffice: (allowPackageChanges: boolean) => Promise<WorkspaceRuntimeSnapshot>
  startWorkspaceRuntime: (capabilityId: WorkspaceRuntimeCapability) => Promise<WorkspaceRuntimeJobSnapshot>
  getWorkspaceRuntimeJob: (jobId: string) => Promise<WorkspaceRuntimeJobSnapshot>
  readWorkspaceRuntimeOutput: (jobId: string, offset: number) => Promise<WorkspaceRuntimeOutputRead>
  pauseWorkspaceRuntime: (jobId: string) => Promise<WorkspaceRuntimeJobSnapshot>
  cancelWorkspaceRuntime: (jobId: string) => Promise<WorkspaceRuntimeJobSnapshot>
  activateWorkspaceRuntime: (capabilityId: WorkspaceRuntimeCapability) => Promise<WorkspaceRuntimeSnapshot>
  removeWorkspaceRuntime: (capabilityId: WorkspaceRuntimeCapability) => Promise<WorkspaceRuntimeSnapshot>
}

interface DesktopWorkspaceRuntimesBridge {
  get(): Promise<WorkspaceRuntimeSnapshot>
  choosePython(): Promise<WorkspaceRuntimeSnapshot | undefined>
  useManagedPython(): Promise<WorkspaceRuntimeSnapshot>
  installOffice(allowPackageChanges: boolean): Promise<WorkspaceRuntimeSnapshot>
  start(capabilityId: WorkspaceRuntimeCapability): Promise<WorkspaceRuntimeJobSnapshot>
  getJob(jobId: string): Promise<WorkspaceRuntimeJobSnapshot>
  readOutput(jobId: string, offset: number): Promise<WorkspaceRuntimeOutputRead>
  pause(jobId: string): Promise<WorkspaceRuntimeJobSnapshot>
  cancel(jobId: string): Promise<WorkspaceRuntimeJobSnapshot>
  activate(capabilityId: WorkspaceRuntimeCapability): Promise<WorkspaceRuntimeSnapshot>
  remove(capabilityId: WorkspaceRuntimeCapability): Promise<WorkspaceRuntimeSnapshot>
}

function bridge(): DesktopWorkspaceRuntimesBridge | undefined {
  const desktop = (globalThis as typeof globalThis & { deepSeekHarnessDesktop?: unknown }).deepSeekHarnessDesktop
  if (desktop === null || typeof desktop !== 'object') return undefined
  const candidate = (desktop as { workspaceRuntimes?: unknown }).workspaceRuntimes
  if (candidate === null || typeof candidate !== 'object') return undefined
  const value = candidate as Partial<DesktopWorkspaceRuntimesBridge>
  if (typeof value.get !== 'function' || typeof value.start !== 'function' || typeof value.getJob !== 'function'
    || typeof value.choosePython !== 'function' || typeof value.useManagedPython !== 'function' || typeof value.installOffice !== 'function'
    || typeof value.readOutput !== 'function' || typeof value.pause !== 'function' || typeof value.cancel !== 'function'
    || typeof value.activate !== 'function' || typeof value.remove !== 'function') return undefined
  return value as DesktopWorkspaceRuntimesBridge
}

function required(): DesktopWorkspaceRuntimesBridge {
  const value = bridge()
  if (value === undefined) throw new Error('desktop workspace-runtime bridge is unavailable')
  return value
}

/**
 * Build the Settings injection without exposing the global bridge to components.
 * @returns Callbacks backed by the verified Desktop preload bridge.
 */
export function workspaceRuntimeInjected(): WorkspaceRuntimeInjected {
  return {
    getWorkspaceRuntimes: () => required().get(),
    chooseWorkspacePython: () => required().choosePython(),
    useManagedWorkspacePython: () => required().useManagedPython(),
    installWorkspaceOffice: allowPackageChanges => required().installOffice(allowPackageChanges),
    startWorkspaceRuntime: capability => required().start(capability),
    getWorkspaceRuntimeJob: jobId => required().getJob(jobId),
    readWorkspaceRuntimeOutput: (jobId, offset) => required().readOutput(jobId, offset),
    pauseWorkspaceRuntime: jobId => required().pause(jobId),
    cancelWorkspaceRuntime: jobId => required().cancel(jobId),
    activateWorkspaceRuntime: capability => required().activate(capability),
    removeWorkspaceRuntime: capability => required().remove(capability),
  }
}
