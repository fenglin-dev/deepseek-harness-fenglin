# Agent Note: Centralize the privileged Desktop IPC protocol

Status: implemented

English | [中文](2026-09-17-desktop-ipc-protocol-module.zh.md)

## Problem

The Electron main process and sandboxed preload repeated channel strings across privileged operations and status publications. A rename could leave one side listening on a different channel, and protocol review required searching a large host entry point plus many pass-through methods. The renderer types also mirrored several host-owned data transfer objects without a check that the two representations stayed identical.

## Decision

`desktop-ipc-protocol.ts` owns the exact channel identity for every capability exposed by the Harness preload. The main process and preload import this vocabulary for registration, invocation, sending, and subscription. The preload continues to publish separate frozen capabilities with semantic methods; the protocol module does not expose a generic renderer-facing invoke, send, filesystem, process, path, command, or URL operation.

Main-process handlers continue to validate renderer ownership and every untrusted argument at the privileged operation. The shared channel vocabulary does not move authorization into the renderer and does not treat a known channel name as authority. A protocol test requires unique namespaced channels, while the Host and Client compile in their separate repository-owned TypeScript programs.

## Alternatives considered

**Expose one generic invoke method with an allowlist.** Rejected because it would erase capability-specific signatures at the renderer boundary and make future expansion easier to route through an overly broad transport.

**Keep channel strings beside each caller.** Rejected because main and preload would continue to drift independently and protocol review would remain search-based.

**Move Electron authorization into the protocol table.** Rejected because sender identity and argument validation depend on live main-process state and belong at each privileged handler.

## Consequences

Channel renames now change one vocabulary and TypeScript finds every consumer. The preload remains narrow and capability-based, while main retains final authority over senders and payloads. The renderer package still declares only the subset of bridge values it consumes. Host tests do not import Client source because the repository deliberately compiles those faces as separate programs.
