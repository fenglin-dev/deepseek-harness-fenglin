---
description: "Archived-session Settings page for the dsh web client: searchable Workspace groups with individual and batch restore actions."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-settings-unarchive-sessions

English | [中文](README.zh.md)

## Summary

The **Archived sessions** Settings page restores sessions hidden from Workspace navigation. It groups archived sessions by their retained Workspace position, orders each group by recent activity, filters by title, Session id, or Workspace, and offers individual and batch restore actions. Every restore goes through the shared Workspace command and keeps conversation content unchanged.

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

Open Settings and select **Archived sessions** to see the sessions currently hidden from every grouping surface. Mount `@deepseek-ai/dsh-client-ui-settings-unarchive-sessions` in a Web composition that already provides the settings shell, the Workspace service, and the Session list; the page registers its own navigation entry and needs no configuration.

### Reading a row

Each Workspace group shows its archived count. Every row displays the Session title or id and the last known activity time; rows with no loaded summary remain addressable by id instead of disappearing. Search matches the title or Session id, and the Workspace selector narrows the grouped result. The page waits for both Session and Workspace state before rendering rows, then distinguishes an empty archive from a filter with no matches.

### Restoring a session

Unarchive restores a Session to its recorded Workspace position, or to the ungrouped list when it belongs to none. The Settings header also offers **Unarchive all**, which sends the same operation sequentially for the current archive set. Each row disappears only after the Host returns the updated archive state. A rejected individual or batch call leaves the remaining rows available and displays a retryable error.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The page is one localized `settings.section` contribution with id `archived-sessions`; the Settings shell owns the navigation entry, the modal, and the mounted section, so none of that chrome lives here.

### Registration and data sources

`apply()` registers the locale namespace and contributes one `settings.section` plus one `settings.action`. The section reads the archive set and Workspace positions from `useWorkspaces` and titles and timestamps from `useSessions`; the header action reads the same archive set. Both writes use the injected `unarchive` callback backed by `ctx.uiWorkspace.unarchiveSession`.

### Row derivation

Rows are derived from the complete archive set. Workspace ownership comes from each Workspace's retained `sessionIds`; a member outside every Workspace renders under the ungrouped label. Loaded summaries provide display titles and timestamps, while a missing summary falls back to the durable Session id so recovery remains possible.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | Host loader entry: the page is browser-only, so the plugin body is empty |
| [`src/client/index.ts`](src/client/index.ts) | Browser plugin: locale namespace, section registration, injected Unarchive operation |
| [`src/client/ArchivedSessionsSection.tsx`](src/client/ArchivedSessionsSection.tsx) | The page component: grouping, search, Workspace filter, per-row Unarchive |
| [`src/client/ArchivedSessionsAction.tsx`](src/client/ArchivedSessionsAction.tsx) | Settings-header batch restore action |
| [`src/client/locales.ts`](src/client/locales.ts) | Chinese and English dictionaries for every visible and accessible string |
| [`src/client/ArchivedSessionsSection.module.css`](src/client/ArchivedSessionsSection.module.css) | Page styles |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

These pages cover the settings surface that hosts the page, the archive write behind it, and the state it renders.

- [ui-settings](../ui-settings/README.md) — the domain base declaring `settings.section` and the namespace scope service.
- [ui-settings-general](../ui-settings-general/README.md) — the Settings shell that renders the navigation and mounts the section.
- [ui-workspace](../ui-workspace/README.md) — the sidebar browser whose Session rows archive, and the `ctx.uiWorkspace` service this page restores through.
- [Workspace Controller](../../api/workspace-controller/README.md) — the `workspace.unarchiveSession` Remote and the Client model that owns the archive set.
- [Workspace subsystem](../../../docs/subsystems/workspace.md) — the durable archive set, its domain field, and the registry operation behind a restore.

-----

<a id="model-experience"></a>
## Model Experience

None, as the package is a browser-side UI plugin layer that registers nothing model-facing.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define which archived sessions this page can restore; they are current package constraints.

- **The page lists sessions only; it offers no session deletion** — archives are reversible through this page, while deleting a session record remains a separate capability.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. A browser-side settings page that registers one localized `settings.section` contribution and its locale namespace; it emits no Cordis events and owns no cross-plugin mutable relation.
