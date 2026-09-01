# Agent Note: Isolate desktop title-bar and Harness renderers with native view bounds

Status: implemented

English | [中文](2026-08-31-desktop-titlebar-webcontents-isolation.zh.md)

## Problem

Windows and Linux need custom desktop chrome, but a title bar overlaid inside the Harness renderer shares one Chromium viewport with every plugin. Root padding, a fixed body rectangle, and safe-area variables can guide cooperative layouts, but they cannot contain arbitrary `position: fixed`, `100vh`, body portals, or high-z-index overlays. Any full-viewport plugin can therefore cover the window controls even when the built-in client follows the inset contract.

## Decision

Windows and Linux use two sandboxed native renderers inside one frameless BrowserWindow. The BrowserWindow renderer loads only a 36 px desktop title-bar document with a minimal window-control preload. A `WebContentsView` starts at `x = 0, y = 36` and fills the remaining content size; it loads startup progress, Harness, and all plugin UI. Window resize, maximize, and restore events recalculate that view's native bounds.

The two preloads expose disjoint capabilities. Desktop application IPC accepts only the Harness renderer, while minimize, maximize or restore, and close intents accept only the title-bar renderer. Navigation, window-open policy, and permission handling apply only to Harness. Harness page-title and theme changes are copied to the title bar by the main process.

Harness URLs retain desktop mode and platform metadata but declare a zero title-bar inset because the content renderer has no overlaid chrome. Shared modals, onboarding, banners, attachment overlays, image previews, and plugin portals use their full local viewport without desktop-specific offsets. macOS keeps its native title bar and single renderer.

The desktop host explicitly releases the content renderer when the window is disposed. Failure to create the split content view destroys the partial frameless window and creates a new native-frame window; it never falls back to overlaying custom controls on Harness.

## Alternatives considered

**Patch Better Sidebar or recognize full-screen plugins.** Plugin-specific CSS cannot protect future plugins, portals, or runtime DOM changes. It also makes the desktop host depend on third-party implementation details.

**Retain the fixed-body and URL-inset contract.** This gives cooperative Web code a usable safe area but does not change the containing viewport of fixed and viewport-relative content. The approach is archived as a historical implementation in [the content-bounds note](../../archived/bug-fix/2026-08-29-windows-custom-titlebar-content-bounds.md).

**Restore native system frames on Windows and Linux.** Native frames provide containment but discard the established desktop chrome and its cross-platform actions. A separate title-bar renderer preserves that appearance while maintaining a native boundary.

## Consequences

Plugins cannot render into the title-bar rectangle because Chromium reports only the content view's reduced dimensions. The desktop host pays for one additional lightweight renderer on Windows and Linux and must route loads, messages, permissions, page titles, themes, resizing, and teardown through the correct view. Tests pin geometry and sender identity; native Windows and Linux package validation remains responsible for display scaling, maximize or restore, tray recovery, and plugin interaction behavior.
