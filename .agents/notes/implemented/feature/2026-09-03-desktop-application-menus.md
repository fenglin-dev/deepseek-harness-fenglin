# Agent Note: Shared desktop commands with platform-native application menus

Status: implemented

English | [中文](2026-09-03-desktop-application-menus.zh.md)

## Problem

Default Electron menus expose framework identity and omit desktop recovery commands. A Web-only menu inside the title-bar renderer cannot extend below its native 36 px bounds. Restart and quit commands also need the same mutation protections as existing desktop lifecycle actions.

## Decision

The desktop host owns one allowlisted command registry and platform-specific menu templates. macOS uses the system menu; Windows and Linux use title-bar buttons that request native popups. This retains the [native renderer isolation](../architecture/2026-08-31-desktop-titlebar-webcontents-isolation.md), whose containment and teardown rules remain authoritative. The title-bar preload receives presentation state and submits only known menu groups and window actions; it exposes no Harness bridge. Popup and client acknowledgment channels validate the owning renderer.

The client reports language and connection readiness and acknowledges fixed navigation commands. Workspace navigation owns New Conversation; Settings navigation owns plugin destinations. General Settings consumes one-shot chooser and update destinations, while the diagnostics page accepts the snapshots subsection. Missing sections report an error without plugin installation. Disconnects disable navigation. Commands recheck live state, and restart or quit reject active mutations, including the existing Profile lease. Editing targets the original content; zoom never scales the title bar.

Linux uses neutral window controls and does not depend on a global menu. Confirmed tray creation failure prevents hidden startup and replaces hide-on-close with a cancel-or-quit dialog. Successful Tray construction does not prove visibility; the preference retains its existing value and explains the desktop-environment dependency.

macOS development uses a project-local, ad-hoc-signed Electron copy with only bundle display names changed. Packaged display metadata uses the same short product name. Application identifiers, managed data paths, and saved custom icons retain their existing ownership.

## Alternatives considered

**Place dropdown HTML inside the title-bar view.** Native view bounds clip it. Enlarging that view over Harness would undo the isolation guarantee; native popups keep it intact.

**Modify shared Electron or rename application identifiers.** Shared binaries serve other projects, and identifier changes risk user-data or upgrade behavior. A cached development wrapper changes presentation without changing those identities.

**Simulate clicks or install missing destination plugins.** DOM selectors couple menus to plugin layouts; automatic installation exceeds a navigation request. Fixed service navigation and an explicit missing-page error preserve intent.

## Consequences

The host owns command availability and lifecycle protection; client plugins own their existing pages. Native menu state adds IPC and subscription cleanup obligations. English is the fallback for languages without native-menu translations. A retained mutation lease blocks exit until its owner finishes or is proven dead; malformed or unreadable leases require investigation rather than unsafe shutdown.

## Verification

Focused tests cover platform templates, sender checks, bounded popup coordinates, live-state rejection, content-only editing and zoom, navigation, and tray-failure protection. The isolated Electron smoke exercises real view bounds, native menu construction, the restricted title-bar preload, and content zoom without loading user Profiles. Windows display scaling and tray restoration, GNOME/Wayland, KDE Plasma, X11, and packaged macOS menu presentation remain native release-qualification checks; local simulated platform tests do not replace them.
