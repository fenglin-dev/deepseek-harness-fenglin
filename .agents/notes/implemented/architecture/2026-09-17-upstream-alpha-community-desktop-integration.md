# Agent Note: Integrate the upstream alpha runtime with community Desktop ownership

Status: implemented

English | [中文](2026-09-17-upstream-alpha-community-desktop-integration.zh.md)

## Problem

The upstream alpha runtime changes Profile boot, Agent creation, Session events, PTC, Workflow, MCP, terminal ownership, and archived-session recovery at the same time that the community Desktop owns installation, Profile transactions, diagnostics, bundled plugins, mobile layout, and native packaging. Replacing either side wholesale would discard required behavior or leave development-only paths that fail in packaged applications.

## Decision

The community Desktop consumes the upstream runtime packages and public APIs while retaining the Electron host, installer, data-home chooser, diagnostic workspace, download policy, candidate transaction manager, prebuilt Profile deployment, and responsive client shell. Repository consumers use asynchronous Agent creation, the current Session events, MCP v2 resources, and the current PTC and Workflow services.

Normal Profile boot distinguishes required and optional plugins on both sides of the page boundary. Required service, root configuration, mutation recovery, and lock failures enter Diagnostics. The browser boot audit keeps official `@deepseek-ai/*` entries required and records failed external package entries as optional warnings, so an optional plugin activation failure remains visible with its package and stage but does not hide an otherwise usable client. Desktop candidate operations are stricter than ordinary boot: the requested package version, Bundle registration, and activation must pass before commit, and a target failure restores the managed dependency files and seed marker. Market-owned commands continue to modify the active Profile under the ordinary write lock and retain their own result and restart confirmation flow.

The archived-session package owns the single Settings registration and uses the upstream Workspace restore operation while retaining grouped rows, title and id search, Workspace filtering, and individual and batch restore. New Desktop Profiles select the official terminal and disable Better Sidebar's duplicate terminal through its published configuration; imported and reused Profiles keep their existing setting. DeepSeek official session-event delivery remains enabled by default, is described in Models with the content categories it can include, and can be disabled through the settings service. Custom providers do not receive that extension.

Packaged Profile qualification installs the original published archives for all Desktop presets, signs native resources, relocates the sealed tree, runs Doctor, starts the normal Harness and client, and performs an offline plugin removal. Live user patch files use exact-path stat polling instead of directory-tree watchers, so a large pnpm Profile does not consume the packaged process's file-descriptor allowance.

## Alternatives considered

**Replace the community Desktop with the upstream shell.** Rejected because the upstream shell does not own the community installer, update sources, data-home identity, candidate rollback, diagnostic recovery, prebuilt Profile, or mobile layout.

**Keep the older runtime and copy selected alpha features.** Rejected because the Agent, Session, MCP, PTC, Workflow, and terminal changes form one runtime package graph; partial copying would create unsupported API combinations.

**Patch third-party presets for compatibility.** Rejected because Desktop ships original maintainer archives. An incompatible preset is updated to a published compatible version or removed from the new default set while existing user installations remain visible as optional-plugin failures.

**Treat every optional-plugin failure as a candidate failure.** Rejected because an unrelated optional plugin must not roll back a successfully validated target operation.

## Consequences

The source merge keeps community Desktop behavior while adopting the upstream runtime package graph and defaults. Packaged qualification now detects failures that a source build can miss, including Profile relocation and file-watcher pressure. Optional plugins no longer make every normal startup fatal, but Diagnostics still owns core and transaction failures. Candidate rollback protects only managed plugin state and never restores sessions, credentials, or business data. Release qualification still requires native installer evidence on each platform and a version-specific external-tool compatibility manifest before publication.
