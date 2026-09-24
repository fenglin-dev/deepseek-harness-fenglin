# Agent Note: Optional workspace runtime ownership

Status: implemented

English | [中文](2026-09-19-optional-workspace-runtimes.zh.md)

## Problem

Desktop previously treated Python and Office dependencies as installation resources. That made every installer pay the platform payload cost, coupled Office skills to an eager private Desktop Host path, and offered no independent per-Profile choice for Python code execution. Reusing plugin installation for the replacement would expose arbitrary package coordinates to the renderer and mix executable runtime lifecycle with Profile package lifecycle.

## Decision

`OptionalRuntimeManager` is the deep Electron-main module for optional workspace runtimes. It alone resolves signed version/target metadata, downloads through the application network route, resumes partial files, verifies the declared size, enforces the tar policy, extracts atomically, owns the shared `userData/optional-runtimes` cache, and records references for normalized Harness homes. Managed Python archives require SHA-256; official npm Office engines require npm SHA-512 integrity, package name, and version before staging. Its capability interface remains closed to `office` and `ptc`. A trusted native chooser can select a local interpreter; renderer code never supplies a URL, executable path, archive, or package coordinate.

Managed Python payloads are released for Windows x64, macOS arm64/x64, and Linux x64 in the dedicated `hecoococ/open-dsh-runtime-assets` repository. A versioned catalog is reconstructed from those immutable Release bytes plus immutable official `@deepseek-ai/libreoffice-kit-*` npm tarballs, then attested by the master-only Desktop workflow. Desktop Releases and their CNB mirrors carry only the signed catalog, not either runtime payload. Installers retain packaged Node, pnpm, the small `@deepseek-ai/dsh-host-workspace-runtime` adapter, the LibreOffice kit API, and Office Skill assets, but contain no Python interpreter, wheel, LibreOffice engine package, or optional runtime archive. Packaging removes every `@deepseek-ai/libreoffice-kit-*` engine from the Harness closure and rejects any residue. Desktop stages the verified target Office package under its private runtime `node_modules` and exposes it only to Profiles that enabled Office.

Python selection, Office, and PTC are independent states. `PythonEnvironment` resolves symlinks, accepts CPython 3.10+, verifies pip, records architecture and site-packages, and plans exact Office distribution changes. Add-only plans can proceed; changing an installed version requires explicit confirmation and uses that interpreter's `python -m pip`, inheriting its pip configuration. Office mounts the adapter and Office Skills only after dependencies match. PTC mounts the selected interpreter, stays unavailable on Windows, and requires a separate risk acknowledgement.

Activation and removal enter the existing Desktop Profile startup transaction. The manager retains a pending reference until normal client and event-dispatch readiness commits the candidate. A failed candidate keeps the prior Profile and verified cache. Payload cleanup runs only after the last reference disappears; a failed cleanup remains pending and cannot silently re-enable an unreferenced payload. NAS exposes unavailable status because this decision does not extend the remote installation protocol.

## Alternatives considered

**Continue bundling Python.** Rejected because it permanently increases every platform installer and gives users no independent activation choice.

**Install Python through `PluginInstallRequest`.** Rejected because a runtime archive has different verification, cache sharing, resumability, and cleanup semantics. Treating it as a plugin would widen renderer authority and obscure ownership.

**Store one activation flag in Electron preferences.** Rejected because `DSH_HOME` switching would leak capability state between independent Profiles and make safe removal impossible.

**Commit state when the Profile files are first activated.** Rejected because the candidate can still fail before renderer readiness and be rolled back. Runtime state commits at the same proven-readiness boundary as the Profile transaction.

## Consequences

Desktop installers omit both the Python payload and LibreOffice engine, while the first user who enables Office or PTC must download the matching optional payloads. A desktop upgrade can mark an older payload as needing update without destroying it before the new payload verifies. Release completion includes four Python archives in the runtime-assets repository, availability of the four pinned official npm Office packages, a signed Desktop catalog, and a CNB metadata mirror refresh. Native Office smoke and macOS/Linux PTC smoke remain release-platform responsibilities; focused unit, composition, closure, and packaging-policy tests cannot replace them.
