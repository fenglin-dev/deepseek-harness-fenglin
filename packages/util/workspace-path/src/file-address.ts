/**
 * The `dsh-resource://file/…` address grammar: how a file is named across the
 * Sidebar and the resource model, built and parsed without touching a
 * filesystem.
 * @module
 */

/**
 * A file resource address, in one of two scopes.
 *
 * Every resource address is `dsh-resource://<type>/…`, the URI host naming the
 * resource protocol; for `file` the path opens with the scope:
 *
 * - `dsh-resource://file/session/<sessionId>/<path>` names a file by its path
 *   relative to that Session's workspace root (`src/a.ts`, no leading `/`); the
 *   Host resolves it against the root it holds for the Session.
 * - `dsh-resource://file/absolute/<path>` names a file by its absolute path with
 *   the leading `/` dropped (`dsh-resource://file/absolute/home/ys/notes.txt`;
 *   Windows `dsh-resource://file/absolute/C:/x/y.txt`; a UNC path keeps an empty
 *   first segment, `dsh-resource://file/absolute//server/share/x.txt`). It carries
 *   no Session: the reader's own Session resolves it, and the Host's workspace
 *   confinement still applies.
 *
 * Every id and path segment is component-encoded, so a name carrying `#`, `?`,
 * or a space survives the round trip; `:` stays literal so a drive letter reads
 * as written.
 */
export type FileAddress =
  | {
    readonly scope: 'session'
    /** The Session whose workspace root the path is relative to. */
    readonly sessionId: string
    /** Workspace-relative `/`-separated path, no leading `/`; empty for the root itself. */
    readonly path: string
  }
  | {
    readonly scope: 'absolute'
    /** Absolute `/`-separated path: `/a/b` on POSIX, `C:/a/b` for a Windows drive, `//server/share/a` for a UNC path. */
    readonly path: string
  }

/** The scheme and type every file address opens with. */
const FILE_ADDRESS_PREFIX = 'dsh-resource://file/'

/** Component-encode one id or path segment, keeping `:` literal for drive letters. */
function encodeSegment(segment: string): string {
  return encodeURIComponent(segment).replace(/%3A/gi, ':')
}

/** Encode a `/`-separated path segment by segment. */
function encodePath(path: string): string {
  return path.split('/').map(encodeSegment).join('/')
}

/** Whether a decoded first path segment is a Windows drive (`C:`). */
function isDriveSegment(segment: string | undefined): boolean {
  return segment !== undefined && /^[A-Za-z]:$/.test(segment)
}

/**
 * Build the address of a file inside one Session's workspace.
 * @param sessionId - the Session whose workspace root the path is relative to.
 * @param path - workspace-relative path; backslashes are normalized to `/`, and a leading `./` or `/` is dropped.
 * @returns the `dsh-resource://file/session/<sessionId>/<path>` address.
 */
export function sessionFileAddress(sessionId: string, path: string): string {
  const relative = path.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '').replace(/^\/+/, '')
  return `${FILE_ADDRESS_PREFIX}session/${encodeSegment(sessionId)}/${encodePath(relative)}`
}

/**
 * Build the address of a file by its absolute path.
 * @param path - absolute path; backslashes are normalized to `/` and the leading `/` is dropped,
 *   except that a UNC path (`\\server\share`) keeps one empty first segment.
 * @returns the `dsh-resource://file/absolute/<path>` address.
 */
export function absoluteFileAddress(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const unc = normalized.startsWith('//')
  const absolute = normalized.replace(/^\/+/, '')
  return `${FILE_ADDRESS_PREFIX}absolute/${unc ? '/' : ''}${encodePath(absolute)}`
}

/**
 * Read a file address back into its parts.
 * @param address - a candidate address.
 * @returns the parts, or `undefined` when the string is not a `dsh-resource://file/` URI in a known scope with a path, or a segment is not validly encoded.
 */
export function parseFileAddress(address: string): FileAddress | undefined {
  try {
    const url = new URL(address)
    if (url.protocol !== 'dsh-resource:' || url.host !== 'file') return undefined
    const [, scope, ...rest] = url.pathname.split('/')
    if (scope === 'session') {
      const [id, ...segments] = rest
      if (id === undefined || id === '' || segments.length === 0) return undefined
      return { scope, sessionId: decodeURIComponent(id), path: segments.map(decodeURIComponent).join('/') }
    }
    if (scope === 'absolute') {
      // An empty first segment with more behind it is a UNC path's `//`; alone it is no path.
      const unc = rest[0] === '' && rest.length > 1
      const segments = (unc ? rest.slice(1) : rest).map(decodeURIComponent)
      if (segments.length === 0 || segments[0] === '') return undefined
      if (unc) return { scope, path: `//${segments.join('/')}` }
      return { scope, path: isDriveSegment(segments[0]) ? segments.join('/') : `/${segments.join('/')}` }
    }
    return undefined
  } catch {
    // `new URL` throws TypeError on a non-URL and `decodeURIComponent` throws
    // URIError on a malformed escape; both mean "not a file address".
    return undefined
  }
}
