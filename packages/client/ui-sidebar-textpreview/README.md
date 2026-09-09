---
description: "The right Sidebar's plain-text viewer tab type for the dsh web client: paged reads of one workspace file, line navigation, wrap, reload, and the fallback claim on every file resource address."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sidebar-textpreview

English | [中文](README.zh.md)

## Summary

The right Sidebar's plain-text viewer: one workspace text file, read one page of lines at a time, with line navigation, wrap, and reload. It is the fallback type for every `file` resource address, and the template for a tab type shipped from outside `ui-sidebar-right`: every import from the Sidebar is a type, the file's metadata comes from the shared `file` resource, the text is the type's own business, and the type's controls live in its own body.

## Table of Contents

- [What it registers](#what-it-registers)
- [Addresses](#addresses)
- [How it reads](#how-it-reads)
- [Navigation](#navigation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="what-it-registers"></a>
## What it registers

- **The type** — `ctx.sidebarRightTabs.register(...)` with id `@deepseek-ai/dsh-client-ui-sidebar-textpreview` (this implementation's identity in the tab system, and the key its body registers under), kind `text`, pattern `dsh-resource://file/**`, band `fallback`. A type registered at the `extension` or `builtin` band for a narrower pattern (say `*.png`) takes those addresses; everything else lands here. The whole address is the content identity, so two files with one name in different directories, or one path under two sessions, are two tabs; the decoded basename is the tab title.
- **The body** — the keyed `sidebar.right.pane.tab` seat under the type's id. Its header row shows the Host's absolute path and exposes its full value in a tooltip, with the type's two controls at its end: a wrap toggle (on by default; long lines wrap until the reader turns it off, per tab) and a reload button. The Sidebar's tab strip carries no controls of this type. The body takes the pane body's full height: the header row stays put and the file body below is the one scroller, so a short file leaves no unstyled space and a long file scrolls under a fixed path. Until metadata provides an absolute path, the header uses the requested path.
- **One store and one face**, session-scoped and bucketed by tab id. The store holds the pages read so far (keyed by the 1-based line each starts at, with the file version they belong to), the end-of-file flag, the read in flight or its failure, and the view: scroll offset, wrap (initially on), and the navigation revision the body last answered. The face (`loadPage`, `reloadPages`) performs the reads and writes through the store's actions. The bucket is forgotten when the owner's `signal` aborts, which is when the tab record is gone.

<a id="addresses"></a>
## Addresses

A tab's address is `dsh-resource://file/session/<sessionId>/<path relative to that session's workspace root>` or `dsh-resource://file/absolute/<absolute path without its leading />` (a URI whose authority is the resource protocol, `file`, and whose path opens with the scope), built by `fileAddressFor` in `@deepseek-ai/dsh-util-workspace-path` and read back by `parseFileAddress`; every segment is component-encoded, and this package never splits the string itself. `hostFileOf` in `rpc.ts` turns the address into the session and path the endpoint takes: a `session` address reads under the session it names, with the relative path the Host resolves against that session's workspace root; an `absolute` address reads under the session the slot was mounted for, with the absolute path, and the Host's workspace confinement still applies. A malformed address throws, because the registry routes every `file` address to this type and a caller building one is expected to use the helper.

<a id="how-it-reads"></a>
## How it reads

The body reads its record, navigation and lifetime through `useTabInfo().tab`. Metadata and content come from different places:

- `useResource<'file'>(tab.contentId)`, the standard hook from `@deepseek-ai/dsh-client-resources`, yields `{ absolutePath, version, bytes, changed }` from the `file` provider in `@deepseek-ai/dsh-api-workspace-files`. The body reads `changed` and the failed state: when the agent wrote the file after the last `stat`, a bar announces it with a reload button, and when the resource is `failed` — the file gone, or the Host refusing it — a failure bar takes that place with the failure's line and the same reload button, ahead of any pending `changed`. Either way the pages already read stay on screen: the text is never replaced under the reader.
- Pages come from `remote.workspaceFiles.read(sessionId, path, { offset }, signal)`, bound in `rpc.ts` and called by the face with the session and path the address names. The first mount reads the first page; a **Load more** button at the end of the loaded text reads the next until `eof`. Each page carries its line count (`lines`), which is how one empty line and a page past the end read differently. A first page from a newer file version replaces the pages of the older one; a later page from a newer version is not adopted — the walk restarts from the first page, so the body never mixes two versions. A failed page shows one sentence per `workspace-file/*` code (`not-found`, `outside-workspace`, `too-large` for a page over the byte cap, `not-text`, `not-regular-file`) or the transport's own message, with a retry for the same page.
- **Reload** — the change bar's button and the header's reload control both call the resource's `reload()` (a fresh `stat`, which clears `changed`) and the face's `reloadPages` (drop the pages, read the first one again). A reload retires the reads still in flight — the face keeps a request generation per tab, and a page settling from an older generation writes nothing. The scroll offset is kept, so the reader stays where they were.

Copy comes from the `sidebarTextpreview` locale namespace.

<a id="navigation"></a>
## Navigation

`ctx.sidebarRight.openResource(address, { params: { line } })` — the `read` tool row passes its `offset` this way — arrives as `navigation.params`, which the body narrows to the `file` resource type's declared parameters (`SidebarRightResourceParamsMap['file']`, `{ line?: number }`, 1-based) without runtime validation: `params` is a typed same-process value. If the loaded pages do not reach that line, the body reads the next page, again, until they do or the file ends; then it scrolls the line to the top and marks it, once per `navigation.revision`. A body remounting for the same revision restores the reader's scroll offset instead. Opening the same file again without `revealIfOpened: false` focuses the existing tab and delivers the new parameters as a new revision.

<a id="model-experience"></a>
## Model Experience

None, as the preview is a browser-only viewer that registers no tool, prompt section, or session event.

#### KV Cache effect

No direct effect; what the user reads here never enters a model request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>
- **Plain text only.** No syntax highlighting, images, rendered markdown, or search; a directory address fails with `not-regular-file`.
- **Sequential pages.** A line far into a large file loads every page before it; there is no seek to an arbitrary offset.
- **Package-local wrap glyph.** `IconWrapOutline16` lives in `src/client/icons.tsx` until the shared icon set carries one; the props contract already matches.
- **Scroll writes are unthrottled.** Every scroll event records its offset in the store; the line blocks are memoized so the resulting re-render hands React the same elements back.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. The type's only runtime state is one Slot store per tab, written by the body that owns it and forgotten on the tab's abort signal; there is no second observation of it to compare against.
