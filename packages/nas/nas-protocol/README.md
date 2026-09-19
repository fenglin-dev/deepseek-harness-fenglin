---
description: "The NAS Wire Protocol v1 routes, JSON documents, construction, and runtime validation shared by NAS Runtime and Desktop adapters."
kind: "package-reference"
---

# @deepseek-ai/dsh-nas-protocol

English | [中文](README.zh.md)

## Summary

`dsh-nas-protocol` is the single source for NAS Wire Protocol v1: fixed HTTP methods and routes, health and pairing documents, Paired Device management messages, construction, and runtime validation. The NAS Runtime host and Desktop network code are adapters at this seam. The package has no transport, TLS, credential, Electron, or React behavior.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Dev Note](#dev-note)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

## Use this package

Use `NAS_PROTOCOL_V1` at either wire end. A NAS Runtime adapter uses each operation's `path`, request parser, and response constructor. A Desktop adapter uses the same `path`, request constructor, and response parser. Parsers accept `unknown` and throw `NasProtocolViolation` without retaining rejected payloads. The Desktop adapter separately rejects a health document whose `protocolVersion` is not `NAS_PROTOCOL_V1.version`.

The v1 interface covers `GET /nas/health`, `POST /nas/pair`, and authenticated `GET` or `POST /nas/devices`. Its exported types describe only wire documents. Runtime Selection, certificate fingerprints, saved credentials, discovery candidates, and Desktop status belong to their owning modules.

## Understand the implementation

The package injects fixed schema identifiers when constructing health and pairing documents and validates the same identifiers when parsing. It validates required strings, supported Linux architectures, parseable timestamps, pairing token length, and every Paired Device entry. Hand-written golden tests pin the protocol independently from its constructors so both adapters cannot drift together undetected.

## Further Exploration

- [NAS Runtime host adapter](../../client/connection/README.md) — authentication and HTTP status behavior around these messages.
- [Desktop NAS Runtime mode](../../../apps/desktop/README.md#nas-runtime-mode) — certificate, credential, identity, and Runtime Selection policy.

## Dev Note

None.

## Model Experience

None, as this wire library neither assembles nor sends model requests.

#### KV Cache effect

None; this package does not contribute model-visible content.

## Known Limitations and Deferred Work

- Version 1 has no negotiation; Desktop rejects every different protocol version.
- The protocol does not define transport security or authorization. Its adapters own TLS termination, certificate policy, trusted authorities, and bearer credentials.
