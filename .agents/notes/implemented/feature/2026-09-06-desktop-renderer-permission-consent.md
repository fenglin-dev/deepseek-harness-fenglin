# Agent Note: Ask before granting desktop renderer capabilities

Status: implemented

English | [中文](2026-09-06-desktop-renderer-permission-consent.zh.md)

## Problem

The desktop host denied every renderer permission except sanitized clipboard writes. Features built on standard Web APIs therefore failed before users could approve microphone, camera, location, screen capture, device, local-network, or file-system access.

## Decision

The Electron main process admits only recognized permission names from the exact supervised Harness loopback origin. Sanitized clipboard writes remain silent. Every other admitted capability enters one serialized native consent dialog and remains denied until the user approves it. Grants live only in memory for the current renderer and Harness origin; navigation, restart, or process exit discards them. Microphone and camera use separate grant keys when Chromium identifies the requested media type. Unknown permissions, foreign origins, ordinary subframes, and external-opening capabilities fail closed.

The macOS package declares microphone, camera, and when-in-use location purpose strings so operating-system consent can follow the application dialog. This mechanism does not expose a generic permission IPC or let renderer code choose a trusted origin.

## Alternatives considered

**Grant every request from localhost.** Loopback origin alone does not justify ambient device or data access. Explicit user consent remains required.

**Persist approvals.** A durable grant could outlive the plugin or page that requested it. Session-local grants keep changed compositions and later launches reviewable.

## Consequences

Standard Web features can request supported capabilities at the moment of use. Concurrent identical prompts share one decision, unrelated prompts are serialized, and denial leaves the rest of the application operational. Platform-level dialogs and device pickers may still follow the application-owned consent step.
