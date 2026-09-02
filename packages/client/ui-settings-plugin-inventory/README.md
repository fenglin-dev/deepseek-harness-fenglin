---
description: "Scope-grouped plugin inventory plus diagnostics, recovery, external-tool settings, and live Plugin Market discovery surfaces for the dsh web client."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-settings-plugin-inventory

English | [中文](README.zh.md)

## Summary

`dsh-client-ui-settings-plugin-inventory` provides the client surfaces for plugin inventory, diagnostics, imported-plugin recovery, external tools, and Plugin Market discovery. The **Plugin list** tab lazily calls `ctx.remote.pluginInventory.list()` and renders two collapsible groups: agent-preset compositions first and the global Loader plane second. It exposes preset provenance, conditional gates, failures-first global rows, preset-provided global entries, and search across both scopes without mutating their enablement. Its new-session **Explore plugins** control composes four recommended or category-specific entries from the installed market, shows market-owned popularity and current Profile state, and offers guarded direct installation plus a deep link into the complete market. The package keeps no duplicate full catalog or fallback statistics. Loading, empty, no-match, and generic failure states stay local to the mounted component; without a roster the tab renders the global plane alone, expanded.

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

Open the Plugins section in Settings and select the **Plugin list** tab to inspect the Host's plugin inventory. The tab reads no Remote during plugin activation — selecting it for the first time mounts the component and lazily calls `ctx.remote.pluginInventory.list()` through `api-remotes`.

Open **Diagnostics** to inspect Profile dependency, Loader, quarantine, and removal consistency. A `profile.quarantine-removal-residue` card means the plugin is already inactive and absent, but derived lockfile or diagnostic state still names it; **Clean removal residue** invokes the guarded Profile doctor and never reinstalls or re-isolates that plugin.

Diagnostics distinguishes a missing Loader module from a Loader whose published code imports an unavailable dependency, and attributes either failure to the uniquely owning external Bundle. Missing internal `@deepseek-ai/dsh-*` packages are presented as DSH generation incompatibility rather than an instruction to install Host internals. When `settings.yaml` is invalid, Desktop safe mode keeps the original file untouched and offers fixed-path actions to reveal it or preserve its exact bytes before resetting it to an empty valid map and restarting Harness.

The desktop-only **Diagnostics Lab** includes an **Incomplete quarantine removal** exercise for both the isolated home and the explicitly confirmed current Profile. It writes the reviewed legacy repair-report, diagnostic-report, and lockfile shape, invokes the production doctor, and retains the run report until **Restore all**; the renderer cannot supply a package, path, or arbitrary payload. Current-Profile fixtures never replace global Host overrides. Restore all performs a forced offline dependency rebuild and verifies managed-file hashes, run-attributed pnpm links, and a final Doctor result before Harness resumes; failed recovery remains visible and retryable.

### Exploring market plugins

Open **Explore plugins** on the new-session page to browse the recommended ranking or any non-empty market category. The four cards show category, author, description, 30-day downloads, stars, and installed, uninstalled, restart-required, unavailable, or unknown state. **View in Market** opens the matching market entry. **Install now** is offered only for an npm-backed uninstalled item, requires an explicit third-party-code acknowledgement, and then uses the same guarded Host/Desktop installer, diagnostics, and polling flow as Settings. Market-only sources remain view-only. If the market is absent, an explicit install or update uses the checked bundled market archive and reports that a quick restart is required. Network and catalog failures show their actual message; expired cached rankings remain available behind a stale warning.

### Reading a card

Each collapsed card uses the short module name as its title and a small enablement tag; enabled entries also show a colored root-fiber status dot. Expanding one card reveals the declared entry id, the full module specifier, and the state facts: a preset row names the preset it comes from, its runtime status when the composition is live, and its disable condition when it carries one; a preset-provided global row explains that agent presets provide it per session, names the presets that enable it, and offers a jump into the preset group. Preset names resolve through the shared `presetDisplayText` fold (`dsh-agent-presets/display`) over [`ui-agent-preset`](../ui-agent-preset/README.md)'s dictionaries: shipped presets follow the active locale while user-authored ones keep their own metadata, so an English surface never echoes the preset files' Chinese names. Search filters both groups by module name and entry id.

### The preset switcher

The switcher is the same selector-pill-plus-menu control the General settings rows use. It lists every roster preset — the default suffixed as such, broken ones marked — and changes only what the list shows: it writes no settings, and selecting a broken preset shows the discovery-reported reason in place of rows. Choosing the default preset or a session's preset stays where it was: the Agent presets section and the new-session screen.

### Retrying a failed read

A failed read renders a generic failure state inside the tab; retrying re-runs the lazy `list()` call without exposing transport details.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The tab is a read-only projection of a Host-owned snapshot; it performs no Remote read during plugin activation and takes the snapshot on first selection.

### Registration

The browser plugin registers one localized `settings.plugins.tab` contribution with id `all`; the Plugins section owns the navigation entry and tab chrome. Registration uses `ctx.slots.inject()`, so it follows late tab declaration, redeclaration, locale changes, and teardown without importing the section owner.

### Rendering

Row keys are scope-qualified (`global:`, `preset:<id>:<index>`), so one module appearing in both scopes keeps distinct disclosure state; an entry id is shown as detail only when the row declares one and is never classified by string shape. The preset-provided marking is derived client-side: a global entry carries it when it is disabled there while at least one preset row for the same module specifier is actually enabled, so a module every preset gates off (or declares only conditionally) stays plainly disabled rather than over-claiming provision.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

These pages cover the settings section, the remote call, and the Host-side projection.

- [ui-settings-plugins](../ui-settings-plugins/README.md) — the Plugins section this tab registers into.
- [ui-settings](../ui-settings/README.md) — the domain base declaring `settings.plugins.tab`.
- [api-remotes](../../api/remotes/README.md) — the Remote BFF surface behind `pluginInventory.list()`.
- [plugin-inventory](../../host/plugin-inventory/README.md) — the Host-side read-only Loader projection this tab renders.

-----

<a id="model-experience"></a>
## Model Experience

None, as the package is a browser-side inventory projection that registers nothing model-facing.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define the freshness and reach of the inventory view; they are current package constraints.

- **One snapshot per Settings mount or retry** — the tab does not subscribe to Loader changes or automatically refetch after reconnect; switching tabs preserves the current snapshot, while reopening Settings obtains a new one.
- **Read-only inventory state** — the global and preset planes do not edit enablement or custom composition files. The only mutation exposed inside the list is the explicit guarded removal of the plugin-market package itself.
- **Market data availability** — the preview requires an installed Plugin Market exposing its standard registry and installed-state resources, plus a working catalog connection; failures are shown honestly and can be retried.
- **Bounded stale fallback** — when a 24-hour cache expires and catalog refresh fails, the old ranking remains visible only with an explicit stale warning; unknown installed state is never presented as uninstalled.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. This package owns a read-only Settings contribution.
