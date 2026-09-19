---
description: "Package map for NAS Runtime communication shared by the deployment and Desktop adapters."
kind: "package-group"
---

# nas/ — connect Desktop to a NAS Runtime

English | [中文](README.zh.md)

## Summary

The `nas/` group owns communication facts shared across the NAS Runtime and Desktop process. It does not own deployment, Desktop Runtime Selection, credentials, certificate policy, or renderer presentation.

## Packages

| Package | Role |
|---|---|
| [`nas-protocol/`](nas-protocol/README.md) | Versioned fixed-route JSON messages for health, pairing, and Paired Device management |

## Related documentation

- [Desktop NAS Runtime mode](../../apps/desktop/README.md#nas-runtime-mode) — selection, certificate policy, credentials, and connection behavior.
- [Client connection](../client/connection/README.md) — NAS Runtime host adapter and authenticated routes.

## Dev Note

None.
