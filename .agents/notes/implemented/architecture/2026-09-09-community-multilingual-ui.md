# Agent Note: Community multilingual UI architecture

Status: implemented

English | [中文](2026-09-09-community-multilingual-ui.zh.md)

## Problem

The upstream Client deliberately ships Chinese and English while external language packs can add languages one namespace at a time. The community desktop had additional Electron-owned copy before the Client locale service was available, and the Russian contribution in PR #19 added correct feature dictionaries without a single owner for language availability, startup locale selection, or cross-platform fallback. Copying locale conditionals into menus, preload pages, and each feature would make later translations difficult to audit and would risk translating paths, package names, and user data.

## Decision

Open DSH Desktop publishes one stable community catalog in this order: `zh`, `en`, `ja`, `ko`, `es`, `fr`, `de`, `pt-BR`, and `ru`. `ui-desktop-shell` owns registration of the seven additional language definitions and their static per-locale dictionary bundles as one reversible Cordis effect. Feature packages remain the source of truth for Chinese and English; the community bundles mirror the complete current Client namespace surface without modifying upstream feature packages. A future missing key resolves through the registered language's English fallback instead of mixing partial literal conditions into presentation code.

Electron-owned pages use `desktop-locale.ts` for BCP 47 and underscore-tag normalization, dictionary selection, and named interpolation. The resolver never localizes paths, URLs, package identities, commands, or external error values. The first-run chooser builds its language options from the same catalog and provides complete copy for every offered language; its header lays variable-width controls in normal flow and wraps them when space is insufficient. The chooser shell stays bounded to the viewport, keeps its footer visible, and scrolls translated content inside the two content panes. Before Harness is ready, native menus and recovery pages use an atomic `userData/desktop-locale.json` cache of the last active Profile locale, falling back to the operating-system language and then English. Once the Client reports its active Profile locale, that value becomes authoritative and refreshes the cache.

The macOS application menu, Windows/Linux titlebar menus, and tray context menu all resolve copy from that same active locale. A language change refreshes both native menu surfaces immediately. The community bundle replaces the obsolete `sidebarTextpreview` surface with the current `sidebarDocumentPreview` and renderer namespaces, and mirrors the current official right-sidebar docking controls. This keeps file, Markdown, PDF, HTML, code, and image preview chrome translated without modifying the upstream sidebar packages.

Russian values that overlap `@ragnoryok1/dsh-client-locale-ru@0.1.1` reproduce that package's dictionary at commit `03907139127361cad255371442b37b264059ff23`; the community bundle adds Desktop-only namespaces and newer keys. Japanese overlap follows `@fang2hou/dsh-locale-ja@0.2.0` at commit `c354fd6456543c9d9b3b92fd97d8aa5559dd5525`. Both sources are MIT licensed and their notices ship with this package. Korean, Spanish, French, German, and Brazilian Portuguese cover the same current key surface. Each language lives in its own static module so one locale can be reviewed or replaced without rewriting the others.

## Verification

Locale tests pin stable ids, regional and underscore matching, English fallback, Unicode and Windows paths, unknown placeholders, malformed cache recovery, and atomic cache contents. Client lifecycle tests pin catalog registration, translated lookup across all seven community languages, and complete teardown. The bundled locale test requires identical namespace and key sets, identical placeholder sets, and no translation transport markers. A source comparison verifies all Russian overlap against the pinned external dictionary. A second source-surface comparison pins every community right-sidebar and document-preview namespace to the exact current upstream key set, so a newly introduced control cannot silently remain English. Native-menu and tray tests cover every advertised language plus the English fallback. The first-run chooser additionally checks every offered locale for complete non-empty copy and keeps long language and development labels in a wrapping header layout.

## Alternatives considered

**Make Russian a special built-in beside Chinese and English.** Rejected because every later language would require editing the core runtime and would turn a community translation into an upstream locale contract.

**Copy community dictionaries into every upstream feature package.** Rejected because it would spread community-only maintenance across the upstream merge surface. The desktop-owned bundle preserves namespace boundaries while keeping the derivative translations in one package.

**Translate missing strings at runtime.** Rejected because UI copy must remain deterministic, offline, reviewable, and free from a network or third-party translation dependency.

**Use only the operating-system locale before Harness starts.** Rejected because recovery and native menus would change language during startup when a Profile explicitly chose another locale; the minimal desktop cache keeps those surfaces consistent without writing Profile state.

## Consequences

- New language availability and translated coverage are added once to the community catalog; Chinese and English wording remains in the feature that owns its meaning.
- A translator can edit one locale module without changing LocaleRuntime or upstream feature packages.
- Every bundled locale covers the same current namespace and key surface; future source additions fall back to English until the bundle is updated.
- A Profile language controls both Client and native desktop chrome after readiness; startup and recovery remain consistent through the desktop-owned cache.
- The cache is presentation state only, contains no path or credential, and never overrides a ready Profile.
- Plural rules and bidirectional layout remain language-pack responsibilities; this change does not invent a string-based plural convention.
