/**
 * The `file` protocol's resource metadata, navigation params, Client errors,
 * and internal change-feed notices.
 */
// Bring the base `ResourceProtocolMap` declaration into this program so the
// augmentation below merges into it instead of declaring a second interface.
import type {} from '@deepseek-ai/dsh-client-resources/client'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface ResourceProtocolMap {
    /**
     * One workspace file's metadata, addressed as
     * `dsh-resource://file/session/<sessionId>/<workspace-relative path>` or
     * `dsh-resource://file/absolute/<absolute path>`.
     */
    file: WorkspaceFileResource
  }
}

/** What a `file` tab is asked to reveal on open or navigation; JSON-shaped. */
export interface WorkspaceFileParams {
  /** 1-based line to scroll into view; absent leaves the position alone. */
  readonly line?: number
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /**
     * The address is not a `dsh-resource://file/` address in a scope the
     * provider serves: `session/<sessionId>/<workspace-relative path>` or
     * `absolute/<absolute path>`. Raised by the Client provider; the Host never
     * emits it.
     */
    'workspace-file/unsupported-address': { readonly address: string }
    /**
     * An `absolute` address has no current Session to authorize its Host call.
     * Raised by the Client provider; the Host never emits it. Session addresses
     * are resolved by the Host without a Client Session summary.
     */
    'workspace-file/unknown-workspace': { readonly address: string }
  }
}

/**
 * One workspace file as the resource model carries it: metadata only.
 *
 * The stream reports that the file moved on; it never carries content. A
 * consumer reads the text itself, by page, and uses `version` and `changed` to
 * know when its pages are stale.
 */
export interface WorkspaceFileResource {
  /** Absolute path in the Host filesystem, as returned by the last successful stat. */
  readonly absolutePath: string
  /** The Host's latest report of the file's version: from `stat` first, then from each reported write. */
  readonly version: string
  /** Byte size as of the last `stat`, when the backend reports it. */
  readonly bytes?: number
  /** The Host reported a write after the last `stat`; a reload (`stat` again) clears it. */
  readonly changed: boolean
}

/** One Host-reported write inside the session's workspace. */
export type WorkspaceFileEdit =
  | { readonly kind: 'changed'; readonly version: string }
  | { readonly kind: 'absent' }

/** What one follower of a path receives: a Host write, or a local request to `stat` again. */
export type WorkspaceFileNotice = WorkspaceFileEdit | { readonly kind: 'restat' }
