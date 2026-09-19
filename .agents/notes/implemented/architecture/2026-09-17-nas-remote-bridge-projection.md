# Agent Note: NAS remote bridge projection

Status: implemented

English | [中文](2026-09-17-nas-remote-bridge-projection.zh.md)

## Problem

The NAS renderer previously received the complete local shell bridge and replaced selected operations with rejecting stubs. That denylist made the boundary shallow: existing local log operations remained reachable, and any future local method would cross into the remote renderer unless someone remembered to deny it.

Those log operations reveal the connecting Desktop computer's `harness.log`; they are not NAS logs. Showing them inside a healthy NAS session misstates ownership and expands the remote renderer's authority. The trusted local recovery page is a separate projection and still needs local log access when NAS connection setup fails.

## Decision

The NAS preload constructs its shell projection from a positive allowlist. It exposes only capabilities intentionally owned by the connecting device and required by the remote experience: capability discovery, preferences, preference subscriptions, restart, and readiness reporting. Release checks and NAS management remain separate narrow bridges. Local logs, configuration files, data-home selection, command-line registration, and recovery entry are structurally absent rather than present as rejecting stubs.

The client models local shell operations as an optional sub-capability. It validates the complete local projection at one seam before registering local-only controls or loading local startup state. NAS startup therefore accepts the reduced bridge without touching optional operations. Local runtime startup fails clearly if its required projection is incomplete.

An exact-key preload test owns the remote shell contract. New local methods fail closed: they do not cross the NAS boundary until both the positive projection and that contract test are deliberately changed.

## Alternatives considered

**Keep the complete bridge and replace local operations with rejecting stubs.** Rejected because this remains a denylist: existing omissions and future additions silently cross the boundary.

**Expose local log operations with clearer labels.** Rejected because labeling does not reduce authority, and the connecting computer's log is not part of the NAS runtime. The trusted local recovery projection already owns the legitimate failure-diagnosis case.

**Create a second unrelated client implementation for NAS.** Rejected because preferences, releases, and lifecycle behavior are genuinely shared. One client with an explicit optional local sub-capability keeps that common behavior while preserving the security seam.

## Relationship to existing decisions

This note refines [NAS runtime selection](../feature/2026-09-17-nas-runtime-selection.md), which already requires a reduced remote bridge and separate ownership for server data and device presentation. No earlier active note owns the concrete shell-projection mechanism, so this decision supersedes none.

## Consequences

NAS pages retain device preferences, notifications, Release checks, NAS management, and required Desktop lifecycle behavior, but they cannot open the connecting computer's log file or log directory. A NAS connection failure still uses the trusted local recovery surface, where Desktop log access remains available. Adding a new device-local capability now requires an explicit security decision before remote exposure.
