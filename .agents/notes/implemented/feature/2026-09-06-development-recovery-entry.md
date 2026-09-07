# Agent Note: Development entry for the startup recovery page

Status: implemented

English | [中文](2026-09-06-development-recovery-entry.zh.md)

## Problem

The startup recovery page normally appears only after a real boot failure. Maintainers could not inspect its snapshot, data-directory, log, and return behavior without constructing a damaged Profile or waiting for the startup supervisor to fail.

## Decision

Source builds report one development-recovery capability in the desktop bridge and show a General Settings action for it. The renderer sends a parameter-free request. Electron accepts it only from the trusted main renderer, while the current Harness is ready, and while the application is not packaged. Electron then opens the existing startup-failure workspace with fixed development copy and the current owned log path. Entry alone does not stop Harness, mutate the Profile, or fabricate a supervisor failure. Continue recognizes the still-ready Harness and returns to its authenticated page.

The startup page and recovery workspace share the same cool-neutral window, application identity, and determinate blue progress bar. Failure pauses that bar and expands four independent tools in place. The home presents plugin management, snapshot rollback, data-directory switching, and redacted diagnostic export as peers. After opening a tool, four persistent tabs replace the home and switch directly among those tools without a back-step sequence.

Plugin management reads only direct Web Profile dependencies plus the count of installation-owned bundles. Electron accepts removal only for a package identity still present in that inventory, stops Harness before invoking the ordinary bounded `dsh plugin --profile web remove` path, and leaves it stopped while the user removes more plugins. Continue resumes the supervised Harness. Core bundles are never offered for removal, local package paths never reach the renderer, and each ordinary CLI removal retains its automatic pre-change plugin snapshot. Diagnostic export is main-process owned and contains only app/platform metadata, bounded startup state, redacted failure text, and the path-free plugin inventory.

The main process denies the capability in packaged builds rather than relying only on client presentation. This keeps an installed application from permitting a diagnostic simulation entry if a stale or modified client bundle tries to call the preload method.

## Alternatives considered

**Inject a real plugin or Profile failure.** That would test more of the failure chain but would make a presentation check destructive and could leave recovery residue.

**Restart directly into the diagnostic-safe Profile.** Safe mode validates a different boot composition. It does not exercise the independent page shown when the renderer cannot load.

## Consequences

Maintainers can enter and leave the real recovery workspace from a healthy development session. Users facing a real startup failure can move directly among recovery tools, remove one or more external plugins, and continue without any mutation. The wider independent page adds more presentation code to the preload bundle, while keeping every filesystem path, package command, and diagnostic payload owned by Electron. The development entry validates presentation and desktop-owned actions; startup-failure detection and diagnostic-safe boot remain covered by their existing tests and Diagnostics Lab scenarios.
