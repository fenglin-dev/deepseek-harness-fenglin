# Agent Note: Module fallback writer-lock recovery

Status: implemented

English | [中文](2026-09-15-module-fallback-writer-lock-recovery.zh.md)

## Problem

Desktop could enter Diagnostics with only `profile.unknown` after `healProfilesModuleFallback` timed out on `profiles/node_modules.lock`. The page did not distinguish a live writer from an orphaned lock, did not show the recorded PID, and offered no bounded recovery action. Reinstalling the application did not help because the lock belongs to the retained user data directory.

## Decision

The Profile diagnostic classifier now assigns `profile.module-fallback-lock-busy` only to the exact atomic-writer timeout for `profiles/node_modules.lock`. Desktop inspects that one fixed lock in the main process and returns only its state and recorded PID to the recovery page.

The recovery button is enabled only when the operating system reports the PID as dead. Cleanup rereads the regular, nonsymlink lock, confirms that its identity did not change, and checks the PID a second time before atomically moving and deleting it. A live PID, unverifiable liveness, malformed file, symbolic link, missing file, or replacement during verification is never removed. The renderer cannot supply a path or PID.

## Alternatives considered

**Delete every atomic-write lock during startup.** This could remove a lock owned by a legitimate writer and expose a partially changing Profile.

**Let the renderer submit the lock path or PID.** This would turn a single recovery operation into a general file-deletion or process-inspection capability.

**Treat an inaccessible PID as dead.** Permission failures do not prove process death, so cleanup remains disabled when liveness is unknown.

## Consequences

Diagnostics names the actual failure, shows the lock owner, and automatically notices when a live owner exits. A confirmed orphan can be cleared and normal startup retried without changing plugins, sessions, settings, or credentials. Ambiguous cases remain blocked for manual inspection and diagnostic export.
