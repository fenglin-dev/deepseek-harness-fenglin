# Agent Note: Own Desktop download settings in a renderer projection

Status: implemented

English | [中文](2026-09-17-desktop-settings-projection.zh.md)

## Problem

The Desktop download settings component owned preload subscriptions, initial loading, saved values, editable drafts, transient passwords, operation state, errors, and persistence calls. Presentation code therefore understood both form rendering and transport coordination, tests had to construct a complete bridge, and another settings surface could not reuse the same state without reproducing the lifecycle.

## Decision

`DownloadNetworkProjection` is the renderer owner for download-network settings. It subscribes to main-process publications, loads the initial settings and test state, keeps saved and draft values separate, retains transient password input only in memory, serializes save and reset state per target, runs bounded tests, and publishes immutable snapshots through the external-store interface.

`DesktopShellController` creates, starts, and disposes this projection when the capability is available. The React settings component consumes snapshots with `useSyncExternalStore` and emits semantic edit, save, reset, and test intents. It receives no raw download-network bridge. Release-source retry also delegates its settings change to the projection before refreshing Release state.

## Alternatives considered

**Keep local React state and extract only helper functions.** Rejected because subscriptions, asynchronous persistence, and error ownership would remain in the view.

**Add every download field to the existing shell snapshot.** Rejected because download settings have an independent lifecycle and draft model; folding them into the broad shell snapshot would cause unrelated update surfaces to observe form edits.

**Create a generic settings-form store.** Rejected because no current second consumer requires that abstraction and credential drafts plus target-specific patches have concrete semantics.

## Consequences

The settings view now depends on one cohesive projection and semantic intents. Subscription identity is stable, derived rendering state is read directly from immutable snapshots, and transport fixtures move to projection tests. The added owner has an explicit start and dispose lifecycle; callers that construct it outside `DesktopShellController` must invoke both methods.
