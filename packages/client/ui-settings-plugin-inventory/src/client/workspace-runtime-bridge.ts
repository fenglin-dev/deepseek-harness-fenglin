/** Renderer adapter for the closed Desktop workspace-runtime bridge. */

export type WorkspaceRuntimeCapability = 'office' | 'ptc'
export type WorkspaceRuntimePhase =
  | 'not-installed' | 'downloading' | 'paused' | 'verifying' | 'waiting-restart'
  | 'enabled' | 'needs-update' | 'cleaning' | 'failed' | 'unsupported' | 'nas-unavailable'

export interface WorkspaceRuntimeCapabilityStatus {
  readonly capabilityId: WorkspaceRuntimeCapability
  readonly phase: WorkspaceRuntimePhase
  readonly message?: string
  readonly jobId?: string
  readonly transferredBytes?: number
  readonly totalBytes?: number
  readonly percent?: number
}

export interface WorkspaceRuntimeSnapshot {
  readonly currentHome: string
  readonly target?: string
  readonly sharedPayload?: { readonly payloadDigest: string; readonly path: string; readonly desktopVersion: string }
  readonly capabilities: Readonly<Record<WorkspaceRuntimeCapability, WorkspaceRuntimeCapabilityStatus>>
}

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

export interface WorkspaceRuntimeOutputRead {
  readonly text: string
  readonly nextOffset: number
  readonly lossy: boolean
  readonly settled: boolean
}

/** Host operations consumed by the workspace-runtime settings cards. */
export interface WorkspaceRuntimeInjected {
  getWorkspaceRuntimes: () => Promise<WorkspaceRuntimeSnapshot>
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
    || typeof value.readOutput !== 'function' || typeof value.pause !== 'function' || typeof value.cancel !== 'function'
    || typeof value.activate !== 'function' || typeof value.remove !== 'function') return undefined
  return value as DesktopWorkspaceRuntimesBridge
}

function required(): DesktopWorkspaceRuntimesBridge {
  const value = bridge()
  if (value === undefined) throw new Error('desktop workspace-runtime bridge is unavailable')
  return value
}

/** Build the Settings injection without exposing the global bridge to components. */
export function workspaceRuntimeInjected(): WorkspaceRuntimeInjected {
  return {
    getWorkspaceRuntimes: () => required().get(),
    startWorkspaceRuntime: capability => required().start(capability),
    getWorkspaceRuntimeJob: jobId => required().getJob(jobId),
    readWorkspaceRuntimeOutput: (jobId, offset) => required().readOutput(jobId, offset),
    pauseWorkspaceRuntime: jobId => required().pause(jobId),
    cancelWorkspaceRuntime: jobId => required().cancel(jobId),
    activateWorkspaceRuntime: capability => required().activate(capability),
    removeWorkspaceRuntime: capability => required().remove(capability),
  }
}
