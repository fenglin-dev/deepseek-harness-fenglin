# Agent Note: Workspace file service

Status: implemented

English | [中文](2026-09-05-workspace-files-service.zh.md)

## Problem

The Web client needs to look at files inside a session's workspace from a browser that may not be on the Host machine: a file the agent produced, the path a `read` tool row names, later a file tree and previews of files that are neither small nor text. The one endpoint that read a workspace file over the wire lived on the Session Controller as `workspace-file.ts`, beside session lifecycle it had nothing to do with. It returned a whole file under one total byte cap, so a large log could not be looked at even in part and a binary could not be looked at at all; it had no `stat`, no listing, and no change signal, so a preview could not learn that the agent had rewritten the file without re-reading it; and its result named the file by a Host `url`, a spelling nothing on the Client used as an address.

Two constraints frame any answer. Reads through `ctx.fs` are deliberately unconfined — the sandboxing backend fences writes and edits only and says so — so a web-facing read endpoint must own every fence itself, and the fences must survive a symlink that leaves the workspace, which a string-prefix test cannot see. And `dsh-fs` exposed one raw-byte read, `readBytes(target, signal, maxBytes)`, which refuses any file longer than its cap: correct for an image the model ingests whole, useless for one window of a large file.

## Decision

`packages/api/workspace-files` (`@deepseek-ai/dsh-api-workspace-files`) owns the Host `ctx.workspaceFiles` service, the `workspaceFiles` Remote namespace, and the Client `file` provider that turns `stat` and `changes` into live metadata for the [resource model](2026-09-05-client-resource-model.md); [dual-face packaging](2026-09-07-workspace-files-dual-face-package.md) governs their package organization. Every method confines itself to the workspace root the sandbox policy resolves for the addressed session, names files by their absolute path in the filesystem's execution world, and pages or windows content so that no method ever buffers a whole file. The byte window rides on a new `dsh-fs` seam, `FileSystem.readByteRange`, implemented by every provider. The Session Controller carries no workspace-file code.

### Package topology

[dual-face packaging](2026-09-07-workspace-files-dual-face-package.md) supersedes this note's choice of separate Host and Client packages; the file service, authorization, paging, and change-feed decisions here remain in force. Host and Client compile in separate leaf configurations, share wire types, and the Client does not import the Host runtime entry.

| Face | Package | Files | Depends on |
|---|---|---|---|
| Host | `api/workspace-files/tsconfig.host.json` | `src/index.ts` (`WorkspaceFiles`, `Config`, gates, pager), `src/changes.ts` (`WorkspaceChangeFeed`), `src/types.ts` (wire types, error codes) | `dsh-fs`, `dsh-sandbox-policy`, `dsh-typert-protocol`, `dsh-agent`, `dsh-session` |
| Client | `api/workspace-files/tsconfig.client.json` | `src/client/index.ts` (plugin body), `provider.ts`, `change-feed.ts`, `remote.ts`, `types.ts`, and shared `src/types.ts` | `dsh-api-gateway/client`, `dsh-api-session-controller/client`, `dsh-client-resources`, `dsh-util-workspace-path`, `dsh-typert-protocol`, and the package's generated `./remote` |

`api/remotes` and both root aggregates reference the matching Host/Client leaf. The package exports `.`, `./client`, `./types`, `./typert`, and `./remote`, with one `workspace-files` web-app row supplying both faces. The Client plugin injects `['resources', 'remote', 'remote.workspaceFiles', 'sessions']`; the resource model takes result types directly from the protocol package, and the text preview owns the Sidebar parameter declaration, so the Client compilation graph has no reverse dependency on Remote assembly or Sidebar UI.

### The `workspaceFiles` Remote namespace

Every Host method takes the target `Agent` first, resolved by the Gateway from the Session identity on the wire, so a Client calls `remote.workspaceFiles.stat(sessionId, path, signal)` and never names a root. The five signatures, as `src/index.ts` declares them:

```ts ignore-check
@Remote async read(agent: Agent, path: string, range: WorkspaceFileRange, signal: AbortSignal): Promise<WorkspaceFileText>
@Remote async readBytes(agent: Agent, path: string, range: WorkspaceByteRange, signal: AbortSignal): Promise<WorkspaceFileBytes>
@Remote async stat(agent: Agent, path: string, signal: AbortSignal): Promise<WorkspaceFileStat>
@Remote async list(agent: Agent, path: string, signal: AbortSignal): Promise<WorkspaceDirectoryListing>
@Remote({ mode: 'stream' }) changes(agent: Agent, signal: AbortSignal): AsyncIterable<WorkspaceFileWatchFrame>
```

- **`stat`** returns `WorkspaceFileStat { absolutePath, version, bytes? }`: the file's identity, its opaque freshness token, and its size when the backend reports one. It accepts a regular file only.
- **`read`** returns one window of lines, `WorkspaceFileText = WorkspaceFileStat & { offset, text, lines, eof }`; `lines` counts the page's lines, so a page holding one empty line (`text: ''`, `lines: 1`) and a page past the end (`lines: 0`) read differently. `range.offset` is the 1-based first line and defaults to 1; `range.limit` is the largest number of lines and defaults to `maxLines`, which it may not exceed. Lines end at `\n` and a final `\n` terminates the last line rather than opening an empty one; `text` joins the page's lines with `\n` and carries no terminator; `eof` is true when the page includes the last line, and an offset past the end returns an empty page with `eof` true. The pager walks `streamText`, counts the lines before the window without keeping them, admits each in-window segment against `maxBytes` before buffering it, and returns at the first character past the window, so a file of any size costs one page of memory. The `version` and `bytes` on a page are the stat's, taken before the stream.
- **`readBytes`** returns one window of raw bytes, `WorkspaceFileBytes = WorkspaceFileStat & { offset, data, eof }`. `range.offset` is the 0-based first byte and defaults to 0; `range.length` is the largest byte count and defaults to `maxBytes`, which it may not exceed. `data` is base64, shorter than `length` where the file ends and empty at or past it; `eof` is true when the window includes the last byte. Nothing is decoded and nothing is refused as binary. `read` pages by lines and never by bytes; a byte window is `readBytes`.
- **`list`** returns `WorkspaceDirectoryListing { path, entries, truncated }`: the listed directory as a workspace path relative to the root (empty for the root), its direct children in the backend's stable name order as `{ name, type, size? }`, and whether `maxEntries` cut the list. `type` is `file`, `directory`, or `other`; a symlink child reports the type of what it points to and a dangling one is `other`, while opening such a child still fails the link gate below. Dotfiles are listed; nothing is filtered.
- **`changes`** yields `WorkspaceFileWatchFrame`: `{ kind: 'ready' }` after the observation queue is registered and the workspace root resolves, followed by `{ kind: 'change', change }`. The `WorkspaceFileChange` payload is `{ absolutePath, version }` for a present file or `{ absolutePath, absent: true }` for one observed gone. Its source is `fs/observed` inside the workspace root, never an OS watcher. Observations after the first pull are queued, including during root resolution; cancellation or plugin disposal ends the generation.

### Paths on the wire

Two path vocabularies leave the service, and each method uses exactly one. `read`, `readBytes`, `stat`, and `changes` name a file by `absolutePath`: its absolute path in the filesystem's execution world, symlinks resolved (`ctx.fs.processPath(target)`), so the Client provider matches a change frame to an open address by absolute path: the Client sends the address's path unchanged to the Host and binds the follower only to a successful `stat.absolutePath`, without reading a Session summary's cwd. `list` speaks workspace paths — the same syntax its `path` argument accepts, absolute or relative to the root — because its consumer is a tree rooted there. The field is called `absolutePath` and not `url` because it is not a resource address; the address grammar belongs to `dsh-util-workspace-path` and is described with the resource model. Input paths to `read`, `readBytes`, `stat`, and `list` are absolute or relative to the session's workspace root, never to the backend's own cwd.

`version` is an opaque string a consumer compares for equality and never parses: the local backend derives it from device, inode, size, and nanosecond mtime and ctime, so a rewrite that leaves the content identical still changes it. `offset` means a line on `read` and a byte on `readBytes`; the two units never mix, and `eof` on either means the window reached the file's end.

### The four gates

Every `read`, `readBytes`, `stat`, and `list` passes four gates in order, and the constraints are the service's own because the filesystem does not confine reads. The path is inspected before containment is decided, so a caller learns whether an outside path exists and what kind it is before `outside-workspace` refuses it; that is accepted because the caller is the Session's own owner, who can already read the Host through the Agent.

1. **The path itself.** `lstat` inspects the path before anything follows it: a missing path is `not-found`, and a symlink — wherever it points, including back inside the workspace — is `not-regular-file` (kind `symlink`) for the file methods and `not-directory` for `list`. An empty path is a `gateway/bad-request`.
2. **Containment.** The path resolves to a target and `ctx.fs.contains(root, target)` decides, where `root` is `sandboxPolicy.resolve({ session }).workspaceRoot` resolved the same way (the session's cwd, falling back to the policy's configured root). A `..` traversal or an absolute path outside the root is `outside-workspace`. A string-prefix comparison is never used: `resolve` realpaths, so a prefix test cannot see a link that leaves the root.
3. **The caps.** A page or window above `maxBytes`, or a `read` asking for more than `maxLines`, is refused, never shortened, because a silently cut page reads as the whole page; a listing above `maxEntries` is cut and says so.
4. **Text.** For `read` only: content that is not UTF-8 up to the end of the page, a NUL byte in the backend's 8 KiB opening sample, or a NUL byte anywhere in the page is `not-text`; bytes past the page are not inspected.

After the gates the file methods `stat` the target once more, because the file may have gone or changed kind between the inspection and the read: a vanished file is `not-found` and a replaced one `not-regular-file` with the new kind. The gate order has one visible consequence: an entry outside the root whose type already disqualifies it reports its kind, not its position.

### Failures

Each failure is one `RemoteError` code with typed details, declared beside the throwing code and discriminated by code, never by message.

| Code | When | Details |
|---|---|---|
| `workspace-file/not-found` | no entry at the path, or the file vanished after the gates | `{ path }` |
| `workspace-file/outside-workspace` | the resolved target is not inside the workspace root | `{ path }` |
| `workspace-file/too-large` | a page's text or a requested byte window exceeds `maxBytes` | `{ path, limit }` |
| `workspace-file/not-text` | invalid UTF-8 up to the page's end, or a NUL byte in the sample or the page (`read` only) | `{ path }` |
| `workspace-file/not-regular-file` | `read`, `readBytes`, or `stat` on something that is not a regular file | `{ path, kind: 'directory' \| 'symlink' \| 'other' }` |
| `workspace-file/not-directory` | `list` on something that is not a directory | `{ path, kind: 'file' \| 'symlink' \| 'other' }` |
| `workspace-file/unsupported-address` | Client-minted: a resource address this provider cannot serve | `{ address }` |
| `workspace-file/unknown-workspace` | Client-minted: an `absolute` address with no current Session | `{ address }` |
| `gateway/bad-request` | an empty path, or an `offset`, `limit`, or `length` that is not an integer in range | `{}` |

The set is append-only: a code may be added, and none is renamed or removed, because consumers branch on these strings across the wire.

### Configuration

Three fields, all validated positive integers changeable from `cordis.yml`, and no other tunables: `maxBytes` (default 2,097,152, 2 MiB) is the inclusive cap on one page's text and on one byte window; `maxLines` (default 5,000) is the default and largest page in lines; `maxEntries` (default 2,000) is the cap on returned directory entries. The file itself has no size cap: a caller pages or windows through it.

### The `readByteRange` seam in `dsh-fs`

A byte window of a large file needs a filesystem read bounded by the window, and `FileSystem` had only `readBytes(target, signal, maxBytes)`, which bounds by the whole file. `dsh-fs` therefore gains a second raw-byte primitive:

```ts ignore-check
abstract readByteRange(target: FsTarget, range: { offset: number; length: number }, signal?: AbortSignal): Promise<Uint8Array>
```

It returns the bytes at `[offset, offset + length)`, shorter when the file ends inside the window and empty when `offset` lies at or past the end. The window is the bound: a backend transfers at most `length` bytes beyond the prefix it skips to reach `offset` and never buffers the whole file, so the caller's cap on `length` is the guard against unbounded buffering, sitting beside `readBytes`'s bound rather than replacing it. The parameter order follows `readText`, `streamText`, and `listDir` — target, then the operation's own arguments, then an optional signal — rather than `readBytes`'s signal-in-the-middle form, which is the one exception in the class. Both `offset` and `length` are non-negative integers by precondition; the seam is a typed same-process boundary and validates nothing, and the Remote method validates at the wire.

`fs-local` opens `createReadStream(targetKey, { start: offset, end: offset + length - 1 })` after the same regular-file stat as its other reads, returning an empty array for `length` 0 without opening a stream; `fs-sandbox` extends `LocalFileSystem` and inherits it. `fs-e2b` has an SDK that streams only from a file's start, so it skips `offset` bytes, copies `length` into the window, and cancels the stream the moment the window is full, transferring no more than the window beyond the skipped prefix; a stream that ends first is left to close. The four test doubles that extend `FileSystem` implement the method too.

### The Client `file` provider

The Client export registers one `ResourceProvider<'file'>` into `ctx.resources` for the plugin's lifetime and declares `ResourceProtocolMap.file`. The text-preview package registers this package's exported `WorkspaceFileParams` as `SidebarRightResourceParamsMap.file`.

- **The value is metadata**, `WorkspaceFileResource { absolutePath, version, bytes?, changed }`; content never rides the stream because content can be arbitrarily large and a stream is for pushing change, not payload. A consumer reads pages with `read` (or windows with `readBytes`) and uses `version` and `changed` to know when they are stale.
- **The address names the file; its scope selects the Session.** A `session` address's relative path reaches the Host unchanged for resolution and containment against that Session's workspace root; Client cwd is not a prerequisite. An `absolute` address reads through the current Session, failing with `workspace-file/unknown-workspace` when none is current. Unsupported grammar yields `workspace-file/unsupported-address`. These two Client errors end the stream and make reload a no-op.
- **The frames.** The first frame is a `stat` (`changed: false`) or its failure as an `ok: false` frame; the provider throws and catches nothing, because the Remote face never rejects and a throw inside a provider stream is a programming error left to surface. A Host write carrying a version the value does not hold yields `changed: true` with the byte count kept and no stat; a frame carrying the held version is dropped. A reported disappearance stats again — still there is fresh metadata flagged `changed`, gone is a `not-found` frame with the previous value left for display. `reload(address)` stats again and yields `changed: false`. The follow is on the address, not the file: after a failed stat the stream continues, so the agent creating the file, or a reload, brings the resource live. Aborting the signal ends the stream silently.
- **One `changes` subscription per Session.** The first follower opens `remote.$stream`, the last release disposes it, and successor streams and plugin teardown await pending closes. The Client starts its first `stat` only after accepting Host `ready`; sending a local WebSocket request is not Host acknowledgement. A follower registers by address, queues changes before its path is known, then filters queued and live frames by the successful stat's `absolutePath`, normalizing backslashes to slashes. Any Session write can trigger a re-stat before the first successful binding. Gateway supervision reconnects carrier loss; Host end or terminal failure ends followers and retains their last metadata until reopened.
- **Navigation parameters.** `SidebarRightResourceParamsMap.file` is `WorkspaceFileParams { line?: number }`, a 1-based line to reveal. A line travels as a navigation parameter and not as part of the address, because the file is one piece of content whether it opens at the top or at line 400.

### Related notes

The [resource model](2026-09-05-client-resource-model.md) owns `ctx.resources`, `useResource`, the `dsh-resource://<type>/…` address grammar, and the reasoning for one resource per address; the [text preview and file tree](../feature/2026-09-05-sidebar-text-preview-and-file-tree.md) are the shipped consumers of `read`, `list`, and the `file` provider; the [right Sidebar docking infrastructure](../feature/2026-09-04-right-sidebar-docking-infrastructure.md) is the surface they open into; [workspace file links](../feature/2026-07-31-web-workspace-file-links.md) is where serving files over HTTP was rejected. Anyone extending this system reaches the same five methods through `remote.workspaceFiles` and the same `file` resource through `useResource<'file'>`; the wire types are published as `@deepseek-ai/dsh-api-workspace-files/types`.

## Alternatives considered

**Keeping the workspace file endpoint on the Session Controller.** The first form: one `read` under a total byte cap, registered as a sub-plugin of the Session Controller because that is where the wire entry already was. Rejected because a Workspace File service is its own capability — reading, statting, listing, and observing files inside a workspace root — and everything that queries workspace files belongs to it, while the Session Controller's concern is session lifecycle. The move also let the service grow to five methods without the Controller's file gaining a second purpose.

**A dual-face package with reverse UI dependencies.** The split-package choice followed two project-reference cycles after `api/remotes` referenced the Client leaf: the resource model imported Remote assembly for result types, and the file provider imported Sidebar UI for its parameter map. TypeScript rejected these cycles with `TS6202`. [dual-face packaging](2026-09-07-workspace-files-dual-face-package.md) supersedes that split: result types come directly from the protocol package, and Sidebar parameter registration belongs to the text preview; both root aggregates retain explicit compiler entries.

**Serving workspace files over HTTP.** Already rejected by [workspace file links](../feature/2026-07-31-web-workspace-file-links.md) on origin grounds and not revisited: `read` and `readBytes` carry plain text and base64 over the authenticated Remote carrier, so no document is served, no URL is minted, and no origin question arises.

**Log-reachable authorization for the read.** The one precedent that sends file content over the wire, command attachments, authorizes only files that appear in the session log. Enough for produced files, but a typed path or a directory tree could never open. Path containment inside the workspace root was chosen, with the endpoint owning the constraints the filesystem's unconfined reads do not, and containment decided by `fs.contains` on resolved targets so a symlink cannot escape it.

**Whole-file read and slice for the byte window.** The interim form of `readBytes` read the file from its start to the window's end through `readBytes(target, signal, offset + length)` and sliced. It cannot read a window of a file longer than that end — the seam refuses such a file as too large — so no window could ever report `eof: false`, which contradicts the reason the method exists. Rejected in favour of the `readByteRange` seam, whose bound is the window.

**Naming the file field `url` (or `hostUrl`).** The Session Controller's `WorkspaceFileText.url` was the Host's `file:` URL of the file. Rejected once resource addresses existed: a URL on the wire reads as an address, and this one was not one — it was a differently encoded spelling of the same path the address carries, which the Client had to decode to match change frames. A wire field is named by what it is, so the field is `absolutePath` and the `changes` frames carry the same field.

**A default `readByteRange` in the `FileSystem` base class.** A non-abstract default over `readBytes` would have spared the test doubles a method but could only be implemented by reading the whole file up to the window's end, the very behaviour rejected above, or by passing an unbounded cap. Abstract, with every provider and double implementing it.

**String-prefix containment.** Comparing resolved path strings against the root is simpler than `fs.contains`, but `resolve` realpaths, so a symlink that leaves the root resolves to a path outside it while a prefix test on the unresolved spelling passes; and a prefix test on the resolved spelling still needs the backend's notion of "same file". The filesystem decides containment.

## Consequences

- Workspace file access belongs to the Host/Client faces of `api/workspace-files`; the Session Controller carries neither implementation, and compiler and runtime entries stay separate.
- A file of any size opens: text by line page, anything by byte window, each costing one page or window of memory on the Host and never a whole file; the cost is that a consumer assembles pages itself and that a single line above `maxBytes` has no page at all, because pages are cut by lines.
- Every filesystem provider now offers a windowed raw read. `fs-e2b` pays for it by transferring the skipped prefix, since its SDK cannot seek; `fs-local` seeks.
- Paths on the wire are canonical: `absolutePath` and change frames spell a file with symlinks resolved. An address built from another spelling of the same file — a workspace root reached through a symlink — opens and stats it, but its change frames never match, so `changed` stays false until a reload.
- Change frames report the agent's own operations only. A file edited by the user's editor, a shell, or a subprocess raises no frame; an agent merely reading a file that something else changed does raise one, because the read observes a new version.
- The gate order reports kind before position, a page's `version` may be one write behind its content, and a stalled `changes` consumer grows Host memory, because a generation's queue is unbounded; each is a known trade-off recorded in the package README.
- The `file` resource pushes change, not content, so a preview learns a file moved on without a payload and reads the pages it wants; a failed open keeps following the address, so the agent creating the file brings the tab live without user action.
- `readBytes` has no shipped consumer yet: it is the wire form the image and binary previews build on.

## Testing

Host specs in `packages/api/workspace-files/tests` exercise the paged read (whole file, nested path, empty file, multi-byte UTF-8, the line window's edges, defaults and refused limits, carriage returns kept), the byte window (defaults, a middle window with more following, tail windows exact and short, past-end and empty files, NUL and invalid UTF-8 round-tripping through base64, version parity with `stat`, the cap as `too-large`, bad ranges, a window of a file far above the cap, and `eof` inferred without a size), `stat`, `list` with truncation, symlink children, and `not-directory`, the `changes` stream driven by `fs/observed` and filtered by root, and every gate and code against a real local backend, because a fake filesystem would let a prefix test pass the symlink case the gate exists to catch. Client specs in `packages/api/workspace-files/tests` cover the provider's frames (opening stat, failure frames, writes without content, disappearance, reload, recovery, abort), the change feed (one stream per session, fan-out by normalized path, queued frames, ending on signal or Host close), the unsupported-address cases, and registration and disposal with the fiber. `fs/fs`, `fs-local`, and `fs-e2b` specs pin `readByteRange`'s range semantics — a middle window, a tail shorter than asked, past-end and zero-length windows, errors, aborts, and the e2b cancel — and `dsh-util-workspace-path` specs pin the file-address grammar. The connection fixture serves `stat`, paged `read`, `list`, and an opt-in `changes` frame for the web e2e suite.

## Deferred

- A web e2e chain through the Sidebar: open a file, have the agent write it, see `changed`, reload.
- Aliasing a follower under the Host's canonical spelling once the first `stat` reveals it, so a symlinked workspace root still receives change frames.
- A bound on a `changes` generation's queue.
- The shipped consumer of `readBytes` (image and binary previews) and any write, search, or media route; the service is read-only.
- Scopes other than `session` in the file address; the grammar leaves room, the provider serves one.
- Reload delivery per record: today `reload` re-stats every follower of the file's absolute path in the session, so two records naming one file — a `session` and an `absolute` address, or two readers with different addresses — clear each other's `changed` flag.
