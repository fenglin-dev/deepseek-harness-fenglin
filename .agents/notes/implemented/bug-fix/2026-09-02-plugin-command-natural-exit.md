# Agent Note: Plugin command natural exit

Status: implemented

English | [中文](2026-09-02-plugin-command-natural-exit.zh.md)

## Problem

Windows packaging reached successful plugin installation before the CLI aborted with a libuv `UV_HANDLE_CLOSING` assertion. The plugin dispatcher called `process.exit()`, forcing native teardown while handles could still be active.

## Decision

The plugin dispatcher assigns the runner's result to `process.exitCode` and lets Node drain the event loop. Success, diagnostic and failure codes remain unchanged; installation checks still reject nonzero results.

## Alternatives considered

Retrying an assertion or ignoring the native exit code could accept a broken runtime. Changing the bundled Node version would expand the qualification scope. Natural completion removes the forced teardown without either compromise.

## Consequences

An unexpectedly retained referenced handle can keep the CLI alive and must be fixed at its owner. Source-launch tests observe `beforeExit` and verify success and failure exit codes; native Windows packaging verifies real plugin installation and installed-application startup.
