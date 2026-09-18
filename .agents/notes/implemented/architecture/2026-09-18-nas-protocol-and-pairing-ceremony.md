# Agent Note: NAS protocol and Pairing Ceremony modules

Status: implemented

English | [中文](2026-09-18-nas-protocol-and-pairing-ceremony.zh.md)

## Problem

NAS Wire Protocol v1 methods, routes, JSON document types, construction, and runtime parsing were repeated across the NAS Runtime host, Desktop network adapter, renderer bridge, and tests. A compatible change could drift between wire ends, while hand-written success payloads in adapter tests duplicated the protocol instead of verifying it.

The renderer also represented the Pairing Ceremony with independent React values for the address, fingerprint, confirmation, busy operation, and message. The ordering that bound a fingerprint to its inspected address lived in event handlers, so a late certificate-inspection result could become attached to a newer address.

## Decision

`@deepseek-ai/dsh-nas-protocol` is the deep module at the NAS wire seam. Its `NAS_PROTOCOL_V1` interface owns fixed methods and routes, request and response codecs, wire document types, schema injection, and runtime validation. The NAS Runtime host and Desktop network code are the two adapters. Transport security, authentication, HTTP status mapping, certificate policy, credentials, discovery, and Runtime Selection remain outside the protocol module.

Hand-written golden protocol tests pin v1 independently from its constructors. Host adapter tests retain real HTTP status and authentication coverage, while Desktop adapter tests retain compatibility, timeout, and fixed-route coverage.

`createNasPairingCeremony` is the deep in-process module behind the NAS settings page. Its interface accepts editing and trust intents, exposes one observable tagged snapshot, and performs certificate inspection and pairing. The implementation binds every fingerprint to its inspected address, invalidates review state when the address changes, ignores stale inspection completions, and submits the inspected address and fingerprint together. Discovery, saved Runtime management, Paired Device management, and Runtime Selection remain page-level concerns.

The Pairing Ceremony does not establish trust. `DesktopNasRuntimeAuthority` continues to enforce one-time inspection and exact-origin certificate confirmation before a pairing request reaches the NAS Runtime.

## Alternatives considered

**Place the protocol in `client-connection`.** Rejected because the NAS Runtime host and Desktop network code are peer adapters at the wire seam. Making Desktop depend on the broader connection package would invert ownership and import unrelated host and browser concerns.

**Expose separate route constants, parsers, and builders.** Rejected because callers would reconstruct operation groupings and method/path relationships. One `NAS_PROTOCOL_V1` descriptor gives more leverage through a smaller interface.

**Keep the Pairing Ceremony in React state with an attempt counter.** Rejected because React callers would still own fingerprint/address binding, stale async completion, legal transitions, and retry state. The interface would remain nearly as complex as the implementation.

**Move the entire NAS settings page into one state machine.** Rejected because discovery, Runtime Selection, device management, and pairing have independent lifecycles. Combining them would reduce locality and create a shallow page-wide interface.

## Relationship to existing decisions

This decision deepens the wire and renderer implementations of [NAS runtime selection](../feature/2026-09-17-nas-runtime-selection.md), [NAS remote bridge projection](./2026-09-17-nas-remote-bridge-projection.md), and [Desktop NAS runtime authority](./2026-09-18-desktop-nas-runtime-authority.md). It preserves their separate-Runtime model, reduced renderer authority, explicit certificate review, per-device credentials, and no-silent-fallback rules.

## Consequences

Protocol changes now concentrate in one package and are validated symmetrically at both wire ends. A future protocol version requires an explicit versioned interface rather than mutating v1 in place. The additional workspace package and documentation are the cost of keeping the two adapters independent.

React renders Pairing Ceremony state without reproducing async ordering rules. Tests drive the same interface as the page and can deterministically verify late completion, address invalidation, confirmation, retry, and reset behavior. The user-visible steps, NAS Wire Protocol v1, Desktop trust policy, and Runtime switching behavior remain unchanged.
