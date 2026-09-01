# DeepSeek Harness Desktop

English | [中文](README.zh.md)

`@deepseek-ai/dsh-desktop` is the native application host for the existing DeepSeek Harness Web GUI. It starts one local Harness process, waits for its canonical readiness line, and loads that loopback origin in a hardened Electron window. Harness data keeps its ordinary format inside a desktop-owned home rather than sharing the official CLI's live `~/.dsh` tree.

## Run from this checkout

Use Node `^22.19.0 || >=24.0.0`, then build the repository before starting the desktop app:

```sh
pnpm install
pnpm run build
pnpm run dev:desktop
```

The desktop `dev` command watches the shell sources, rebuilds after a short debounce, and restarts Electron only after a successful build. A failed build leaves the current application running and the watcher retries after the next edit.

The app opens the same onboarding and settings surfaces as `dsh web`. Users can configure DeepSeek or another compatible API provider, choose models, inspect installed plugins, edit supported plugin settings, invoke Skills, select workspaces, and manage sessions without a second configuration store.

## Independent data home and import

Installed builds use the platform application-data root `open-deepseek-harness-desktop/dsh-home`; source runs use its `development/dsh-home` child. Their Electron preferences, browser session data, logs, extracted runtime, and Harness state are therefore separate from each other and from the official CLI. An explicit `DSH_HOME` remains authoritative for automation and advanced launches.

On the first ordinary launch, an existing official `~/.dsh` offers three choices before Harness starts: import supported user data into an independent home, directly reuse the official home, or start fresh. Import and fresh setup add a second destination step where the user can keep the desktop-managed default or choose an existing empty folder; direct reuse continues to use the recognized source itself. Electron issues an opaque, short-lived selection id for a custom destination, checks emptiness again after the final path confirmation, and never lets the renderer submit an arbitrary path. The chooser exposes an immediate Chinese/English switch while retaining operating-system language as its default. Import uses a symlink-rejecting allowlist for settings, credentials, sessions, workspace metadata, Agent presets, Skills, and connection state without changing the source; it excludes Profiles, `node_modules`, lockfiles, bundled-plugin markers, quarantine and health state, and the anonymous user id. It separately records the ordered intersection of Web Profile dependencies and bundles in `imported-plugin-restore.v1.json`, plus only boolean `allowBuilds` entries. After entry, a one-time dialog and the Plugins page let users select portable registry, npm-alias, and credential-free Git plugins for serial reinstallation through the existing CLI; local and credential-bearing sources remain disabled with a reason. Desktop presets settle first and matching restore entries are marked as provided. Exact build rules merge into the independent Profile with `false` taking precedence, while global security downgrades are ignored. A declared version range can resolve to a newer compatible release because the official lockfile is not copied. Import removes only the copied `ui-onboarding` acknowledgement so the independent desktop environment presents its own setup; every other supported setting remains. Reuse intentionally shares the official Profile, plugins, build approvals, and onboarding state, so changes from either application affect the same files. Every plugin lifecycle command receives the selected `DSH_HOME`.

After setup, General Settings can switch the active home between this build's independent directory, a recognized official `~/.dsh`, another recognized existing DSH directory, or an empty folder selected for a new configuration. The native directory picker validates the target again before Electron atomically records it and fully restarts the application. A newly selected empty folder follows the ordinary fresh-install boot, including Web Profile initialization and bundled-plugin seeding. Switching never copies, merges, moves, overwrites, or deletes data; each directory keeps its own sessions, settings, Profiles, and plugins. A launch-time explicit `DSH_HOME` disables this control because the launch environment remains authoritative.

Packaged releases carry pinned, integrity-checked archives for the six entries in `bundled-plugins/manifest.json`. Before a local package build, pnpm resolves each registry-backed entry through its `latest` stable dist-tag, downloads the tarball from the canonical npm registry, verifies registry SHA-512 metadata, and atomically replaces the snapshot; a fixed Git entry retains its reviewed commit and archive. GitHub packaging resolves this snapshot once and reuses the same files for every platform. Startup seeds all six entries, including Better Sidebar, before Harness starts, always giving pnpm the packaged local archive rather than resolving or downloading that plugin package from the registry; ordinary transitive dependencies remain governed by the Profile's pnpm store and resolution. Codex and Claude Code are not carried in any platform installer: clicking their install actions in External Tools downloads the exact official `@deepseek-ai/dsh-subagent-codex@0.1.2-alpha.1` or `@deepseek-ai/dsh-subagent-claude-code@0.1.2-alpha.1` package and its platform dependencies from npm, so that action requires a network connection. Development uses the checkout-pinned pnpm and packaged apps use the embedded pnpm; neither path depends on a system pnpm. Durable seed markers survive a later uninstall, so startup does not restore a removed plugin, while an explicit discovery or imported-plugin restore action can install it again. The desktop keeps its allowlisted deferred-install job and progress primitives for explicit restore flows, but Better Sidebar no longer starts an automatic post-entry job. Packaging never copies plugins from the developer machine's Web profile.

Development and package scripts invoke the Desktop and Web apps from their owning directories. Every Unix package command passes an explicit platform and architecture to the runtime and Codex preparation steps, keeping macOS Apple Silicon, macOS Intel, Linux x64, and Windows x64 staging independent.

## Optional terminal command

Packaged Windows and macOS builds can register a desktop-owned `dsh` command without exposing the private npm or pnpm runtime. Windows presents an unchecked current-user PATH option in the installer and the same install, repair, and removal controls in General Settings; silent installation enables it only with `/ADDCLI=1`. macOS manages an exact marked block in `.zprofile` or `.bash_profile` from General Settings and keeps a one-time backup before the first edit. Unknown shells receive manual guidance instead of an automatic profile change.

The launcher always uses the app's embedded Node, Harness, and pnpm paths. It reads `data-home-setup.json` on every invocation, so imported and fresh environments follow the independent home confirmed during setup, including an optional custom empty-folder destination, while reuse mode follows the selected official or existing DSH home. Before first-run setup, with a damaged setup file, or after an incomplete runtime install, the command fails with a repair instruction instead of silently creating another environment. Existing non-desktop `dsh` commands are reported as conflicts and are shadowed only after explicit confirmation. Uninstall removes only the exact PATH entry or marked shell block owned by this application.

## Desktop packages

Build the ad-hoc-signed, unnotarized macOS packages on a matching Mac with:

```sh
npm run package:desktop:macos:arm64
npm run package:desktop:macos:x64
```

Artifacts are written to `.artifacts/desktop-macos/`. Each package embeds the target's Harness production closure, Node 24.11.1, and pnpm 11.7.0 in one runtime archive. Preparation accepts the pinned Node archive only after its official SHA-256 matches. On first launch, the app extracts the archive into its versioned user-data directory so Node ESM sees a real `node_modules` hierarchy. The embedded Node starts Harness, and the plugin manager receives the embedded pnpm by absolute path; the runtime `bin` directory leads plugin lifecycle-script `PATH`. A layout marker invalidates caches produced by incomplete packages.

Build the unsigned Windows x64 NSIS installer on Windows with:

```sh
npm run package:desktop:win:x64
```

The installer is written to `.artifacts/desktop-windows/DeepSeek-Harness-windows-x64.exe`. It carries the official Windows x64 Node 24.11.1 executable, pnpm 11.7.0, and a symlink-free production Harness closure with its real `node_modules` hierarchy, so a user does not need Node or pnpm on `PATH`. The Harness environment puts the embedded runtime first, guarantees `%SystemRoot%`, `System32`, Wbem, and Windows PowerShell, then preserves the user PATH inherited when Electron started. Plugins can therefore spawn Windows system executables and inherited third-party commands by bare name. A third-party tool remains unavailable when it is absent from that inherited PATH; changing the registry PATH or installing a command while the desktop is running requires an application restart, and the desktop does not evaluate PowerShell profiles to discover extra commands. Preparation verifies the official Node archive SHA-256, required Windows native modules, the embedded pnpm version, and a real Harness readiness launch before Electron Builder runs.

Build the Linux x64 packages on Linux with:

```sh
npm run package:desktop:linux:x64
```

The DEB and RPM files are written to `.artifacts/desktop-linux/`. Like macOS, they carry a target-native Node, pnpm, and production Harness runtime archive. The `Desktop packages` workflow builds all four native jobs, uploads the five installer variants, and produces `SHA256SUMS`. Manual runs remain artifact-only unless publication is explicitly requested from a `dsh-v*` tag; a tag push creates or updates the matching GitHub Release with fixed platform filenames.

## Process lifecycle

The Electron main process starts `node apps/cli/lib/bin.js web --host 127.0.0.1 --port 0` directly, without a shell. Every packaged platform uses its embedded target-native Node rather than Electron or a user-installed executable. The host treats only `dsh web: http://127.0.0.1:<port>` as readiness, appends stdout and stderr to Electron's platform log directory, and sends `SIGTERM` before a bounded `SIGKILL` during application shutdown. Closing the window hides it to the system tray by default; a preference can make close request a full quit, and every explicit quit waits for Harness teardown. During startup, one determinate bar advances only from real desktop, runtime, Profile compatibility, bundled-plugin, and Harness milestones; it names the current operation and plugin, reaches 100% at readiness, and then hands the window to the Web GUI. The data-home chooser follows the system appearance before a Harness home exists; after selection, the stored `ui-theme.preference` controls the loading page, native frame, custom title bar, onboarding, and Web client through one `system`/`light`/`dark` source that continues updating when the user changes themes. Three consecutive exits before readiness stop automatic restarts and display retry and log actions. A still-connecting page exposes the same fixed log after fifteen seconds without declaring failure.

The tray can restore the window, reveal the Harness log, toggle notifications, enable packaged macOS login launch, or quit. Crash, terminal startup failure, and recovery notifications are optional and throttled. Desktop preferences are stored atomically under the repository-named Electron `userData`; invalid fields fall back independently to safe defaults.

Set `DSH_DESKTOP_DSH_BIN` to test another built `dsh` launcher. Set `DSH_DESKTOP_NODE_BIN` when `node` is not available through the environment inherited by Electron.

## Official source updates

A confirmed upgrade fast-forwards the checkout, runs `pnpm install --frozen-lockfile`, and runs the complete repository build through the Node executable selected for the desktop Harness. Dependency and build children receive an environment with credential-bearing variable names removed. A failed preparation resets the checkout to the prior commit and prepares that version again. The result reports an incomplete rollback instead of presenting the old build as healthy when restoration fails. Successful updates require an application restart, offered by the same settings card.

Set `DSH_DESKTOP_SOURCE_ROOT` only when testing a different trusted checkout. The updater never runs for a packaged application without a Git checkout; signed release metadata and installer rollback remain prerequisites for packaged automatic updates.

## Packaged Release discovery

Packaged applications check Releases from `https://github.com/flaqai/open-deepseek-harness-desktop` after startup and on explicit request. They recognize community `odsh-v*`, legacy `dsh-v*`, and plain `v*` tags. Stable clients ignore semantic prereleases even when GitHub metadata is wrong; a prerelease client accepts any higher prerelease or stable version. A Release request fails with a visible error after fifteen seconds instead of leaving Settings in a checking state. An available version appears as the sole action above Settings and in General Settings; other plugin-provided footer shortcuts stay hidden in the desktop host. Supported packaged macOS and Windows clients can download and verify the selected installer, while other targets open the repository-validated Release page in the system browser.

## Security

The renderer has `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`. Navigation is limited to the Harness process's exact loopback origin. New HTTPS windows open in the system browser; every other new window is denied. Renderer permission requests are denied except for sanitized clipboard writes initiated by the main frame at the supervised Harness origin; clipboard reads and every other permission remain denied. The shared client therefore uses the standard Web Clipboard API without exposing a generic privileged Electron bridge.

API keys remain owned by the Harness credentials service. The optional first-run import copies the credentials document as opaque user data into the independent home; it does not parse, display, log, or remove the source. Direct reuse is an explicit choice to let the desktop use the official credentials service in place. The sandboxed preload exposes typed source-update calls in source runs plus desktop capabilities, preference updates, fixed-log reveal, Release discovery, an exact allowlist for packaged archives, and opaque ids from the desktop-owned imported-plugin restore list. Electron resolves restore specs from its validated file; the renderer cannot submit a package spec, command, or path through that bridge. Other arbitrary package names continue through the guarded Harness plugin service. Release URLs are restricted to this repository and the renderer cannot provide a filesystem path. On Windows and Linux the preload also renders the desktop-owned title bar and sends its fixed minimize, maximize or restore, and close intents directly to the main process. It exposes no generic command, filesystem, URL-opening, or download method.

Profile plugins are trusted executable code. The embedded package runtime makes their pnpm lifecycle scripts deterministic, but it does not sandbox or endorse code installed from a registry, Git repository, tarball, or local checkout.

<a id="cross-platform-release-matrix"></a>

## Cross-platform release matrix

The source host uses only Electron and Node process APIs that are shared by macOS, Windows, and Linux. macOS retains its native title bar and traffic lights. Windows and Linux use a frameless BrowserWindow whose renderer owns only a draggable 36 px title bar and the minimize, maximize or restore, and close controls. A separate `WebContentsView` loads the startup page, Harness, and every plugin at `y = 36`, so its viewport excludes desktop chrome and full-viewport Web content cannot render beneath the window controls. The package workflow builds this matrix on matching native runners:

| Platform | Native runner | Artifacts |
| --- | --- | --- |
| macOS arm64 | `macos-15` | DMG and ZIP |
| macOS x64 | `macos-15-intel` | DMG and ZIP |
| Windows x64 | `windows-2025` | NSIS EXE |
| Linux x64 | `ubuntu-24.04` | DEB and RPM |

The Windows job silently installs its final NSIS artifact into a path containing spaces and Chinese characters, verifies the installed runtime, launches the installed application with isolated app data, and requires Harness readiness, all six startup dependencies and bundle entries, the profile lockfile, and their durable seed markers before uploading the artifact. Better Sidebar must already be installed before Harness becomes ready, while Codex and Claude Code must remain absent before user action. Native installation, first launch, shutdown, child cleanup, directory selection, file opening, PTY, and sandbox behavior remain release validation requirements for the other platforms. Signed update metadata waits for release signing and rollback support.

Do not package the checkout by copying all workspace sources into Electron. The release artifact must contain the published runtime closure, generated third-party notices, and no development credentials.

## Extension direction

Desktop-specific behavior remains outside the agent loop. Plugin and Skill management continue through Harness services and the existing settings UI. Remote control should enter through a transport plugin that maps an authenticated IM conversation to durable Harness session input and sends approval or question responses back through the interaction services. WeChat, Discord, and Slack adapters should be separate provider plugins over that common transport service, with explicit identity mapping, authorization, audit events, rate limits, and revocation.

The next desktop milestones are signed installers, native notifications for approval requests, a tray status surface, deep links, and an authenticated local control endpoint. Embedded browsers, Git panels, terminals, and plugin marketplaces should be added only as client plugins backed by owned Harness services, not Electron-only state.

## Limitations

- The current source run requires a built repository and a compatible Node executable.
- The macOS arm64 and x64 DMG and ZIP packages use ad-hoc signing and are not notarized; Gatekeeper requires explicit user approval on first launch.
- The Windows x64 installer is unsigned, and the Linux x64 packages are not repository-signed; users must verify `SHA256SUMS` and the release source.
- Developer ID signing, notarization, packaged automatic installation, Windows/Linux login launch, deep links, and IM control are not implemented. The source updater accepts only a clean fast-forward from official `master`; local divergence stays a manual Git operation.
- The Windows package job verifies installation and Harness readiness on its build runner. macOS and Linux package jobs still prove native assembly only and require installation and runtime validation.
