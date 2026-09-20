/** Signed release metadata for optional workspace runtimes. */

export const WORKSPACE_RUNTIME_CAPABILITIES = ['office', 'ptc'] as const
export type WorkspaceRuntimeCapability = typeof WORKSPACE_RUNTIME_CAPABILITIES[number]
export const WORKSPACE_RUNTIME_TARGETS = ['win32-x64', 'darwin-arm64', 'darwin-x64', 'linux-x64'] as const
export type WorkspaceRuntimeTarget = typeof WORKSPACE_RUNTIME_TARGETS[number]

export interface WorkspaceRuntimeOfficeArtifact {
  readonly fileName: string
  readonly size: number
  readonly sha256: string
  readonly payloadDigest: string
  readonly enginePackage: string
  readonly engineVersion: string
  readonly githubUrl: string
  readonly cnbUrl: string
}

export interface WorkspaceRuntimeArtifact {
  readonly target: WorkspaceRuntimeTarget
  readonly fileName: string
  readonly size: number
  readonly sha256: string
  readonly payloadDigest: string
  readonly pythonVersion: string
  readonly githubUrl: string
  readonly cnbUrl: string
  readonly office: WorkspaceRuntimeOfficeArtifact
}

export interface WorkspaceRuntimeManifest {
  readonly schema: 'dsh/desktop-workspace-runtimes/v1'
  readonly desktopVersion: string
  readonly issuedAt: string
  readonly expiresAt: string
  readonly artifacts: Readonly<Record<WorkspaceRuntimeTarget, WorkspaceRuntimeArtifact>>
}

const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u
const DIGEST = /^[a-f0-9]{64}$/u
const FILE_NAME = /^DeepSeek-Harness-workspace-runtime-(?:win32-x64|darwin-arm64|darwin-x64|linux-x64)\.tar\.gz$/u
const OFFICE_FILE_NAME = /^DeepSeek-Harness-office-runtime-(?:win32-x64|darwin-arm64|darwin-x64|linux-x64)\.tar\.gz$/u

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`desktop: ${label} must be an object`)
  return value as Record<string, unknown>
}

function string(source: Record<string, unknown>, key: string, pattern?: RegExp): string {
  const value = source[key]
  if (typeof value !== 'string' || value === '' || (pattern !== undefined && !pattern.test(value))) {
    throw new TypeError(`desktop: workspace-runtime manifest has invalid ${key}`)
  }
  return value
}

function httpsUrl(source: Record<string, unknown>, key: string): string {
  const value = string(source, key)
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:' || parsed.username !== '' || parsed.password !== '' || parsed.hash !== '') {
    throw new TypeError(`desktop: workspace-runtime manifest has invalid ${key}`)
  }
  return parsed.href
}

function artifact(value: unknown, target: WorkspaceRuntimeTarget): WorkspaceRuntimeArtifact {
  const source = record(value, `workspace-runtime ${target} artifact`)
  const expectedFileName = `DeepSeek-Harness-workspace-runtime-${target}.tar.gz`
  if (source.target !== target || !Number.isSafeInteger(source.size) || (source.size as number) <= 0
    || (source.size as number) > 2 * 1024 * 1024 * 1024 || source.fileName !== expectedFileName) {
    throw new TypeError(`desktop: workspace-runtime manifest has invalid ${target} artifact`)
  }
  return {
    target,
    fileName: string(source, 'fileName', FILE_NAME),
    size: source.size as number,
    sha256: string(source, 'sha256', DIGEST),
    payloadDigest: string(source, 'payloadDigest', DIGEST),
    pythonVersion: string(source, 'pythonVersion', /^3\.12\.\d+$/u),
    githubUrl: httpsUrl(source, 'githubUrl'),
    cnbUrl: httpsUrl(source, 'cnbUrl'),
    office: officeArtifact(source.office, target),
  }
}

function officeArtifact(value: unknown, target: WorkspaceRuntimeTarget): WorkspaceRuntimeOfficeArtifact {
  const source = record(value, `workspace-runtime ${target} Office artifact`)
  const expectedFileName = `DeepSeek-Harness-office-runtime-${target}.tar.gz`
  const expectedPackage = target.startsWith('linux-')
    ? '@deepseek-ai/libreoffice-kit-wasm'
    : `@deepseek-ai/libreoffice-kit-${target}`
  if (source.fileName !== expectedFileName || source.enginePackage !== expectedPackage
    || !Number.isSafeInteger(source.size) || (source.size as number) <= 0 || (source.size as number) > 2 * 1024 * 1024 * 1024) {
    throw new TypeError(`desktop: workspace-runtime manifest has invalid ${target} Office artifact`)
  }
  return {
    fileName: string(source, 'fileName', OFFICE_FILE_NAME),
    size: source.size as number,
    sha256: string(source, 'sha256', DIGEST),
    payloadDigest: string(source, 'payloadDigest', DIGEST),
    enginePackage: string(source, 'enginePackage'),
    engineVersion: string(source, 'engineVersion', VERSION),
    githubUrl: httpsUrl(source, 'githubUrl'),
    cnbUrl: httpsUrl(source, 'cnbUrl'),
  }
}

/** Parse the signed document without accepting unknown targets or arbitrary capability identifiers. */
export function parseWorkspaceRuntimeManifest(value: unknown): WorkspaceRuntimeManifest {
  const source = record(value, 'workspace-runtime manifest')
  if (source.schema !== 'dsh/desktop-workspace-runtimes/v1') throw new TypeError('desktop: unsupported workspace-runtime manifest schema')
  const issuedAt = string(source, 'issuedAt')
  const expiresAt = string(source, 'expiresAt')
  if (!Number.isFinite(Date.parse(issuedAt)) || !Number.isFinite(Date.parse(expiresAt))) {
    throw new TypeError('desktop: workspace-runtime manifest timestamps are invalid')
  }
  const artifacts = record(source.artifacts, 'workspace-runtime artifacts')
  if (Object.keys(artifacts).length !== WORKSPACE_RUNTIME_TARGETS.length
    || Object.keys(artifacts).some(key => !WORKSPACE_RUNTIME_TARGETS.includes(key as WorkspaceRuntimeTarget))) {
    throw new TypeError('desktop: workspace-runtime manifest target set is invalid')
  }
  return {
    schema: source.schema,
    desktopVersion: string(source, 'desktopVersion', VERSION),
    issuedAt,
    expiresAt,
    artifacts: Object.fromEntries(
      WORKSPACE_RUNTIME_TARGETS.map(target => [target, artifact(artifacts[target], target)]),
    ) as unknown as Readonly<Record<WorkspaceRuntimeTarget, WorkspaceRuntimeArtifact>>,
  }
}

/** Select the current native target, rejecting unsupported architectures. */
export function workspaceRuntimeTarget(platform: NodeJS.Platform, arch: string): WorkspaceRuntimeTarget | undefined {
  const target = `${platform}-${arch}`
  return WORKSPACE_RUNTIME_TARGETS.includes(target as WorkspaceRuntimeTarget) ? target as WorkspaceRuntimeTarget : undefined
}
