# Agent Note: Optional workspace runtime ownership

Status: implemented

English | [中文](2026-09-19-optional-workspace-runtimes.zh.md)

## Problem

Desktop previously treated Python and Office dependencies as installation resources. That made every installer pay the platform payload cost, coupled Office skills to an eager private Desktop Host path, and offered no independent per-Profile choice for Python code execution. Reusing plugin installation for the replacement would expose arbitrary package coordinates to the renderer and mix executable runtime lifecycle with Profile package lifecycle.

## Decision

`OptionalRuntimeManager` is the deep Electron-main module for optional workspace runtimes. It alone resolves signed version/target metadata, downloads through the application network route, resumes partial files, verifies size and SHA-256, enforces the tar policy, extracts atomically, owns the shared `userData/optional-runtimes` cache, and records references for normalized Harness homes. Its renderer interface accepts the closed capabilities `office` and `ptc`; it never accepts a URL, path, executable, archive, or package coordinate.

The payload is released separately for Windows x64, macOS arm64/x64, and Linux x64. A versioned catalog is reconstructed from immutable Release bytes and attested by the master-only GitHub workflow. GitHub and CNB are mirrors of the same named bytes. Installers retain packaged Node, pnpm, the small `@deepseek-ai/dsh-host-workspace-runtime` adapter, and Office Skill assets, but contain no Python interpreter, wheel, or optional runtime archive.

Office and PTC own separate Profile blocks and share only the verified Python payload. Office mounts the adapter, which publishes `load_workspace_dependencies` and Office Skills using application-selected absolute paths. PTC directly mounts the experimental CPython runtime with the selected interpreter. PTC stays unavailable on Windows and requires an explicit risk acknowledgement on supported platforms.

Activation and removal enter the existing Desktop Profile startup transaction. The manager retains a pending reference until normal client and event-dispatch readiness commits the candidate. A failed candidate keeps the prior Profile and verified cache. Payload cleanup runs only after the last reference disappears; a failed cleanup remains pending and cannot silently re-enable an unreferenced payload. NAS exposes unavailable status because this decision does not extend the remote installation protocol.

## Alternatives considered

**Continue bundling Python.** Rejected because it permanently increases every platform installer and gives users no independent activation choice.

**Install Python through `PluginInstallRequest`.** Rejected because a runtime archive has different verification, cache sharing, resumability, and cleanup semantics. Treating it as a plugin would widen renderer authority and obscure ownership.

**Store one activation flag in Electron preferences.** Rejected because `DSH_HOME` switching would leak capability state between independent Profiles and make safe removal impossible.

**Commit state when the Profile files are first activated.** Rejected because the candidate can still fail before renderer readiness and be rolled back. Runtime state commits at the same proven-readiness boundary as the Profile transaction.

## Consequences

Desktop installers are smaller by the Python payload size, while the first user who enables Office or PTC must download a version-matched archive. A desktop upgrade can mark an older payload as needing update without destroying it before the new payload verifies. Release completion now includes four optional archives plus a signed catalog and CNB mirror refresh. Native Office smoke and macOS/Linux PTC smoke remain release-platform responsibilities; focused unit, composition, closure, and packaging-policy tests cannot replace them.
