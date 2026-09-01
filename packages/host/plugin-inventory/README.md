---
description: "Cordis Loader inventory plus guarded Profile diagnostics and recovery Remotes for web GUI host clients."
kind: "package-reference"
---

# @deepseek-ai/dsh-host-plugin-inventory

English | [中文](README.zh.md)

## Summary

Clients and settings pages can show what is currently composed in the host: calling `pluginInventory/list` returns the current non-group Loader entries in Loader order — entry id, module specifier, effective enablement, and root Fiber phase (`pending`, `loading`, `active`, `failed`, or `unloading`, or `null` when an entry has no live root Fiber). The Loader roster is point-in-time and uncached; the same restricted Remote service also projects durable Profile diagnostics and exposes fixed doctor, quarantine, recovery, uninstall, and export operations without accepting arbitrary commands or paths. Client packages consume the Remote through the explicit [`api-remotes`](../../api/remotes/README.md) assembly rather than importing the Host implementation.

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

Call `pluginInventory/list` when a client or settings page needs to show what is currently composed in the host — which plugins are loaded, enabled, and alive. The Remote is the only entry point: the service is Remote-only and deliberately declares no same-process Cordis `Context` merge.

### What a snapshot contains

Each row is one non-group Loader entry: its entry id, the exact module specifier, the effective enablement (including disabled ancestor groups), and the current root Fiber phase. `pending` means the entry waits to load, `loading` that it is being read, `active` that it is running, `failed` that its fiber rejected, and `unloading` that it is being torn down; `null` means no live root Fiber exists at all. Structural group rows are skipped.

### What you can and cannot do with it

The Loader inventory is a snapshot for display and diagnostics: a client can render the roster, flag failed entries, and detect changes by comparing snapshots. It cannot directly enable or disable arbitrary Loader entries, and it carries no Loader history — a fiber that already failed and was removed is absent. Separate guarded methods run the product CLI for fixed Profile operations. A quarantine-removal residue repair receives only the current Profile and server-owned diagnostic identity, then removes stale metadata for a plugin that is already inactive and absent; it cannot select another package or reinstall code.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

### Design concept

The gateway is a direct projection with no second lifecycle truth: every `list()` call reads `ctx.loader.entries()` and maps each non-group entry to its public row. Cordis's internal plugin/status events already maintain `Entry.fiber` and `Fiber.state`, so a cache would only add another lifecycle truth to keep synchronized.

### The phase mapping

Fiber states map onto the public phase vocabulary, with `disposed` folding into `null` — an entry whose fiber is gone has no live root to report. The phase therefore never distinguishes why no live root exists: the entry may never have started, or its fiber may already have been disposed.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | `PluginInventoryGateway`: the `pluginInventory` Remote service and the Loader projection |
| [`src/types.ts`](src/types.ts) | Public payload types: `PluginInventoryEntry`, `PluginInventorySnapshot`, `PluginFiberPhase` |
| [`src/invariant.ts`](src/invariant.ts) | Invariant companion (no runtime invariant; every snapshot projects Loader-owned state) |

Typert generates the Host and Client Remote artifacts exposed by `./typert` and `./remote`.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

Read these when the inventory contract is not enough: how the Remote reaches clients, then the Loader it projects and the surface that renders it.

- [Remote assembly](../../api/remotes/README.md) — how clients consume `pluginInventory/list` without importing the Host implementation.
- [Cordis plugin loader](../../../vendor/loader/README.md) — the Loader whose entries this package projects.
- [Plugin inventory settings surface](../../client/ui-settings-plugin-inventory/README.md) — the browser-side projection that renders the inventory.

-----

<a id="model-experience"></a>
## Model Experience

None, as the host-side read-only Loader projection registers nothing model-facing.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define what a point-in-time inventory cannot tell a client. They are current package constraints, not a task backlog.

- **Point-in-time state only** — the result contains no durable failure history or subscription; a missing root Fiber is reported as `null`, regardless of why no live root exists.
- **No Loader provenance or arbitrary mutation** — the roster does not identify which bundle or override introduced an entry. Guarded Profile operations accept closed request types; they are not general Loader editing or command execution.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
