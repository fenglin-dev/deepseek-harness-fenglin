# Agent Note: Development entry for the startup recovery page

Status: implemented

English | [中文](2026-09-06-development-recovery-entry.zh.md)

## Problem

The startup recovery page normally appears only after a real boot failure. Maintainers could not inspect its snapshot, data-directory, log, and return behavior without constructing a damaged Profile or waiting for the startup supervisor to fail.

## Decision

Source builds report one development-recovery capability in the desktop bridge and show a General Settings action for it. The renderer sends a parameter-free request. Electron accepts it only from the trusted main renderer, while the current Harness is ready, and while the application is not packaged. Electron then opens the existing startup-failure page with fixed development copy and the current owned log path. It does not stop Harness, mutate the Profile, or fabricate a supervisor failure. Retry recognizes the still-ready Harness and returns to its authenticated page.

The main process denies the capability in packaged builds rather than relying only on client presentation. This keeps an installed application from permitting a diagnostic simulation entry if a stale or modified client bundle tries to call the preload method.

## Alternatives considered

**Inject a real plugin or Profile failure.** That would test more of the failure chain but would make a presentation check destructive and could leave recovery residue.

**Restart directly into the diagnostic-safe Profile.** Safe mode validates a different boot composition. It does not exercise the independent page shown when the renderer cannot load.

## Consequences

Maintainers can enter and leave the real recovery page from a healthy development session. The preview validates only the recovery presentation and its desktop-owned actions; startup-failure detection and diagnostic-safe boot remain covered by their existing tests and Diagnostics Lab scenarios.
