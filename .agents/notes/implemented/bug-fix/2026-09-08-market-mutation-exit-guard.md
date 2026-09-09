# Agent Note: Plugin-market mutation exit protection

Status: implemented

English | [中文](2026-09-08-market-mutation-exit-guard.zh.md)

## Problem

Plugin-market CLI operations can outlive Harness. Exiting during removal can leave a live lock owner with dependencies removed but Bundle reconciliation unfinished. The next startup enters safe mode rather than reading a changing Profile.

## Decision

Desktop's shared busy predicate includes the read-only Profile mutation-lock probe, not only snapshot and lab state. Recovery preview and recovery exit reject busy requests before reporting success; lifecycle quit and restart recheck the same predicate. Post-readiness snapshot scheduling also waits for the lock owner.

## Alternatives considered

Deleting a live lock permits competing writers. Killing only pnpm on a timer can leave lifecycle-script descendants writing after the CLI releases its lock. Neither is used as an exit shortcut.

## Consequences

Normal completion releases the lock and allows exit. Malformed or unreadable ownership fails closed. Orphaned processes require explicit diagnosis and recovery; this guard does not bound pnpm execution or guarantee process-tree cleanup after an external kill. Regression tests use an actual lock file with the lifecycle controller and check production IPC wiring. Native Windows and Linux process termination remain unverified.
