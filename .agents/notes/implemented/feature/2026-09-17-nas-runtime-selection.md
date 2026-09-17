# Agent Note: NAS runtime selection

Status: implemented

English | [中文](2026-09-17-nas-runtime-selection.zh.md)

## Problem

A desktop-only Harness keeps plugins, model settings, sessions, and workspaces on one computer. Sharing its data directory through a network filesystem exposes local locking and package-layout assumptions, while opening the ordinary Web profile to a LAN lacks a device identity and revocation boundary.

## Decision

Desktop treats each NAS deployment as a separate runtime, not as a remote data directory for a local Harness process. A Docker Compose deployment owns `/config` and `/workspaces`, serves one dedicated HTTPS origin, and runs the same community Web profile. Selecting it restarts Desktop into that origin without starting a local Harness and without silently falling back when the NAS is unavailable.

The NAS issues one-time eight-digit pairing codes and stores only hashes of random per-device bearer grants. Desktop seals its grant with the operating system's secure storage, pins a reviewed self-signed certificate fingerprint when necessary, and sends the grant only to the exact selected origin. Device listing and revocation use fixed routes. LAN discovery supplies an untrusted address suggestion; certificate review and pairing remain mandatory.

The remote renderer receives a reduced Electron bridge. It can manage the saved runtime choice and use explicitly retained device-local presentation features, but it does not receive plugin installation, process control, diagnostics, command-line registration, arbitrary filesystem, environment, or shell capabilities. Plugins, models, sessions, and workspaces remain server-owned; window and other device presentation preferences remain client-owned.

## Alternatives considered

**Put the desktop data directory on SMB or NFS.** Rejected because Profile locks, pnpm links, native dependencies, atomic replacement, and process ownership are local-filesystem contracts. Network storage would make one directory appear shareable while leaving concurrency and cross-platform package state unsafe.

**Expose the ordinary Web profile with a shared password.** Rejected because a shared secret cannot name or revoke one device, and it encourages broad browser trust rather than an origin-bound desktop grant.

**Run a local Harness and synchronize selected files.** Rejected because conflicts across sessions, plugin transactions, credentials, and workspaces require a new distributed consistency protocol. One NAS owner gives every desktop the same committed state.

**Trust mDNS discovery.** Rejected because multicast advertisements are unauthenticated. Discovery remains optional convenience and never bypasses HTTPS identity review or pairing.

## Consequences

Different computers can use the same sessions, plugins, models, and workspaces through one runtime with per-device revocation. A NAS outage is visible and requires retrying or explicitly switching to local. Operators must provide hostname resolution, HTTPS, writable persistent mounts, backups, and upgrades. Self-signed deployments add a fingerprint-verification step, and mDNS requires Linux host networking or manual address entry.

The first implementation targets Linux x64 and arm64 Docker hosts and dedicated root origins. It does not support URL subpaths, arbitrary local capability forwarding, automatic container updates, silent data migration, or concurrent local use of the NAS storage directory.
