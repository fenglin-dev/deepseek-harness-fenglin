# Agent Note: External-tool download progress stays observational

Status: implemented

English | [中文](2026-09-14-external-tool-download-progress.zh.md)

## Problem

Desktop users installing Codex or Claude Code could see only an undifferentiated busy action until the guarded Profile mutation completed. A slow registry or retry looked frozen, while opening more diagnostics was possible only after failure.

## Decision

The existing guarded installer remains the sole owner of mutation, retry, timeout, quarantine, and failure decisions. For its main pnpm step, the CLI may write NDJSON to a Host-created mode-0600 sidecar inside the selected DSH home. The Host parses that stream into coarse stages, exposes a percentage only after pnpm finalizes the resolved dependency count, retains a bounded sanitized terminal transcript, and serves increments by Host-issued install id plus opaque byte offset. It never exposes the sidecar path to the renderer, and it removes the file when the operation settles or the next startup finds it stale.

The External tools page renders the reported state inside the existing install action and opens the transcript through a separate secondary action. Closing the transcript does not cancel installation, and a stalled percentage does not create a new failure condition.

## Alternatives considered

**Assign fixed weights to every phase.** Resolution and lifecycle scripts have no truthful shared duration. Weighted progress would look precise while being fabricated.

**Return the whole transcript with every install snapshot.** Repeated transport would grow with the install and couple ordinary status polling to sensitive raw subprocess output.

## Consequences

Users can distinguish preparation, dependency resolution, download, installation, and verification, inspect retries while they happen, and retain the existing diagnostic after failure. Cached packages count as acquired dependencies. Windows retry starts reset determinate progress rather than preserving a stale percentage. Progress observation is optional: failure to create the private sidecar cannot block the installation itself.
