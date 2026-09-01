---
description: "Plugin inventory, diagnostics, recovery, external-tool settings, and live Plugin Market discovery surfaces for the dsh web client."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-settings-plugin-inventory

English | [中文](README.zh.md)

## Summary

`dsh-client-ui-settings-plugin-inventory` provides the client surfaces for plugin inventory, diagnostics, imported-plugin recovery, external tools, and Plugin Market discovery. Its new-session **Explore plugins** control composes four recommended or category-specific entries from the installed market, shows market-owned popularity and current Profile state, and offers both guarded direct installation and a deep link into the complete market. It keeps no duplicate full catalog or fallback statistics. The existing **Plugin list** tab lazily reads the Host inventory and renders searchable Loader state and configuration.

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

The desktop-only **Diagnostics Lab** includes an **Incomplete quarantine removal** exercise for both the isolated home and the explicitly confirmed current Profile. It writes the reviewed legacy repair-report, diagnostic-report, and lockfile shape, invokes the production doctor, and retains the run report until **Restore all**; the renderer cannot supply a package, path, or arbitrary payload. Current-Profile fixtures never replace global Host overrides. Restore all performs a forced offline dependency rebuild and verifies managed-file hashes, run-attributed pnpm links, and a final Doctor result before Harness resumes; failed recovery remains visible and retryable.

### Exploring market plugins

Open **Explore plugins** on the new-session page to browse the recommended ranking or any non-empty market category. The four cards show category, author, description, 30-day downloads, stars, and installed, uninstalled, restart-required, unavailable, or unknown state. **View in Market** opens the matching market entry. **Install now** is offered only for an npm-backed uninstalled item, requires an explicit third-party-code acknowledgement, and then uses the same guarded Host/Desktop installer, diagnostics, and polling flow as Settings. Market-only sources remain view-only. If the market is absent, an explicit install or update uses the checked bundled market archive and reports that a quick restart is required. Network and catalog failures show their actual message; expired cached rankings remain available behind a stale warning.

### Reading a card

Each collapsed card uses the short module name as its title and a small effective-enablement tag; enabled entries also show a colored root-fiber status dot. Expanding one card reveals its Loader-tree entry id, followed by the effective configuration and, for enabled entries, Cordis status; disabled entries omit the redundant unmounted runtime state. Search filters the catalog by name and entry id.

### Retrying a failed read

A failed read renders a generic failure state inside the tab; retrying re-runs the lazy `list()` call without exposing transport details.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The inventory tab is a read-only projection of a Host-owned snapshot; it performs no Remote read during plugin activation and takes the snapshot on first selection. Discovery lazily reads the Plugin Market's standard `dsh-market/registry` and `dsh-market/installed` resources, then ranks and composes four-card recommended and category views in this desktop-owned package. The compact ranking cache lasts 24 hours while installed state is refreshed on every open; manual refresh bypasses the catalog cache. A settings-domain navigation request carries the target market tab and package without coupling this package to the settings shell. Direct installation accepts only the market's explicit npm package identity and delegates the structured request to the existing guarded installer; it never executes the catalog's free-form command string.

### Registration

The browser plugin registers one localized `settings.plugins.tab` contribution with id `all`; the Plugins section owns the navigation entry and tab chrome. Registration uses `ctx.slots.inject()`, so it follows late tab declaration, redeclaration, locale changes, and teardown without importing the section owner.

### Rendering

The entry id remains the React key, disclosure identity, detail value, and an additional search target; it is never classified by string shape.

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


These limits define the freshness and reach of the inventory and discovery views; they are current package constraints.

- **One snapshot per Settings mount or retry** — the tab does not subscribe to Loader changes or automatically refetch after reconnect; switching tabs preserves the current snapshot, while reopening Settings obtains a new one.
- **Read-only Loader view** — local search does not add provenance, current-browser activation diagnosis, grouping by source, or plugin mutation controls.
- **Market data availability** — the preview requires an installed Plugin Market exposing its standard registry and installed-state resources, plus a working catalog connection; failures are shown honestly and can be retried.
- **Bounded stale fallback** — when a 24-hour cache expires and catalog refresh fails, the old ranking remains visible only with an explicit stale warning; unknown installed state is never presented as uninstalled.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
