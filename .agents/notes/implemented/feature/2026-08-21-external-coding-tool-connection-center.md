# Agent Note: External coding-tool connection center

Status: implemented

English | [中文](2026-08-21-external-coding-tool-connection-center.zh.md)

## Problem

Using a coding product as a Harness subagent requires two separate facts: its provider bundle must belong to the active Web profile, and a selected agent preset must enable the provider's tool row. Plugin inventory exposed the first fact while the agent-preset picker exposed the second only after someone already knew which preset to inspect. A successfully installed Codex provider could therefore remain practically undiscoverable, and treating every product name as installable would falsely imply provider support that the runtime does not have.

## Decision

Settings contains a root `external-tools` section beside the existing product sections. It presents one connection flow per coding product and derives state from two Host-owned snapshots in parallel: the live plugin inventory and Host connection settings. Codex and Claude Code are actionable because this release has official provider bundles for them. Their installation uses the exact published Provider versions validated with the application baseline; a completed install asks for a full restart because the running Loader tree is immutable. Provider coordinates are selected independently from the desktop version because an upstream source release does not guarantee a matching npm publication. Hermes and Trae remain disabled placeholders until an official provider bundle and tool row exist.

The packaging gate reads the same compatibility manifest as the embedded fallback and queries the canonical npm registry before any desktop artifact is built. It requires each Provider coordinate and reviewed SHA-512 to match, requires the Provider to depend on the reviewed native product runtime, and resolves every optional platform package to an exact published version with integrity metadata. The rolling remote copy is signed keylessly by the repository's dedicated GitHub Actions workflow. Desktop main accepts it only after Sigstore verifies the GitHub OIDC issuer and the exact repository/workflow/branch identity, and after the in-toto subject digest, schema, desktop version line, validity window, and closed tool set match. It atomically caches only verified documents. A failed or unavailable refresh tries the signed cache, then falls back to the installer-embedded exact pins; it never follows a dist-tag. The renderer submits only a closed tool id to this resolver and receives no path, command, or general package-resolution capability.

Connecting a supported product stores a Host setting independently from Session preset identity. `AgentPresets` owns the safe-boundary projection: the Host registers one product-specific projector, and each enabled `dsh-tool-subagent` instance is mounted in an eligible Agent's own scope. `standard`, `code`, and `cordis` participate; `minimal` remains unchanged. An idle Agent updates immediately, while an Agent already running retains its exact tool fibers until it returns to idle. The synchronous idle-to-running status transition reconciles again before prompt assembly, so a resumed historical Session receives current connections on its next turn without mutating an in-flight request.

The exact dynamic projection is logged as `external-tools/resolved` once per model-request step. A later disconnected step logs an empty list after any connected step. Model-visible tools are therefore reconstructable from the Session rather than inferred from mutable current settings, while retries of one step do not duplicate the record.

The browser never receives a filesystem path or composition document. A typed `pluginInventory` Remote accepts only the closed `codex` and `claude-code` ids and delegates preset ownership to `AgentPresets`. This keeps package installation, roster authoring, and UI presentation in their existing owners while giving the product a single discoverable entry point.

The manifest records the source version reviewed for its pins separately from the Provider version. Packaging rejects a stale source-review baseline or runtime mismatch rather than assuming an upstream merge also reviewed desktop compatibility; registry checks still reject unpublished coordinates. Desktop refreshes on each install request and shares only an in-flight lookup, so offline failures and successful responses do not freeze the selection for the application's lifetime. Signature, expiry, version-line and revision-rollback checks apply on every lookup. Tests cover a network recovery, a newer signed revision in the same process, and concurrent requests sharing one refresh.

The signed manifest and attestation are served together under the repository's GitHub Pages `metadata/external-tools/v1/` path. The same master-only workflow verifies npm coordinates and signs the manifest before uploading a metadata-only Pages artifact; a dependent job deploys it with Pages permission rather than repository-content write permission. The community repository's documentation workflow cannot deploy over this site. Publication does not create, update, or delete GitHub Releases. A legacy installer keeps its compiled Release URL until it is rebuilt; an unavailable endpoint uses the verified cache or embedded pins without accepting unsigned metadata.

## Alternatives considered

**Put connection buttons inside Agent presets.** Rejected because provider installation and Loader activation are profile deployment state, not preset authoring state. A disabled tool row cannot explain whether its provider is missing, still installing, or waiting for restart without importing the plugin-management capability into the roster UI.

**Copy or modify `standard`.** Rejected because either choice keeps connection state coupled to Session preset selection. A managed copy also drifts from later shipped-preset improvements and leaves existing historical Sessions unable to use a newly connected product.

**Recompose a running Session's whole preset.** Rejected because that changes prompt sections, skills, listeners, isolated services, and tools together. The requested behavior needs only a product tool at the next safe request boundary; replacing the full composition would strand prior capabilities and can interrupt active work.

**Offer generic package fields for Hermes and Trae.** Rejected because a product name does not establish a compatible `SubagentProvider`, tool row, package source, or protocol contract. Disabled placeholders communicate intended navigation without turning arbitrary package installation into a connection promise.

**Install the unversioned npm latest tag.** Rejected because dist-tags can lag or move independently from the desktop baseline. Provider protocol compatibility is part of the packaged application, so this entry point pins the matching release.

**Construct the Provider version from the desktop version.** Rejected because upstream can tag source without publishing every package at that version. The resulting exact request can be permanently unresolvable even though a reviewed compatible Provider publication exists.

**Require a desktop release for every Provider republish.** Rejected because a previously released client can remain compatible with a newly reviewed Provider coordinate. The signed rolling manifest updates that closed mapping without broadening the installer or trusting unsigned release assets.

**Commit a long-lived private signing key.** Rejected because repository access would also expose the compatibility signing authority. GitHub OIDC gives each publication a short-lived Fulcio certificate, while the client pins its issuer and workflow identity and checks Rekor-backed Sigstore verification.

**Publish compatibility documents as a rolling product Release.** Rejected because internal metadata appears among installer releases and a create-if-missing publisher recreates entries that maintainers remove. A dedicated Pages path separates metadata delivery from product releases without changing signature ownership or using the separately hosted product website.

## Consequences

Codex and Claude Code become visible before the user knows their package names or preset rows, and connection now means availability from the next turn of an existing or new complete-mode Session. Product-specific prompt hints disambiguate those tools from same-named shell executables, while the missing legacy `external-tools` preset id falls back to `standard` so old desktop sessions remain resumable. The closed Remote and one registered projector prevent the convenience UI from becoming an arbitrary preset editor or shell launcher. The generic roster does not depend on product tool packages; the desktop Host owns fixed provider/tool bindings. Adding another actionable product requires an official provider bundle, a closed Host id, an explicit eligible-mode decision, localized product copy, and focused tests across boundary projection, durable request logging, Remote registration, and Settings interaction.

## Verification

Preset tests pin eligible modes, independent settings, existing-session projection, legacy preset fallback, disconnect removal, minimal exclusion, duplicate-projector refusal, and one durable capability record per step. The real Web composition test boots the installed Codex bundle and asserts that `standard` receives both the `subagent_codex` schema and its model guidance. Host tests pin the typed Remote inventory, while client tests pin localized section registration, closed tool-id installation, supported actions, honest placeholders, and the Codex connection transition. Desktop tests cover manifest parsing, signed subject-digest matching, expiry and version-line rejection, cache ownership, and exact embedded fallback. The live registry gate verifies the two Providers, their native runtimes, every declared platform package, and reviewed SHA-512 values. Type checking covers the projector dependency graph, generated Remote graph, preload IPC, and desktop client assembly.

Desktop publication tests assert the static URLs, a Pages 404 falling back without a Release request, sign-before-upload ordering, least-privilege deployment, and exclusion of the competing documentation deploy. Native installation and live Pages deployment remain release qualification checks; local workflow assertions do not prove the remote site has been enabled or deployed.
