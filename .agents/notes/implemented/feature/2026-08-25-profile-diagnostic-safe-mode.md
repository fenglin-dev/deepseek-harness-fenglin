# Agent Note: Profile diagnostics and safe startup

Status: implemented

English | [中文](2026-08-25-profile-diagnostic-safe-mode.zh.md)

## Problem

Profile package installation and Cordis startup can fail at different layers, but plain subprocess text cannot reliably distinguish a transient registry failure from an unsafe build request, a user configuration error, or one defective external plugin. Treating every Loader error as a quarantine hides the cause, while retrying every pre-ready exit delays a deterministic failure and can prevent access to the diagnostics needed to recover it.

The system also needs to preserve two security properties during recovery: package lifecycle scripts require a precise user decision, and supply-chain waiting periods must not be lowered merely to make a repair complete.

## Decision

`dsh/profile-diagnostic/v2` is the shared incident format across the package-manager adapter, Profile repair, CLI boot, Cordis Loader audit, Host inventory, and desktop UI. A record separates product code from native error code, identifies the operation phase and responsible root, follows the original cause chain, declares only guarded actions, and stores bounded evidence after credentials and local paths are removed. Unclassified failures remain visible with their original evidence and an export-only action.

Automatic mutation is limited to state that can be proved stale or inactive: fallback links, stale lockfile importers, interrupted quarantine residue, orphaned bundle references, known obsolete Loader rows, and safe Host singleton relinks. Network, registry authentication, file locks, and minimum-release-age failures remain retryable environment incidents. External roots are isolated only after the failure is attributable and bounded repair cannot restore them. User credentials and patch documents are never cleared or rewritten by diagnostics.

A client module-table import failure carries enough identity to isolate without loading the broken plugin: the cause chain must contain the missing-supplier invariant, the outer error must name the Loader entry and module, and that module must be both a direct Profile dependency and an active external bundle. A server-side bare-module failure follows the complete cause chain to the deepest Loader import. It is automatically isolated only when the final entry id and module name exactly match one unique declaration from a directly enabled external Bundle, the module remains unresolved under the Loader's Profile anchor, and neither Profile nor home user patch targets that entry. This permits a scoped root package whose broken Bundle Patch names a nonexistent unscoped module to be quarantined immediately after installation as `loader-module-unresolvable`, while ambiguous or user-owned compositions remain untouched and enter safe mode. The framework-free browser kernel reports only the closed client failure shape through an authenticated Host Remote, keeps the loading page alive, and waits for the desktop supervisor. The CLI removes only the proven root, runs the packaged package manager, verifies package residue, orphaned bundles, and Host identity conflicts, then records its specifier and bundle position for retry. The supervisor restarts the normal Profile so the user enters the main page and sees the quarantine in Diagnostics; a failed proof restores the manifest and uses the installation-owned safe Profile instead.

Every `allowBuilds` change is a separate, exact-key operation. Failed package-manager output retains pnpm's exact registry package or Git artifact key. The UI displays the root source, key, and risk in a white modal with a red warning icon; the black confirmation button writes only that key and retries the original operation once. Cancellation changes no policy. Profile repair never sets `minimumReleaseAge=0` and never enables all builds.

Desktop startup opts into safe-mode recovery with `DSH_PROFILE_SAFE_MODE_ON_FAILURE=1`. A deterministic normal-Profile failure writes the incident and emits one stable stderr marker. The supervisor performs one immediate restart with `DSH_PROFILE_SAFE_MODE=1`; the CLI then composes only installation-owned template bundles and omits the Profile manifest, external bundles, and user patch layers. Bare imports start at the installation-maintained `$DSH_HOME/profiles/node_modules` fallback, whose source symlinks or packaged proxies contain only the installation dependency closure. Safe mode records what it skipped and exposes the normal diagnostics UI. Startup is bounded to one normal attempt and one safe-mode attempt. If safe mode itself fails, the supervisor stops immediately, retains the original incident as primary evidence, and appends the safe-mode failure as secondary evidence.

The Host inventory combines the durable incident with live failed or unresolved Loader entries and exposes exact approval, repair, isolation, restore, uninstall, and export operations through generated Remote methods. Uninstalling an inactive quarantine removes its stale lockfile importer and package residue, removes only that plugin from the retained repair and current diagnostic reports, then deletes the durable quarantine record; unrelated incidents survive. Preflight also detects an inactive, physically absent plugin whose durable quarantine was already deleted while those derived records remain, reports `profile.quarantine-removal-residue`, and safely converges the metadata without re-isolating the removed plugin. The browser displays only current incidents. The complete bilingual rule catalog lives in [`docs/profile-diagnostics.md`](../../../../docs/profile-diagnostics.md), while the export includes the machine-readable catalog and version, redacted incident, runtime facts, quarantine records, and Loader summary.

## Alternatives considered

**Keep parsing text only in the Diagnostics React component.** This would duplicate policy in an untrusted presentation layer, lose the original cause chain, and leave startup failures unavailable because the browser never mounts.

**Automatically approve Git `prepare` and known native packages.** This makes installation convenient but turns a package-manager safety decision into an invisible side effect. Exact confirmation is retained even when a previous installation attempt already exposed the needed key.

**Disable minimum release age during cleanup.** A process-local override can make an inactive dependency disappear, but it weakens the same supply-chain rule that reported the incident. Bounded direct cleanup of an already-deactivated root is safer than relaxing resolution policy.

**Always retry three times before recovery.** Deterministic Profile and configuration failures cannot improve across identical launches. The stable marker allows one immediate safe-mode attempt without consuming the ordinary retry budget.

**Boot the user's Profile with every external row disabled in place.** Parsing or composing that Profile can itself be the failure, and editing it before the UI starts risks data loss. An installation-owned composition avoids the damaged input and leaves it available for explicit repair.

## Consequences

Users can enter the application and inspect a failed external Profile without weakening package policy or deleting configuration. Support exports are useful without carrying secrets or absolute user paths, and diagnostics can distinguish a quarantined plugin from the reason it was quarantined.

The implementation maintains a second, deliberately minimal boot composition and a versioned incident file. New pnpm and Cordis failures require a classifier and focused fixture to receive a dedicated product code; until then they remain visible as `profile.unknown`. Safe mode provides diagnostics rather than ordinary third-party functionality, and a broken installation-owned template still requires the startup-failure page.

Focused coverage pins classification, cause attribution, redaction, exact build approval, release-age preservation, safe Profile composition, supervisor fallback, live Loader projection, Remote export, and Diagnostics presentation. Desktop launch verification additionally requires new Harness-log readiness markers, a served client URL, and a surviving Electron process.
