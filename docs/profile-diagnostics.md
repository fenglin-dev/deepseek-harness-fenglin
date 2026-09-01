# pnpm and Cordis Profile diagnostics

English | [中文](profile-diagnostics.zh.md)

This reference defines the problems represented by `dsh/profile-diagnostic/v2`, the evidence retained for each problem, and the actions that the desktop client may offer. The Diagnostics page shows only current incidents; this document is the complete rule catalog and is included by reference in exported diagnostic reports.

## Diagnostic record

Every issue has a stable product code, the original pnpm or Node code when one exists, a source subsystem, an operation phase, severity, client-safe attribution, permitted actions, and bounded evidence. Phases are `preflight`, `install`, `resolve`, `compose`, `import`, `apply`, `activate`, `runtime`, and `repair`. Sources are `pnpm`, `profile`, `loader`, `cordis`, `runtime`, and `config`.

Attribution may identify a direct Profile dependency, its dependency chain, a Loader entry id, a module name, or a configuration kind. It never contains an absolute local path. Evidence follows the complete JavaScript `cause` chain, is limited to 8 KiB per item, and redacts Harness-home paths, user-home paths, API keys, tokens, passwords, cookies, authorization values, and DeepSeek-style secret keys. The engine keeps an unrecognized native code and evidence under `profile.unknown` rather than inventing a repair.

## Action policy

| Policy | Eligible problems | Behavior |
|---|---|---|
| Automatic repair | Stale fallback links or junctions, inactive lockfile importers, interrupted quarantine residue, orphaned bundle references, known obsolete Loader rows, and verifiable Host singleton relinks | Back up or retain the durable incident, make the bounded change, and inspect again before reporting success |
| Explicit approval | Every change to pnpm `allowBuilds` | Show the root plugin, exact package or Git artifact key, script reason, and risk; approve only that key and retry once |
| Retry without isolation | Network failures, registry failures, 401/403, minimum-release-age rejection, and temporary file locks | Preserve the plugin and supply-chain settings; do not quarantine unrelated roots |
| Isolation | A failure attributable to one external root after safe convergence or retry cannot repair import, apply, activation, or Host identity | Remove the root from the active dependency and bundle composition, retain its specifier and bundle position, and expose restore or uninstall actions |
| Manual repair | User credentials, Profile YAML/JSON, unknown patches, and ambiguous duplicate registrations | Preserve the file, identify the field or entry when possible, and offer configuration access and export; never clear or rewrite the file silently |

The product never sets `dangerouslyAllowAllBuilds`, never lowers `minimumReleaseAge` to complete a repair, and never treats registry authentication or network failure as proof that a plugin is defective. Installation-owned bundles may carry reviewed build policy in their signed manifest; user Profile changes still require an explicit exact-key approval.

## Rules observed in real incidents

| Product code | Native code or evidence | Meaning and default action |
|---|---|---|
| `pnpm.build-script-blocked` | `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`, `ERR_PNPM_IGNORED_BUILDS`, `prepare`, `allowBuilds` | A dependency wants to execute lifecycle code. Retain the exact key, require confirmation, then retry the original operation once; cancellation leaves the plugin inactive or quarantined. |
| `pnpm.minimum-release-age` | `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`, `ERR_PNPM_NO_MATURE_MATCHING_VERSION`, `ERR_PNPM_MISSING_TIME` | The supply-chain waiting period rejected one or more versions. Show package and version evidence, retain the protection, and retry later. |
| `pnpm.unexpected-store` | `ERR_PNPM_UNEXPECTED_STORE`, `ERR_PNPM_UNEXPECTED_VIRTUAL_STORE`, `ERR_PNPM_STORE_BREAKING_CHANGE` | The Profile was installed by a different pnpm store or virtual-store format. Use the product's pnpm 11.7.0 runtime to rebuild only the affected Profile dependency directory. |
| `pnpm.network` | `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `EAI_AGAIN`, socket or registry-mirror failure | Treat as an environment failure. Retry and, when necessary, repair only the Profile-scoped registry configuration. |
| `pnpm.registry-auth` | `ERR_PNPM_FETCH_401`, `ERR_PNPM_FETCH_403`, registry 401/403 | Preserve the plugin and request correct registry credentials or scope configuration. |
| `profile.host-dependency-conflict` | A Profile root resolves an identity-sensitive Host package to another physical copy | Show the complete chain. Relink only when ranges and installed identity prove convergence safe; otherwise isolate the responsible root. |
| `profile.orphaned-bundle` | A package remains in `dsh.profile.bundles` without a manageable dependency | Remove the stale bundle reference without reinstalling a plugin the user removed. |
| `profile.quarantine-removal-residue` | An inactive plugin, its active manifest entries, and its durable quarantine record are gone, but a repair report, diagnostic report, lockfile importer, or incomplete package directory still references it | Remove only the stale derived state. Do not reinstall or quarantine the absent plugin; keep unrelated incidents intact. |
| `profile.module-resolution` | `failed to import loader entry`, `ERR_MODULE_NOT_FOUND`, `missed the module table`, a non-materialized module, or a missing package factory | Walk the complete cause chain and attribute the deepest Loader entry. When a final entry exactly matches one unique directly enabled external Bundle declaration but its bare module cannot resolve, quarantine that root immediately after installation as `loader-module-unresolvable`; user-modified or ambiguous rows enter diagnostic safe mode without automatic removal. |
| `loader.duplicate-entry` and `loader.duplicate-registration` | Duplicate Loader id, configuration path, persona, route, prompt section, service, or process-global singleton | Remove a known obsolete row when identity proves it stale; otherwise name both sides and isolate the external root or require manual configuration repair. |
| `loader.lifecycle-failed` | `failed to apply loader entry`, import, mount, apply, activation, or fiber failure | Walk to the innermost cause, attribute the entry and module, and isolate only after retry or convergence cannot repair the owning external root. |
| `config.credentials-invalid` | `.credentials.yaml` parse or field type error, including a non-string `version` | Report the field path and expected type. Keep the user's credentials document unchanged and enter diagnostic safe mode when it blocks startup. |
| `runtime.launch-invalid` | Missing built-in pnpm or Node, invalid `DSH_PNPM_BIN`, wrong runtime path, or pre-ready Harness exit | Validate the structured executable and argument vector. Paths containing spaces or non-ASCII characters never pass through a concatenated shell command. |

## Preventive pnpm rules

| Product code | Covered pnpm rules |
|---|---|
| `pnpm.lockfile` | Outdated lockfile, missing dependency, incompatible lockfile format, and missing importer manifest |
| `pnpm.integrity` | Tarball integrity or size mismatch, modified store content, and unexpected package content |
| `pnpm.patch-failed` | Patch application failure or invalid patch target |
| `pnpm.version-resolution` | No matching version, no matching workspace version, and release-channel mismatch |
| `pnpm.runtime-version` | Unsupported Node engine, invalid Node version, incompatible modules layout, and virtual-store mismatch |
| `pnpm.peer-dependency` | Peer dependency issues, unsafe peer diamond, and `dedupePeerDependents` convergence failure |
| `pnpm.supply-chain` | Trust downgrade, missing publication time, invalid convergence override, and forbidden transitive Git or path dependency |
| `pnpm.invalid-dependency` | Invalid package name and dependency specifier unsupported by every resolver |
| `pnpm.config-parse` | Invalid `pnpm-workspace.yaml`, `package.json`, JSON, or JSON5 configuration |

The classifier follows pnpm's public [error codes](https://pnpm.io/errors), [dependency resolution](https://pnpm.io/settings/dependency-resolution), [build-script security](https://pnpm.io/settings/build), and [peer dependency](https://pnpm.io/settings/peer-dependencies) contracts. Multiple pnpm releases can phrase the same rule differently, so the product code is stable while `nativeCode` and redacted evidence retain the original fact.

## Preventive Profile and Cordis rules

| Product code | Covered Profile and Loader rules |
|---|---|
| `profile.bundle-invalid` | Bundle package missing `dsh.bundle.patch`, invalid bundle patch declaration, or dependency that is not a valid bundle |
| `profile.module-resolution` | Relative module escaping its allowed base, bare module unresolved from the installation/Profile anchors, a client request absent from the module table, or an enabled module that never received a Fiber |
| `profile.patch-invalid` | Missing patch target, empty patch document, invalid top-level type, failed `!!js` interpolation, or malformed Profile/home patch |
| `loader.unresolved-injection` | Required service remains unavailable and a Fiber stays pending after settlement |
| `loader.rollback-failed` | Loader update, remove, move, HMR, or transactional rollback failure |
| `loader.duplicate-registration` | Process-global service, route, prompt section, persona, configuration path, or singleton plugin registered twice |

Profile parsing errors identify `profile-manifest`, `workspace`, `lockfile`, `profile-patch`, `home-patch`, or `credentials` when the caller can prove the file role. Unknown user files are preserved and never normalized speculatively.

## Diagnostic safe mode

Desktop launches set the opt-in policy that permits guarded recovery. A client module-table import failure is first matched to its Loader entry and exact direct external bundle. Because this failure happens after the Host is ready but before the client plugin tree exists, the framework-free browser kernel calls one authenticated, closed recovery Remote and keeps the loading page visible. When the Host re-validates the attribution, active manifest entry, package removal, and resulting graph, the CLI retains a retryable quarantine record and the supervisor restarts the normal Profile without that bundle. The user then enters the main application normally and finds the isolated plugin and its root cause in Diagnostics. Permanently uninstalling that inactive plugin also removes its stale lockfile importer and package residue, reconciles its repair and diagnostic records without discarding other incidents, and deletes the quarantine record last. A legacy or interrupted removal that deleted the plugin and quarantine record but left those derived references is reported as `profile.quarantine-removal-residue`; startup repair and the Diagnostics action remove only the stale metadata instead of quarantining the absent plugin again. Every other deterministic Profile, Loader, Cordis, credentials, or runtime-configuration incident writes the redacted v2 incident and emits one stable eligibility marker. The supervisor then performs one immediate restart with the installation-owned diagnostic Profile; that Profile loads only shipped template bundles and skips external bundles and user patch layers.

Safe mode records its entry time, skipped bundle names, and whether user layers were skipped. Its bare-module anchor is the installation-maintained `$DSH_HOME/profiles/node_modules` fallback rather than the active Profile or CLI package. The main Diagnostics page remains available and presents the root issue, evidence, risk, and guarded actions. A successful repair restarts the normal Profile. Startup performs at most one normal attempt and one safe-mode attempt. If the installation-owned Profile also fails, the supervisor stops immediately, keeps the original Profile incident as primary evidence, and appends the safe-mode failure as secondary evidence.

## Export

`dsh/profile-diagnostic-export/v1` contains the v2 issues, complete machine-readable rule catalog and version, platform, architecture, Node version, selected Profile name, safe-mode summary, quarantine records, and the current Loader entry summary. It excludes credential bodies, environment values, full diffs, absolute user paths, package-manager command interpolation, and unbounded stacks. The current export is a point-in-time support artifact, not a configuration backup and not an authorization token.
