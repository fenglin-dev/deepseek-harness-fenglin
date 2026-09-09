---
description: "Workspace file service for the web GUI: paged read, byte windows, stat, directory listing, and the Agent-write change feed inside the Session workspace root, exposed as the workspaceFiles Remote namespace."
kind: "package-reference"
---

# @deepseek-ai/dsh-api-workspace-files

English | [中文](README.zh.md)

## Summary

Use this package to browse and inspect files within a Session's workspace from the web client. It reads UTF-8 text one page of lines at a time, reads raw bytes in bounded windows, reports file versions and sizes, lists direct directory children, and streams changes caused by Agent file operations. Every operation stays within the workspace root selected for the addressed Session, independent of the filesystem backend's working directory. Client components can also follow live file metadata and build the Sidebar file tree through the shared Remote API.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount the package beside `dsh-fs`, `dsh-sandbox-policy`, and the Typert Gateway; the bundle does so right after the Session Controller. Every method takes the Session identity on the wire, so a Client calls `remote.workspaceFiles.read(agent, path, range, signal)`, `stat(agent, path, signal)`, `readBytes(agent, path, range, signal)`, `list(agent, path, signal)`, or `changes(agent, signal)` and never names a root itself.

| Method | Returns | Purpose |
|---|---|---|
| `stat(path)` | `WorkspaceFileStat { absolutePath, version, bytes? }` | Identity, version, and size of one regular file, without content |
| `read(path, { offset?, limit? })` | `WorkspaceFileText` = stat + `{ offset, text, lines, eof }` | One window of lines from a UTF-8 text file; `lines` counts them, so one empty line and a page past the end read differently |
| `readBytes(path, { offset?, length? })` | `WorkspaceFileBytes` = stat + `{ offset, data, eof }` | One window of raw bytes from any regular file, base64-encoded |
| `list(path)` | `WorkspaceDirectoryListing { path, entries, truncated }` | Direct children of one directory |
| `changes()` | stream of `WorkspaceFileWatchFrame` | Subscription readiness, then Agent observations inside the workspace root |

### Addressing and paths

`read`, `stat`, and `list` accept a workspace path that is absolute or relative to the Session's workspace root. Two path vocabularies leave the service, and each method uses exactly one: `read`, `stat`, and `changes` report a file as its absolute path in the filesystem's execution world, symlinks resolved (`WorkspaceFileStat.absolutePath`, `WorkspaceFileChange.absolutePath`), because their consumer is the Client resource system, which follows changes by that path; `list` reports the listed directory as a workspace path relative to the root — empty for the root itself — because its consumer is a tree rooted there, and a child's path is that value joined with the entry name by `/`.

### Pages

`read` returns one line window, never the whole file. `range.offset` is the 1-based first line and defaults to 1; `range.limit` is the largest number of lines on the page and defaults to `maxLines`, which it may not exceed — a larger limit, or an offset or limit that is not a positive integer, is a `gateway/bad-request`. Lines end at `\n`, and a final `\n` terminates the last line rather than starting an empty one, so a two-line file has two lines. The page's `text` joins its lines with `\n` and carries no terminator after the last; `eof` is true when the page includes the file's last line, and an offset past the end returns an empty page with `eof` true. Every page also carries the file's `version` from the stat that preceded it, so a consumer can tell a fresh page from a stale one, and `bytes`, the complete file's size when the backend reports it. The service reads the file only up to the first character past the page, so a very large file costs one page of memory per request.

### Byte windows

`read` pages by lines and never by bytes; a byte window is `readBytes`. `range.offset` is the 0-based first byte and defaults to 0; `range.length` is the largest number of bytes in the window and defaults to `maxBytes`, which it may not exceed — a longer window fails with `too-large` instead of arriving shortened, and an offset or length that is not an integer in range is a `gateway/bad-request`. The window comes back as base64 `data`, shorter than `length` at the end of the file and empty at or past it; `eof` is true when the window includes the file's last byte. Nothing is decoded and nothing is refused as binary, so an image or a NUL-laden file reads where `read` fails with `not-text`. The same `version` and `bytes` ride along as on a page.

### The four gates

Every read, stat, and listing passes four gates in this order. First, `lstat` inspects the path itself before anything follows it: a symlink, wherever it points, fails `read` and `stat` with `not-regular-file` and `list` with `not-directory`, each carrying the entry's `kind`. Second, containment: the path resolves to a target and `ctx.fs.contains(root, target)` decides, so a `..` traversal or an absolute path outside the root fails with `outside-workspace` — never a string-prefix comparison, which cannot see a realpath that leaves the root. Third, the caps: a page whose text exceeds `maxBytes` fails with `too-large` instead of arriving shortened — the file itself has no size cap — while `maxEntries` cuts a listing and sets `truncated`. Fourth, text: content that is not UTF-8 up to the end of the page, or a page that carries a NUL byte, fails with `not-text`; bytes past the page are not inspected. A missing path fails with `not-found`; an empty path is a `gateway/bad-request`.

### The change feed

`changes` is a `stream` Remote. A generation registers its observation queue and resolves the Session workspace root before yielding `{ kind: 'ready' }`. It then yields `{ kind: 'change', change }`, where `change` is `{ absolutePath, version }` for a present file or `{ absolutePath, absent: true }` for one observed gone. The source is `fs/observed`, filtered to targets inside that root; the operating system is not watched. Observations after the generation's first pull are queued, including while the root resolves. The generation ends on cancellation or plugin disposal.

### Configuration

| Field | Default | Meaning |
|---|---|---|
| `maxBytes` | `2097152` (2 MiB) | Inclusive byte cap on one page's text and on one byte window; a larger page or window fails |
| `maxLines` | `5000` | Default and largest page size in lines; a larger `limit` is refused |
| `maxEntries` | `2000` | Cap on returned directory entries; the rest is dropped and reported cut |

The generated [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-api-workspace-files) is the exhaustive source for every accepted field and its JSDoc.

### Failures

Each failure is one `RemoteError` code with typed details, declared in [`src/types.ts`](src/types.ts): `workspace-file/not-found`, `workspace-file/outside-workspace`, `workspace-file/too-large` (with `limit`, the page and window cap), `workspace-file/not-text`, `workspace-file/not-regular-file` (`kind`: `directory`, `symlink`, or `other`), and `workspace-file/not-directory` (`kind`: `file`, `symlink`, or `other`). Callers branch on the code, never on message text.

### Client file resources

The browser export registers the `file` provider into `ctx.resources` and requires `resources`, `remote`, `remote.workspaceFiles`, and `sessions`. The bundle's single `workspace-files` row supplies both faces; the Client has no separate configuration. A component follows a file through its standard `useResource<'file'>(address)` prop and reads `{ absolutePath, version, bytes?, changed }`; content is fetched separately through the paged methods.

A `session/<sessionId>/<path>` resource address sends its relative path unchanged to the Host, which resolves and confines it against that Session's workspace root; the Client needs no Session `cwd`. An `absolute/<path>` address reads through the current Session. Both use the `dsh-resource://file/` grammar in [workspace-path](../../util/workspace-path/README.md). An absolute address without a current Session produces `workspace-file/unknown-workspace`; an unsupported address produces `workspace-file/unsupported-address`. These Client failures end the stream and make reload a no-op.

The provider waits for the Host's `ready` frame before its first `stat`, queues changes during the read, then binds the follower to `stat.absolutePath`. Both queued and live changes match that Host-returned path. A new write version raises `changed` while retaining the last byte size; duplicate versions are ignored. An absent notice or reload re-stats the file. A failed stat keeps the address followed; a later write or reload can recover it, and any Session write can trigger a retry before the first successful path binding. Reload clears `changed`; a Host-triggered re-stat keeps it raised. Frames are `RemoteResult` values, and programming exceptions remain uncaught.

One supervised `changes` stream serves every followed file in a Session. Followers match absolute paths with backslashes normalized to slashes. Carrier loss reconnects through the Gateway supervisor; a Host-ended or terminally failed feed ends its followers and leaves their last metadata readable until reopened. The last follower leaving disposes the stream, a successor waits for that disposal, and plugin teardown awaits all pending closes. The provider declares `ResourceProtocolMap.file`; the text preview declares its Sidebar line-navigation parameters.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

### Design concept

Reads through `ctx.fs` are deliberately unconfined — the sandboxing backend fences writes and edits only — so every constraint here is the service's own. A page is cut from `streamText`, which decodes and rejects non-UTF-8 chunk by chunk: the cutter counts lines before the window without keeping them, admits each in-window segment against the byte cap before buffering it, and returns at the first character past the window, so neither a huge file nor one giant line can hold more than a page in memory; the NUL scan then runs on the page. One `stat` before the stream names the version and size the page reports. The path gate runs before containment on purpose: `lstat` is path-shaped and sees the link, while `resolve` follows it; the price is that an entry outside the root reports its own kind before its position.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | `WorkspaceFiles`: the `workspaceFiles` service and Remote namespace, `Config`, the gates, the page cutter, `read`, `readBytes`, `stat`, `list` |
| [`src/changes.ts`](src/changes.ts) | `WorkspaceChangeFeed`: `fs/observed` subscription and one queue per open `changes` generation |
| [`src/types.ts`](src/types.ts) | Wire types and the `RemoteErrorDetailsMap` codes, published as `./types` for Client packages |
| [`src/client/index.ts`](src/client/index.ts), [`provider.ts`](src/client/provider.ts), [`change-feed.ts`](src/client/change-feed.ts) | Browser plugin, file metadata, and per-Session change feed |
| [`src/client/types.ts`](src/client/types.ts), [`remote.ts`](src/client/remote.ts) | Resource values, parameters, Client error codes, and generated Remote types |
| — | No runtime invariant companion is published; every Host answer is derived from `ctx.fs` and the sandbox policy at call time. |

Typert generates the Host and Client Remote artifacts exposed by `./typert` and `./remote`.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Filesystem capability](../../fs/fs/README.md) — the `ctx.fs` contract this service reads through, including `fs/observed` and `readByteRange`.
- [Sandbox policy](../../sandbox/sandbox-policy/README.md) — where the Session's workspace root comes from.
- [Remote assembly](../../api/remotes/README.md) — how Client packages reach the `workspaceFiles` namespace.
- [Client resources](../../client/resources/README.md) — the resource model, `useResource`, pins, and provider lifetime.
- [Workspace path helpers](../../util/workspace-path/README.md) — `fileAddressFor` and `parseFileAddress`, the `dsh-resource://file/…` address grammar both ends share.
- [Sidebar text preview](../../client/ui-sidebar-textpreview/README.md) — the tab type that follows a file through the `file` provider and reads its pages.

-----

<a id="model-experience"></a>
## Model Experience

None, as this package registers no tool, contributes no prompt section, and appends no session event.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Agent writes only** — `changes` relays `fs/observed` emissions; a file changed by a subprocess, a shell command, or the user's editor produces no frame.
- **Kind before position** — an entry outside the workspace whose type already disqualifies it reports `not-regular-file` or `not-directory`, not `outside-workspace`, because the path gate precedes containment.
- **No total line count** — a page reports `eof`, not how many lines follow; a consumer that needs the total pages to the end or estimates from `bytes`.
- **One giant line has no page** — a single line above `maxBytes` fails `too-large` at every window that includes it, because pages are cut by lines, not bytes.
- **Version precedes content** — the `version` on a page is the stat's, taken before the stream; a write landing between the two leaves the page one version behind, which the next `changes` frame reports.
- **Unbounded generation queue** — a `changes` generation buffers every contained observation until its consumer pulls; a stalled consumer grows Host memory for the life of the stream.
- **`maxEntries` bounds the answer, not the listing** — `list` asks `ctx.fs.listDir` for every child and cuts the array afterwards, so a directory far above the cap still costs the Host the whole listing (on `fs-local`, one stat per child); bounding that work needs a limit on the filesystem seam's `listDir`.
- **Dead feeds retain metadata** — after the Host ends `changes` or the stream fails terminally, open values retain their last state until reopened; reload does not reopen the stream.
- **Reload is shared by path** — a reload re-stats every follower of that absolute path in the Session and clears their `changed` flags, including readers that did not reload their content. Per-record reload delivery remains deferred.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
