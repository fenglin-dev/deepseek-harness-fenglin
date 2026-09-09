/**
 * The paged read this type performs, bound to the Client Remote.
 *
 * Content is the consumer's business: the `file` resource carries metadata only,
 * and the text arrives here one page of lines at a time. The endpoint takes a
 * session and a workspace path while a tab carries a `dsh-resource://file/`
 * address in one of two scopes, so this module also owns that translation.
 */
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceFileRange, WorkspaceFileText } from '@deepseek-ai/dsh-api-workspace-files/types'
import { parseFileAddress } from '@deepseek-ai/dsh-util-workspace-path'

/** The slice of the Client Remote this package calls. */
export interface WorkspaceFilesReadRemote {
  readonly workspaceFiles: {
    /**
     * Read one page of lines.
     * @param sessionId - the session whose workspace resolves `path`.
     * @param path - workspace path, absolute or relative to the workspace root.
     * @param range - 1-based start line; the Host's page cap applies when `limit` is absent.
     * @param signal - cancels the call.
     * @returns the page, or the failure the Host declares.
     */
    read(
      sessionId: SessionId,
      path: string,
      range: WorkspaceFileRange,
      signal?: AbortSignal,
    ): Promise<RemoteResult<WorkspaceFileText>>
  }
}

/**
 * The read one page performs, injected so the face stays host-free.
 *
 * The session travels with the call because the endpoint resolves the workspace
 * root from it: the same path means different files in different sessions. A
 * Remote call does not reject: the result carries the failure.
 */
export type ReadWorkspaceFilePage = (
  sessionId: SessionId,
  path: string,
  offset: number,
  signal: AbortSignal,
) => Promise<RemoteResult<WorkspaceFileText>>

/** The file one tab reads: the session the read runs under and the path handed to the Host. */
export interface SessionFile {
  /** The session whose workspace confines the read. */
  readonly sessionId: SessionId
  /** The path the Host receives: workspace-relative for a `session` address, absolute for an `absolute` one. */
  readonly path: string
}

/**
 * The session and path one `dsh-resource://file/…` address names.
 *
 * A `session` address names its own session and a workspace-relative path, so
 * a tab addressed into another session reads from that session. An `absolute`
 * address carries no session and is read through the seat's own, which the
 * Host confines to that session's workspace. The registry routes every
 * parseable `file` address to this type, so an address `parseFileAddress`
 * rejects is a programming error and throws.
 * @param address - a tab's `dsh-resource://file/…` address.
 * @param sessionId - the seat's session, which an `absolute` address is read through.
 * @returns the session and the path to hand the endpoint.
 */
export function hostFileOf(address: string, sessionId: SessionId): SessionFile {
  const parsed = parseFileAddress(address)
  if (parsed === undefined) throw new Error(`ui-sidebar-textpreview: not a file address "${address}"`)
  // The address is a string boundary: its id segment is the Session id it names.
  return parsed.scope === 'session'
    ? { sessionId: parsed.sessionId as SessionId, path: parsed.path }
    : { sessionId, path: parsed.path }
}

/**
 * Bind the paged read to one Remote face. The page length is the Host's
 * configured cap, so no `limit` travels.
 * @param remote - the Client Remote carrying the `workspaceFiles` namespace.
 * @returns the read the face performs.
 */
export function createReadPage(remote: WorkspaceFilesReadRemote): ReadWorkspaceFilePage {
  return (sessionId, path, offset, signal) => remote.workspaceFiles.read(sessionId, path, { offset }, signal)
}
