# Agent Note: Desktop NAS runtime authority

Status: implemented

English | [中文](2026-09-18-desktop-nas-runtime-authority.zh.md)

## Problem

The NAS store and network client had implementations, but `main.ts` still owned the product rules spanning them. Runtime selection, the boot-time runtime snapshot, pending certificate pins, exact-origin credential injection, identity verification, device revocation, connection presentation, and restart ordering were assembled across globals, Electron hooks, startup branches, retry handling, and nine IPC handlers.

That cluster was shallow: callers had to understand nearly the complete implementation and reproduce ordering constraints. Tests covered the store and network client separately but could not exercise the complete Desktop NAS behavior through one interface.

## Decision

`DesktopNasRuntimeAuthority` is the deep module that owns Desktop NAS policy. Its interface exposes the boot Runtime, renderer-safe status, one typed operation entry, connection of the selected boot Runtime, certificate acceptance, and exact-origin request authorization. The implementation hides the store/client composition, pending pins, credential lookup and expiry, health and identity checks, status publication, connection presentation, self-revocation cleanup, persistent-service shutdown, and restart ordering.

The Runtime selected when the Desktop process starts is fixed until restart. Persisted status may change while the process remains open, but that change does not hot-switch the running Runtime. Request authorization follows the current persisted selection, preserving the existing transition behavior while restart is pending.

Electron remains an adapter at the seam. A dedicated IPC adapter validates renderer ownership and raw payload shapes before sending typed operations to the authority. TLS and request hooks ask the authority for synchronous policy decisions. A connection adapter translates authority-owned ordering into loading progress, window validity, URL loading, Desktop logging, and recovery presentation without introducing Electron types into the authority module.

File and secure-storage persistence remain local-substitutable through `NasRuntimeStore`; HTTPS operations remain behind the network adapter. Existing store and client tests remain adapter contract tests, while authority tests use its interface as the test surface for cross-cutting behavior.

## Alternatives considered

**Expose one public method per store or network method.** Rejected because callers would still coordinate pairing pins, credential lookup, identity checks, status publication, and restart ordering, leaving the module shallow.

**Use a completely generic command bus for every NAS behavior.** Rejected because certificate and request authorization are synchronous host policies, while connection has a distinct lifecycle. Forcing all three through one generic command would reduce clarity without adding leverage.

**Keep orchestration in `main.ts` and add more helper functions.** Rejected by the deletion test: deleting those helpers would not restore a coherent owner, and the security rules would remain distributed across unrelated Electron call sites.

## Relationship to existing decisions

This note deepens the host-side implementation of [NAS runtime selection](../feature/2026-09-17-nas-runtime-selection.md) and complements [NAS remote bridge projection](./2026-09-17-nas-remote-bridge-projection.md). It preserves the existing separate-Runtime model, explicit switching, no silent fallback, reduced renderer authority, and per-device revocation. No earlier active note owns the host orchestration seam, so this decision supersedes none.

## Consequences

Startup, retry, IPC, TLS, and request authorization now share one policy owner. Changes to NAS identity, credential, pairing, revocation, or restart rules gain locality and can be verified through the authority interface without Electron. `main.ts` retains only adapters and general application lifecycle.

This is a behavior-preserving refactor. It does not change storage formats, wire protocol, errors, automatic retry, fallback, connection UI, or Runtime switching semantics. Future hot switching, credential refresh, or new connection phases require separate product decisions.
