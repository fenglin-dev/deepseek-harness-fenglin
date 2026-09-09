/**
 * Workspace file service: paged text reads, byte-window reads, stats, directory
 * listings, and the agent-write change feed inside one session's workspace
 * root, exposed as the `workspaceFiles` Remote namespace.
 *
 * Reads through `ctx.fs` are deliberately unconfined — the sandboxing backend
 * fences writes and edits only, and says so. Every constraint this service
 * needs is therefore its own, and there are four:
 *
 * 1. The path is authorized by containment in the session's workspace root.
 * 2. Containment is decided by {@link FileSystem.contains}, never by comparing
 *    path strings: `resolve` realpaths, so a prefix test cannot see a symlink
 *    that leaves the root. `lstat` rejects a link before that follow happens.
 * 3. Every cap is validated Config, changeable per deployment. A page is cut by
 *    lines and refused, not shortened, when its bytes exceed the byte cap; a
 *    listing is cut by entries and says so.
 * 4. Failures are one `RemoteError` per reason, declared in `./types`.
 *
 * A page is cut from `streamText`, which decodes and rejects non-UTF-8 as it
 * goes, so the file is read only up to the first character past the page and
 * never held whole in memory; the NUL scan runs on the page itself.
 *
 * This is NOT modelled on `session.openWorkspacePath`. That endpoint hands a
 * path to the local opener and leaves the effect on the machine; this one sends
 * file content across the wire, which is a different level of exposure.
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-fs'
import type { FsDirEntry, FsInfo, FsPathInfo, FsTarget } from '@deepseek-ai/dsh-fs'
import type {} from '@deepseek-ai/dsh-sandbox-policy'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { WorkspaceChangeFeed } from './changes.ts'
import type {
  WorkspaceByteRange,
  WorkspaceDirectoryEntry,
  WorkspaceDirectoryListing,
  WorkspaceFileBytes,
  WorkspaceFileRange,
  WorkspaceFileStat,
  WorkspaceFileText,
  WorkspaceFileWatchFrame,
} from './types.ts'

export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Host owner of the `workspaceFiles` Remote namespace. */
    workspaceFiles: WorkspaceFiles
  }
}

/** Deployment caps on one page or one listing. */
export interface Config {
  /**
   * Inclusive byte cap on one page's text and on one byte window.
   *
   * A page above this fails; it is not shortened, because a silently cut page
   * reads as the whole page. A byte window asking for more is refused the same
   * way. The file itself has no size cap: a caller pages through it.
   */
  readonly maxBytes: number
  /** Default and largest page size in lines; a request asking for more is refused. */
  readonly maxLines: number
  /** Cap on returned directory entries; the rest is dropped and reported cut. */
  readonly maxEntries: number
}

/** One page cut from a decoded text stream. */
interface Page {
  readonly text: string
  /** Lines in `text`; `0` for a page past the last line. */
  readonly lines: number
  readonly eof: boolean
}

/** The byte text never carries: its presence marks a page as binary. */
const NUL = String.fromCharCode(0)

/** Refuse anything the wire schema admits as a number but a window cannot use: only safe integers index a file. */
function integerAtLeast(value: number, min: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new RemoteError('gateway/bad-request', `${name} must be a safe integer of at least ${min}`, {})
  }
  return value
}

/**
 * Cut lines `offset` through `offset + limit - 1` from decoded chunks, stopping
 * at the first character past the page so the rest of the file is never read.
 * Lines before the page are counted, not kept, and the page is refused the
 * moment its bytes exceed `maxBytes`, so one giant line cannot grow memory past
 * the cap either.
 */
async function cutPage(
  chunks: AsyncIterable<string>,
  offset: number,
  limit: number,
  maxBytes: number,
  path: string,
): Promise<Page> {
  const last = offset + limit - 1
  const lines: string[] = []
  let current = ''
  let bytes = 0
  let lineNumber = 1
  const admit = (size: number): void => {
    bytes += size
    if (bytes > maxBytes) {
      throw new RemoteError(
        'workspace-file/too-large',
        `lines ${offset}-${last} of "${path}" exceed the ${maxBytes} byte cap`,
        { path, limit: maxBytes },
      )
    }
  }
  const complete = (): void => {
    if (lines.length > 0) admit(1)
    lines.push(current)
    current = ''
  }
  for await (const chunk of chunks) {
    let position = 0
    while (position < chunk.length) {
      if (lineNumber > last) return { text: lines.join('\n'), lines: lines.length, eof: false }
      const newline = chunk.indexOf('\n', position)
      const segment = newline === -1 ? chunk.slice(position) : chunk.slice(position, newline)
      if (lineNumber >= offset) {
        admit(Buffer.byteLength(segment, 'utf8'))
        current += segment
      }
      if (newline === -1) break
      if (lineNumber >= offset) complete()
      lineNumber += 1
      position = newline + 1
    }
  }
  // Only an in-page line can be pending here: earlier lines were never kept,
  // and a character past the page returned above.
  if (current.length > 0) complete()
  return { text: lines.join('\n'), lines: lines.length, eof: true }
}

/**
 * Workspace path of `target` relative to `root`, derived from the two canonical
 * `file:` URIs so the answer is `/`-joined on every platform. Empty for the root.
 */
function workspacePathOf(rootUrl: string, targetUrl: string): string {
  const root = new URL(rootUrl).pathname.replace(/\/+$/, '')
  const target = new URL(targetUrl).pathname
  if (target === root) return ''
  return target.slice(root.length + 1).split('/').map(decodeURIComponent).join('/')
}

/** Strip the resolved child target: the wire carries names and metadata only. */
function directoryEntry(child: FsDirEntry): WorkspaceDirectoryEntry {
  return {
    name: child.name,
    type: child.type,
    ...child.size === undefined ? {} : { size: child.size },
  }
}

/** Host Remote service over the composed filesystem, confined to one workspace. */
export class WorkspaceFiles extends TypertRemoteService {
  static inject = ['fs', 'sandboxPolicy', 'typert']

  static Config: z<Config> = z.object({
    maxBytes: z.number().step(1).min(1).default(2 * 1024 * 1024),
    maxLines: z.number().step(1).min(1).default(5000),
    maxEntries: z.number().step(1).min(1).default(2000),
  })

  private readonly feed: WorkspaceChangeFeed

  /**
   * @param ctx - Host context carrying the filesystem and the sandbox policy.
   * @param config - deployment caps on one page or one listing.
   */
  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'workspaceFiles')
    this.feed = new WorkspaceChangeFeed(ctx)
  }

  /**
   * Read one page of lines from a UTF-8 text file inside the Agent's workspace.
   * @param agent - target Agent resolved from the Session identity on the wire.
   * @param path - workspace path, absolute or relative to the workspace root.
   * @param range - the line window; omitted fields take the page defaults.
   * @param signal - caller cancellation.
   * @returns the page, the file's version at the stat before it, and whether it reaches the last line.
   */
  @Remote
  async read(agent: Agent, path: string, range: WorkspaceFileRange, signal: AbortSignal): Promise<WorkspaceFileText> {
    const { offset, limit } = this.resolvePage(range)
    const { target, info } = await this.locateFile(agent, path, signal)
    const page = await this.cutPage(target, offset, limit, signal, path)
    if (page.text.includes(NUL)) {
      throw new RemoteError('workspace-file/not-text', `"${path}" contains NUL bytes`, { path })
    }
    return { ...this.statOf(target, info), offset, text: page.text, lines: page.lines, eof: page.eof }
  }

  /**
   * Read one byte window of a regular file inside the Agent's workspace: raw
   * bytes, no text decoding and no binary rejection.
   * @param agent - target Agent resolved from the Session identity on the wire.
   * @param path - workspace path, absolute or relative to the workspace root.
   * @param range - the byte window; omitted fields take the window defaults.
   * @param signal - caller cancellation.
   * @returns the window in base64, the file's version and size at the stat before it, and whether it reaches the last byte.
   */
  @Remote
  async readBytes(agent: Agent, path: string, range: WorkspaceByteRange, signal: AbortSignal): Promise<WorkspaceFileBytes> {
    const { offset, length } = this.resolveWindow(range, path)
    const { target, info } = await this.locateFile(agent, path, signal)
    const data = await this.ctx.fs.readByteRange(target, { offset, length }, signal)
    const eof = info.size === undefined ? data.length < length : offset + data.length >= info.size
    return { ...this.statOf(target, info), offset, data: Buffer.from(data).toString('base64'), eof }
  }

  /**
   * Report one regular file's identity, version, and size without its content.
   * @param agent - target Agent resolved from the Session identity on the wire.
   * @param path - workspace path, absolute or relative to the workspace root.
   * @param signal - caller cancellation.
   * @returns the file's absolute path, current version, and byte size.
   */
  @Remote
  async stat(agent: Agent, path: string, signal: AbortSignal): Promise<WorkspaceFileStat> {
    const { target, info } = await this.locateFile(agent, path, signal)
    return this.statOf(target, info)
  }

  /**
   * List the direct children of one directory inside the Agent's workspace.
   * @param agent - target Agent resolved from the Session identity on the wire.
   * @param path - workspace path, absolute or relative to the workspace root.
   * @param signal - caller cancellation.
   * @returns the directory's children in the backend's stable name order, bounded by the entry cap.
   */
  @Remote
  async list(agent: Agent, path: string, signal: AbortSignal): Promise<WorkspaceDirectoryListing> {
    const { root, workspaceRoot, entry } = await this.inspect(agent, path, signal)
    if (entry.type !== 'directory') {
      throw new RemoteError(
        'workspace-file/not-directory',
        `"${path}" is a ${entry.type}`,
        { path, kind: entry.type },
      )
    }
    const target = await this.confine(root, workspaceRoot, path, signal)
    const children = await this.ctx.fs.listDir(target, signal)
    return {
      path: workspacePathOf(this.ctx.fs.fileUrl(root), this.ctx.fs.fileUrl(target)),
      entries: children.slice(0, this.config.maxEntries).map(directoryEntry),
      truncated: children.length > this.config.maxEntries,
    }
  }

  /**
   * Stream every `fs/observed` observation of a file inside the Agent's
   * workspace. Only Agent filesystem operations report here; the OS is not
   * watched.
   * @param agent - target Agent resolved from the Session identity on the wire.
   * @param signal - generation cancellation.
   * @returns `ready` once the Host observation queue is active and the workspace
   *   root is resolved, then queued and live observations in emission order.
   */
  @Remote({ mode: 'stream' })
  changes(agent: Agent, signal: AbortSignal): AsyncIterable<WorkspaceFileWatchFrame> {
    return this.feed.follow(this.workspaceRootOf(agent), signal)
  }

  /** Apply the page defaults and caps here, so the request never carries them implicitly. */
  private resolvePage(range: WorkspaceFileRange): { offset: number; limit: number } {
    const offset = range.offset === undefined ? 1 : integerAtLeast(range.offset, 1, 'offset')
    const limit = range.limit === undefined ? this.config.maxLines : integerAtLeast(range.limit, 1, 'limit')
    if (limit > this.config.maxLines) {
      throw new RemoteError('gateway/bad-request', `limit must be at most ${this.config.maxLines}`, {})
    }
    return { offset, limit }
  }

  /** Apply the byte-window defaults and cap; a window above the cap is refused, not shortened. */
  private resolveWindow(range: WorkspaceByteRange, path: string): { offset: number; length: number } {
    const offset = range.offset === undefined ? 0 : integerAtLeast(range.offset, 0, 'offset')
    const length = range.length === undefined ? this.config.maxBytes : integerAtLeast(range.length, 1, 'length')
    if (offset + length > Number.MAX_SAFE_INTEGER) {
      throw new RemoteError('gateway/bad-request', 'offset plus length must stay a safe integer', {})
    }
    if (length > this.config.maxBytes) {
      throw new RemoteError(
        'workspace-file/too-large',
        `${length} bytes of "${path}" exceed the ${this.config.maxBytes} byte cap`,
        { path, limit: this.config.maxBytes },
      )
    }
    return { offset, length }
  }


  /**
   * The workspace root comes from the policy, not from the backend's own cwd
   * default: the `minimal` preset shadows the host provider with a bare
   * `fs-local` whose cwd differs, and resolving explicitly makes the answer
   * the same whichever instance answers.
   */
  private workspaceRootOf(agent: Agent): string {
    return this.ctx.sandboxPolicy.resolve({ session: agent.session }).workspaceRoot
  }

  /**
   * Gates 1 and 2 up to the point where the path's own type is known. The
   * path is inspected before containment is decided, so a caller learns whether
   * an outside path exists and what kind it is before `outside-workspace`
   * refuses it; the caller is the Session's own owner, who can read the Host
   * through the Agent anyway, and the accepted cost buys one `lstat` gate for
   * every method instead of two resolution orders.
   */
  private async inspect(
    agent: Agent,
    path: string,
    signal: AbortSignal,
  ): Promise<{ root: FsTarget; workspaceRoot: string; entry: FsPathInfo }> {
    if (path.length === 0) throw new RemoteError('gateway/bad-request', 'path is required', {})
    const workspaceRoot = this.workspaceRootOf(agent)
    const root = await this.ctx.fs.resolve(workspaceRoot, { signal })
    // Gate on the path itself before anything follows it.
    const entry = await this.ctx.fs.lstat(path, { cwd: workspaceRoot }, signal)
    if (entry === undefined) {
      throw new RemoteError('workspace-file/not-found', `no entry at "${path}"`, { path })
    }
    return { root, workspaceRoot, entry }
  }

  /** Resolve an inspected path and refuse it unless the workspace contains it. */
  private async confine(root: FsTarget, workspaceRoot: string, path: string, signal: AbortSignal): Promise<FsTarget> {
    const target = await this.ctx.fs.resolve(path, { cwd: workspaceRoot, signal })
    if (!this.ctx.fs.contains(root, target)) {
      throw new RemoteError('workspace-file/outside-workspace', `"${path}" is outside the workspace`, { path })
    }
    return target
  }

  /**
   * All gates for a regular file, ending in the one stat that names its version
   * and size. The stat re-checks what `lstat` saw: the file may have gone or
   * changed kind in between.
   */
  private async locateFile(agent: Agent, path: string, signal: AbortSignal): Promise<{ target: FsTarget; info: FsInfo }> {
    const { root, workspaceRoot, entry } = await this.inspect(agent, path, signal)
    if (entry.type !== 'file') {
      throw new RemoteError('workspace-file/not-regular-file', `"${path}" is a ${entry.type}`, { path, kind: entry.type })
    }
    const target = await this.confine(root, workspaceRoot, path, signal)
    const info = await this.ctx.fs.stat(target, signal)
    if (info === undefined) {
      throw new RemoteError('workspace-file/not-found', `no entry at "${path}"`, { path })
    }
    if (info.type !== 'file') {
      throw new RemoteError('workspace-file/not-regular-file', `"${path}" is a ${info.type}`, { path, kind: info.type })
    }
    return { target, info }
  }

  private statOf(target: FsTarget, info: FsInfo): WorkspaceFileStat {
    return {
      absolutePath: this.ctx.fs.processPath(target),
      version: info.version,
      ...info.size === undefined ? {} : { bytes: info.size },
    }
  }

  /** Stream the file as text and cut the page, classifying the backend's non-text refusal. */
  private async cutPage(target: FsTarget, offset: number, limit: number, signal: AbortSignal, path: string): Promise<Page> {
    try {
      return await cutPage(await this.ctx.fs.streamText(target, signal), offset, limit, this.config.maxBytes, path)
    } catch (error: unknown) {
      if (isNotTextRefusal(error)) {
        throw new RemoteError('workspace-file/not-text', `"${path}" is not UTF-8 text`, { path }, { cause: error })
      }
      throw error
    }
  }
}

/**
 * The backend's non-text refusal, recognized by its code alone: the error class
 * belongs to whichever `dsh-fs` instance the provider loaded, so no class
 * identity is shared across the package boundary.
 */
function isNotTextRefusal(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'FS_NOT_TEXT'
}

export default WorkspaceFiles
