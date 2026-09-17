# Agent Note: Encapsulate Desktop Profile mutations behind one interface

Status: implemented

English | [中文](2026-09-17-desktop-profile-mutation-module.zh.md)

## Problem

Desktop Profile mutation behavior was spread across the Electron entry point, candidate preparation, transaction activation, recovery staging, Harness lifecycle events, and snapshot safety. The entry point had to coordinate temporary homes, process environment changes, readiness gates, rollback, and recovery state directly, which made mutation callers depend on internal transaction mechanics and made behavior-preserving changes difficult to review.

## Decision

The Desktop owns a single `DesktopProfileMutation` interface for candidate-backed Profile changes. Callers describe an operation, expected packages, and a callback that receives an ephemeral Profile home plus a closed set of supported write commands. The module coordinates candidate preparation, activation, Harness readiness, rollback, recovery candidates, and snapshot safety while returning typed errors for busy, cancelled, rolled-back, recovery-required, and external-writer-timeout outcomes.

The existing Profile CLI remains the persistence and locking authority. `ProfileTransactionManager` and candidate helpers remain implementation collaborators inside the module, `PluginSnapshotManager` remains a peer safety mechanism, Market-owned commands remain outside this interface, and the Electron entry point continues to own product-facing dialogs and restart decisions.

Startup and managed mutations share the same candidate boundary but expose separate semantic methods. Startup may prepare one candidate, protect each write with its own safety point, and accumulate several writes before `finishStartup` activates the candidate, while a managed operation prepares, writes, activates, and waits for the normal Harness readiness sequence before resolving. Recovery writes directly to the active Profile when no resident Harness exists and otherwise uses an isolated recovery candidate.

## Alternatives considered

**Keep orchestration in the Electron entry point.** Rejected because every new mutation path would continue to duplicate candidate, readiness, rollback, and recovery rules.

**Expose transaction-manager and candidate primitives to callers.** Rejected because this would move files without creating a deeper module; callers would still need to understand internal lifecycle ordering.

**Move every Profile write behind the new interface.** Rejected because CLI transaction protocol, Market commands, and user snapshot restore have different ownership and confirmation semantics.

## Consequences

The Electron entry point delegates Desktop-owned candidate mutations through a smaller semantic surface and no longer stores candidate or recovery transaction state. Interface tests exercise managed commit, startup abort, typed rollback, and direct recovery behavior, while the existing lower-level fault-injection tests remain until equivalent interface coverage exists. The extraction is behavior-preserving and does not change published Profile formats or CLI commands.
