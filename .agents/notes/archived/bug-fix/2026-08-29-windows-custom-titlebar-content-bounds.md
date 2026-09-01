# Agent Note: Bound Windows Web content below the custom title bar

Status: implemented
Archived: 2026-08-31

English | [中文](2026-08-29-windows-custom-titlebar-content-bounds.zh.md)

## Problem

The Windows and Linux desktop window uses a frameless BrowserWindow with a preload-owned title bar. Reserving that bar through padding on the root document did not establish an independent containing rectangle for the Web application. Full-height shell layouts could therefore occupy the title-bar rows on Windows configurations where Chromium resolved the root percentage height against the complete viewport.

## Decision

The preload keeps the document root at the native viewport size and fixes the body between the 36 px title-bar edge and the bottom of the viewport. The Web root remains `height: 100%`, but that percentage resolves inside the reduced body rectangle. The title bar remains fixed to the native viewport and above all Web layers.

The URL inset remains available to client plugins whose own fixed or viewport-relative elements need the desktop chrome measurement. Document bounds and plugin metadata solve different layout cases and therefore retain the same shared height constant.

## Alternatives considered

**Reserve the title bar with root padding alone.** Padding changes visual spacing but does not create the containing rectangle used to resolve descendant percentage heights. Full-height shell layouts could therefore still calculate against the native viewport and overlap the controls.

**Subtract 36 px inside each Web layout.** This would duplicate a desktop-host concern across the shell and every fixed or viewport-relative plugin, with a high risk that new overlays would omit the adjustment. Bounding the body once establishes the correct coordinate space for ordinary layouts, while the shared URL inset remains available for exceptional portal and fixed-position cases.

**Use the native frame on Windows and Linux.** Restoring the system frame would avoid the custom inset but would discard the existing cross-platform title-bar design and its desktop actions. The body-bound solution preserves that product decision while correcting the Web content geometry.

## Consequences

The session header and its actions cannot render beneath the minimize, maximize, or close controls. Full-height Web layouts receive the exact remaining content height without platform-dependent padding calculations, and macOS remains unchanged because it retains the native frame.
