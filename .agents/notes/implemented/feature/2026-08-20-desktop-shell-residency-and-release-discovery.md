# Agent Note: Desktop shell residency and Release discovery

Status: implemented

English | [中文](2026-08-20-desktop-shell-residency-and-release-discovery.zh.md)

## Problem

The packaged desktop host exited with its only window, offered no login launch or native lifecycle notifications, and exposed diagnostics only after Harness exhausted its startup retries. Users also had no application-version signal because the existing updater operates on trusted source checkouts rather than packaged Releases.

## Decision

The Electron main process owns one durable preference file under `userData`, one serialized application lifecycle, and one system tray. Closing the window hides it by default while explicit quit waits for Harness shutdown. Users may switch close behavior, native lifecycle notifications, and packaged macOS login launch through a narrow preload bridge; unsupported platforms report login launch as unavailable. Preference switches use the application blue token when enabled, an adaptive medium gray when disabled, and a white thumb in both states so their state remains visible across light and dark themes.

The connecting page reveals the fixed Harness log after fifteen seconds without treating a slow start as failure. The main process reveals that known file or its parent directory and never accepts a renderer path. Restart, repeated failure, and recovery notifications are localized from the operating-system locale and throttled by event kind.

Packaged applications query `flaqai/open-deepseek-harness-desktop` Releases and expose normalized status through the preload bridge. Prerelease clients follow their current prerelease channel and may move to a higher stable version; stable clients ignore prereleases. In the desktop sidebar this owner suppresses plugin-provided footer shortcuts and renders one Release action only when an update exists, marking its icon with one blue dot; General Settings retains the detailed state and manual check. On macOS and Windows, the main process selects the fixed asset for the running platform and architecture and downloads it under `userData`. The first installer and checksum request uses Electron's Chromium network stack so system proxy, PAC, and proxy authentication apply. A connection failure, response deadline, interrupted body, HTTP 408, or server error switches once to the fixed GitHub Asset API endpoint. An interrupted installer uses a validated byte range within that download; an unsupported range restarts the API response from byte zero, while cancellation and application exit remove the partial file. The main process publishes these states, verifies the asset size and GitHub digest or `SHA256SUMS` entry, and lets the operating system open only the verified installer. Linux keeps the repository-validated Release-page link because one Release carries both DEB and RPM packages. The application never replaces itself, and source runs retain the separate trusted-checkout updater.

## Alternatives considered

**Silent automatic updates.** Unsigned Windows artifacts and ad-hoc-signed, unnotarized macOS artifacts do not provide the signing and rollback guarantees required for unattended replacement. The application downloads and verifies the installer but leaves replacement, cancellation, and conflict handling to the operating system.

**Use a third-party download mirror.** A mirror introduces another publication authority and can drift from a withdrawn or replaced GitHub asset. Both download routes remain attached to the selected GitHub Release and its verified size and SHA-256.

**Store desktop preferences in Harness settings.** Close and login-launch behavior must be available before the Web client connects, so Electron owns a small independent file and exposes only typed preference operations.

**Quit on close by default.** Background tasks and the supervised Harness would stop unexpectedly. Tray residency is the default, while a durable preference preserves an explicit quit-on-close choice.

## Consequences

The desktop process may remain active without a visible window, and every explicit exit path must join the same asynchronous Harness teardown. Native tray text follows the operating-system locale rather than the Web locale. Login launch is intentionally macOS-only. Release publication must retain fixed installer names, valid GitHub asset ids, and at least one SHA-256 source; missing or mismatched verification data fails closed. The two download routes improve compatibility with proxy and restricted networks but can both remain unreachable. Partial downloads survive only a transport switch in one running operation. Downloaded installers occupy the desktop data directory, while application replacement remains a manual user action until signed distribution and rollback exist.
