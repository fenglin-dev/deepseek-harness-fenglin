# Agent Note: Issue 25 desktop recovery hardening

Status: implemented

English | [中文](2026-09-15-issue-25-desktop-recovery-hardening.zh.md)

## Problem

Issue 25 reported three independent failures: authority-bound authentication cookies accumulated as the local Web port changed and could make the Electron main-frame request exceed server header limits; a staged same-drive relative `link:` dependency resolved from the candidate depth and became invalid after activation moved `node_modules`; and a recovery-mode plugin mutation could leave its same-process candidate and Profile lease behind when validation or activation failed.

## Decision

Before each fresh startup-token exchange, Desktop removes only cookie names matching the exact BrowserAuth authority-cookie format from its own Electron session. Main-frame HTTP failures from the trusted loopback Harness origin are converted into a classified recovery failure, and retry performs the authenticated exchange again.

Before candidate activation changes active dependencies, external dependency symlinks are resolved and rewritten to stable absolute targets. Links contained entirely inside candidate `node_modules` remain untouched and move together. Missing targets fail before active state changes. This preserves literal local package specifications and does not convert them to registry packages.

Recovery inventory orders uniquely attributed plugins first. If a recovery-owned candidate fails checking or activation, Desktop rolls it back and releases its restore lease before returning the original error; rollback failure remains explicit and keeps recovery evidence.

Desktop allocates the candidate transaction UUID before invoking preparation. Failed preparation can therefore recover its own `preparing` journal even without CLI output. Recovery requires confirmed command-tree exit, matching transaction and producer identities, and no foreign live lock. CLI cleanup also matches the requested UUID, so a rejected preparation cannot settle another attempt owned by the same desktop. Desktop retains its selected candidate until rollback and lease release finish.

Dependency copying has a five-minute command deadline because a large existing Profile can exceed a one-minute deadline on a slow disk. The startup view identifies plugin preparation and logs its duration. A shared preparation failure defers remaining startup mutations instead of retrying the same copy per preset. Ordinary independent plugin failures keep their existing policy; mandatory first preparation still requires the complete preset set. Snapshot metadata capture does not copy the dependency tree.

## Alternatives considered

**Delete all Electron session data.** This also removes unrelated site state and treats a narrowly identifiable cookie leak as broad user-data corruption.

**Shorten cookie lifetime only.** This delays the header limit but does not bound rapid restart accumulation.

**Regenerate every dependency with pnpm after activation.** This adds network and build-script work after active state changes. Stabilizing only external links is bounded and preserves the already verified candidate.

**Disable removal for healthy plugins.** Recovery remains a general manual tool, so healthy entries stay removable; attribution-first ordering and an explicit warning reduce accidental removal without taking control away from the user.

**Delete journals on any timeout or remove large presets.** Neither proves ownership or worker termination. Retaining ambiguous state protects concurrent operations; reducing features hides rather than fixes the shared preparation failure. The longer finite deadline tolerates slow copying but does not claim faster disk throughput.

## Consequences

Old desktop authentication cookies no longer accumulate across random loopback ports, while unrelated cookies remain untouched. Same-drive local plugins survive the candidate-to-active depth change. A failed recovery attempt no longer blocks later plugin operations with a live self-owned `preparing` transaction. No third-party plugin source is modified.
