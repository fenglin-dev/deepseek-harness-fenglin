/**
 * Browser-safe Workspace path and display helpers.
 * @module @deepseek-ai/dsh-util-workspace-path
 */
import { absoluteFileAddress, sessionFileAddress } from './file-address.ts'

/** Whether a path uses a Windows drive or UNC prefix. */
function isWindowsStylePath(value: string): boolean {
  return /^[A-Za-z]:[/\\]/.test(value) || value.startsWith('\\\\')
}

/**
 * Whether a path is absolute in either spelling the Host accepts: POSIX (`/a/b`) or Windows drive or UNC.
 * @param path - the path to classify.
 * @returns `true` for an absolute path; `false` for a Workspace-relative one.
 */
export function isAbsoluteWorkspacePath(path: string): boolean {
  return path.startsWith('/') || isWindowsStylePath(path)
}

/**
 * Resolve a Workspace-relative path into the Host-facing spelling used by path operations.
 * @param cwd - Session Workspace root, when known.
 * @param path - Absolute or Workspace-relative path.
 * @returns an absolute path when a Workspace root is available, otherwise the original path.
 */
export function resolveWorkspacePath(cwd: string | undefined, path: string): string {
  if (isAbsoluteWorkspacePath(path)) return path
  if (cwd === undefined || cwd === '') return path
  const separator = isWindowsStylePath(cwd) && cwd.includes('\\') ? '\\' : '/'
  const base = cwd.replace(/[/\\]+$/, '')
  const relative = path.replace(/^[/\\]+/, '')
  return `${base}${separator}${relative}`
}

/**
 * Abbreviate a POSIX home directory for display.
 * @param path - Absolute or already-short display path.
 * @param home - Host account home; absent skips abbreviation.
 * @returns `~` or `~/…` for the POSIX home and its descendants, otherwise `path`.
 */
export function abbreviateHomePath(path: string, home?: string): string {
  if (home === undefined || home === '') return path
  if (isWindowsStylePath(path) || isWindowsStylePath(home)) return path
  const root = home.replace(/\/+$/, '')
  if (root === '' || root === '/') return path
  if (path.replace(/\/+$/, '') === root) return '~'
  if (path.startsWith(`${root}/`)) return `~${path.slice(root.length)}`
  return path
}

/**
 * Read the final non-empty segment of a Workspace path for display.
 * Workspace-label surfaces use this helper instead of deriving another basename.
 * @param path - Workspace directory path using POSIX or Windows separators.
 * @returns the final segment, or an empty string for a separator-only path.
 */
export function workspaceTitleOf(path: string): string {
  const trimmed = path.replace(/[/\\]+$/, '')
  const separator = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return trimmed.slice(separator + 1)
}

export * from './file-address.ts'

/**
 * The address for a path as a caller holds it: a relative path, or an absolute
 * path inside the Session's workspace, becomes a `session`-scoped address; an
 * absolute path outside it, or one whose workspace root is unknown, becomes an
 * `absolute`-scoped address.
 * @param sessionId - the Session the path is read in.
 * @param cwd - that Session's workspace root, when known.
 * @param path - absolute or workspace-relative path, in either separator spelling.
 * @returns the `dsh-resource://file/…` address.
 */
export function fileAddressFor(sessionId: string, cwd: string | undefined, path: string): string {
  const normalized = path.replace(/\\/g, '/')
  if (!isAbsoluteWorkspacePath(normalized)) return sessionFileAddress(sessionId, normalized)
  const root = cwd === undefined ? '' : cwd.replace(/\\/g, '/').replace(/\/+$/, '')
  if (root !== '' && normalized === root) return sessionFileAddress(sessionId, '')
  if (root !== '' && normalized.startsWith(`${root}/`)) return sessionFileAddress(sessionId, normalized.slice(root.length + 1))
  return absoluteFileAddress(normalized)
}
