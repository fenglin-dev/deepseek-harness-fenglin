# Agent Note: Issue 25 desktop recovery hardening

Status: implemented

English | [中文](2026-09-15-issue-25-desktop-recovery-hardening.zh.md)

## Problem

Issue 25 reported three independent failures: authority-bound authentication cookies accumulated as the local Web port changed and could make the Electron main-frame request exceed server header limits; a staged same-drive relative `link:` dependency resolved from the candidate depth and became invalid after activation moved `node_modules`; and a failed plugin activation or recovery mutation could leave its same-process transaction and Profile lease behind when rollback did not settle.

## Decision

Before each fresh startup-token exchange, Desktop removes only cookie names matching the exact BrowserAuth authority-cookie format from its own Electron session. Main-frame HTTP failures from the trusted loopback Harness origin are converted into a classified recovery failure, and retry performs the authenticated exchange again.

Before candidate activation changes active dependencies, external dependency symlinks are resolved and rewritten to stable absolute targets. Links contained entirely inside candidate `node_modules` remain untouched and move together. Missing targets fail before active state changes. This preserves literal local package specifications and does not convert them to registry packages.

Recovery inventory orders uniquely attributed plugins first. If a recovery-owned candidate fails checking or activation, Desktop rolls it back and releases its restore lease before returning the original error; rollback failure remains explicit and keeps recovery evidence.

Before diagnostic removal prepares another candidate, the transaction manager settles any retained journal. It reclaims a live lease only when the current Desktop owns it and no worker remains, rolls back without resuming Harness, and releases the lease before removal continues. A foreign live owner or worker still blocks the mutation.

Desktop allocates the candidate transaction UUID before invoking preparation. Failed preparation can therefore recover its own `preparing` journal even without CLI output. Recovery requires confirmed command-tree exit, matching transaction and producer identities, and no foreign live lock. CLI cleanup also matches the requested UUID, so a rejected preparation cannot settle another attempt owned by the same desktop. Desktop retains its selected candidate until rollback and lease release finish.

Dependency copying has a five-minute command deadline because a large existing Profile can exceed a one-minute deadline on a slow disk. The startup view identifies plugin preparation and logs its duration. A shared preparation failure defers remaining startup mutations instead of retrying the same copy per preset. Ordinary independent plugin failures keep their existing policy; mandatory first preparation still requires the complete preset set. Snapshot metadata capture does not copy the dependency tree.

Community copies use the portable official-import boundary instead of cloning a possibly damaged plugin runtime. Supported user data and plugin business storage are copied, while Profile files, `node_modules`, the pnpm store, lockfiles, seed markers, and plugin code are excluded. The source Profile produces a restore plan and exact boolean build rules. First preparation uses verified packaged archives for matching presets; the existing imported-plugin flow handles remaining portable sources. A versioned setup marker identifies this behavior, so legacy complete copies without the marker retain their Profile. Candidate activation also removes only generated `.bin` links whose targets are missing; any other broken dependency link remains an error. When activation fails after its internal rollback succeeds, the transaction manager returns a distinct rolled-back error so Desktop does not attempt to discard the same transaction again. An incomplete rollback still retains the candidate identity and evidence.

## Alternatives considered

**Delete all Electron session data.** This also removes unrelated site state and treats a narrowly identifiable cookie leak as broad user-data corruption.

**Shorten cookie lifetime only.** This delays the header limit but does not bound rapid restart accumulation.

**Regenerate every dependency with pnpm after activation.** This adds network and build-script work after active state changes. Stabilizing only external links is bounded and preserves the already verified candidate.

**Clone the pnpm store while omitting only stale registrations.** This still imports a possibly inconsistent dependency graph and makes first-start success depend on historical package-manager state. A portable restore plan keeps user data while rebuilding plugin code through supported installation paths.

**Disable removal for healthy plugins.** Recovery remains a general manual tool, so healthy entries stay removable; attribution-first ordering and an explicit warning reduce accidental removal without taking control away from the user.

**Delete journals on any timeout or remove large presets.** Neither proves ownership or worker termination. Retaining ambiguous state protects concurrent operations; reducing features hides rather than fixes the shared preparation failure. The longer finite deadline tolerates slow copying but does not claim faster disk throughput.

## Consequences

Old desktop authentication cookies no longer accumulate across random loopback ports, while unrelated cookies remain untouched. Same-drive local plugins survive the candidate-to-active depth change. A failed activation or recovery attempt no longer blocks diagnostic removal with a live self-owned transaction, while another process's lease remains authoritative. No third-party plugin source is modified.
