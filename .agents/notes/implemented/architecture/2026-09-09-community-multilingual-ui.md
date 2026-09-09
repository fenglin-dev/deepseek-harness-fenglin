# Agent Note: Community multilingual UI architecture

Status: implemented

English | [中文](2026-09-09-community-multilingual-ui.zh.md)

## Problem

The upstream Client deliberately ships Chinese and English while external language packs can add languages one namespace at a time. The community desktop had additional Electron-owned copy before the Client locale service was available, and the Russian contribution in PR #19 added correct feature dictionaries without a single owner for language availability, startup locale selection, or cross-platform fallback. Copying locale conditionals into menus, preload pages, and each feature would make later translations difficult to audit and would risk translating paths, package names, and user data.

## Decision

Open DSH Desktop publishes one stable community catalog in this order: `zh`, `en`, `ja`, `ko`, `es`, `fr`, `de`, `pt-BR`, and `ru`. `ui-desktop-shell` owns registration of the seven additional language definitions as one reversible Cordis effect. Feature packages continue to own their namespace dictionaries; a typed multi-dictionary registration must include both built-in dictionaries and may include any number of additional complete dictionaries. Missing keys or missing feature dictionaries resolve through the registered language's English fallback instead of mixing partial literal conditions into presentation code.

Electron-owned pages use `desktop-locale.ts` for BCP 47 and underscore-tag normalization, dictionary selection, and named interpolation. The resolver never localizes paths, URLs, package identities, commands, or external error values. The first-run chooser builds its language options from the same catalog and provides complete copy for every offered language; its header lays variable-width controls in normal flow and wraps them when space is insufficient. The chooser shell stays bounded to the viewport, keeps its footer visible, and scrolls translated content inside the two content panes. Before Harness is ready, native menus and recovery pages use an atomic `userData/desktop-locale.json` cache of the last active Profile locale, falling back to the operating-system language and then English. Once the Client reports its active Profile locale, that value becomes authoritative and refreshes the cache.

The Russian dictionaries supplied by PR #19 remain the source for Desktop Shell, Open in App, Selection Actions, and native menu wording. The other community languages may be translated namespace by namespace; selecting one before a feature dictionary exists is supported and deliberately renders that feature in English. This makes incomplete translation coverage visible and safe without blocking a release or creating a second global monolithic dictionary.

## Verification

Locale tests pin stable ids, regional and underscore matching, English fallback, Unicode and Windows paths, unknown placeholders, malformed cache recovery, and atomic cache contents. Client lifecycle tests pin catalog registration and complete teardown. Feature tests require every shipped dictionary to have the English key set and identical placeholder sets. The first-run chooser additionally checks every offered locale for complete non-empty copy and keeps long language and development labels in a wrapping header layout. Strict TypeScript compilation checks additional dictionaries against each feature's `LocaleNamespaceMap` key union.

## Alternatives considered

**Make Russian a special built-in beside Chinese and English.** Rejected because every later language would require editing the core runtime and would turn a community translation into an upstream locale contract.

**Keep one global dictionary for the whole desktop and Client.** Rejected because it separates copy from the feature that defines its meaning, weakens typed namespace ownership, and makes independent translation contributions conflict with one another.

**Use only the operating-system locale before Harness starts.** Rejected because recovery and native menus would change language during startup when a Profile explicitly chose another locale; the minimal desktop cache keeps those surfaces consistent without writing Profile state.

## Consequences

- New language availability is added once to the community catalog; new wording remains in the feature that owns its meaning.
- A translator can submit one complete namespace at a time without editing LocaleRuntime or unrelated components.
- A Profile language controls both Client and native desktop chrome after readiness; startup and recovery remain consistent through the desktop-owned cache.
- The cache is presentation state only, contains no path or credential, and never overrides a ready Profile.
- Plural rules and bidirectional layout remain language-pack responsibilities; this change does not invent a string-based plural convention.
