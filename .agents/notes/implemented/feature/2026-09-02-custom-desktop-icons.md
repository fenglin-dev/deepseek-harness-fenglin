# Agent Note: Keep custom desktop icons local to the application host

Status: implemented

English | [中文](2026-09-02-custom-desktop-icons.zh.md)

## Problem

Users need recognizable application and tray icons without changing their Harness configuration or modifying a signed application bundle. Operating systems expose different runtime and shortcut icon mechanisms, so one successful API call cannot establish that every shell surface changed.

## Decision

The normalized crop is the source of derived presentation, not the final OS icon. A 512px canvas contains 412px application artwork with 92px corner radii on macOS, or 480px artwork with 80px radii for Windows and custom trays. The preview uses the same geometry. Native rendering masks premultiplied pixels, preserving transparency and antialiasing. Cached derived images keep status reads inexpensive; startup renders from the crop once rather than repeatedly shrinking saved output. Windows writes a separate content-addressed rounded ICO, leaving the original crop assets and existing shortcut references intact.

The desktop icon manager owns image decoding, square cropping, normalized PNG/ICO assets, and an atomic selection record in Electron `userData/icons`. It accepts PNG/JPEG signatures within byte and pixel limits and, on Windows, modern ICO containers with PNG-compressed frames. ICO inspection validates every directory range, reads dimensions from each embedded PNG header, and selects the largest real frame; it rejects DIB-only containers rather than letting a decoder choose an arbitrary small frame. JPEG orientation metadata is removed before applying the orientation once, and square crop coordinates are validated. Picker IDs are opaque, renderer-bound, single-use, and expire after ten minutes. Images and hashes precede the state-file rename; failed generation or persistence leaves the old preference active. Startup resolves saved images before windows and tray construction; broken assets fall back independently and report damage.

Windows derives ten exact PNG-compressed ICO frames at 16, 20, 24, 32, 40, 48, 64, 96, 128, and 256 pixels. Both BrowserWindow construction and runtime replacement use the multi-frame ICO path, while previews and application-menu artwork retain NativeImage values. This gives the shell an exact source at common DPI scales instead of asking it to repeatedly reduce a single 512px bitmap.

Windows retains the AppUserModelID and updates only verified current-user links to the running installation. The adapter scans the Desktop root without descending into unrelated user directories and recursively scans Start Menu groups. Its bound counts shortcut candidates rather than arbitrary files, and a limit result is distinct from a permission failure. Externally customized icons, common shortcuts, pinned taskbar links, other installations, and symbolic links are not rewritten. macOS uses runtime Dock and Tray APIs without changing the bundle. Custom tray images retain color; the [dedicated template icon decision](../bug-fix/2026-08-20-macos-tray-template-icon.md) still owns the default artwork and its optical geometry. That note remains active because custom uploads do not replace its rationale.

General Settings owns the crop editor and reports results per OS destination. Crop motion uses pointer capture and animation-frame throttling, with arrow-key positioning and a local dialog focus loop. Confirm sends only the selection ID, fixed target, and crop rectangle to Electron. The operation does not restart Harness. Linux and Web do not present the editor.

The default macOS application image uses `dev-dock-icon.png` in both development and installed builds, despite its legacy filename. Its loader crops 20 transparent pixels from each edge of the 1024px source and resizes the 984px viewport back to 1024px, enlarging the visible body by about 4% without clipping artwork or remasking corners. This is a product-specific optical correction, not an Apple-mandated inset: [Apple's icon guidance](https://developer.apple.com/videos/play/wwdc2025/220/) distinguishes the 1024px canvas from optically balanced artwork and system adaptation. Startup, previews, reset, and restart use the same loader and always derive from the bundled source, avoiding cumulative enlargement. Native smoke checks constrain the visible body to about 886px and cover transparent padding, rounded corners, and both installation modes. Custom crops, Windows default artwork, and the macOS tray template are unchanged.

## Alternatives considered

**Rewrite application resources.** Modifying the macOS bundle or Windows executable affects signing and upgrades. Runtime APIs and owned shortcuts provide the requested personalization without changing those artifacts.

**Store the preference in Harness settings or plugin snapshots.** That couples device appearance to shared Profiles and rollback. Desktop `userData` keeps development and installed choices independent and preserves them across `DSH_HOME` changes.

**Treat every shell update as one success.** Windows may retain the pinned shortcut icon or reject one link update. Independent results preserve the valid local preference while offering retries and a repin instruction.

## Verification

Focused Desktop tests cover selection authority, expiry, cancellation, corrupt assets, symlink refusal, atomic-save interruption, tray follow semantics, modern ICO extraction, DIB-only refusal, exact DPI frames, crop bounds, shortcut ownership, and a Desktop tree containing more than 2,000 unrelated files. Client tests cover confirm/cancel, keyboard crop, previews, warnings, independent tray selection, per-surface results, and the separate scan-limit message. `apps/desktop/scripts/icon-native-smoke.mjs` exercises actual Electron PNG alpha, JPEG EXIF rotation, the ten generated ICO frames, Dock/window and tray replacement/reset, and persistence in a temporary directory. Windows installed shortcuts, taskbar pinning, permissions, and upgrade reapplication still require native release qualification.

## Consequences

Personalization remains local and does not change internal branding, notifications, installers, Finder, or plugin state. Content-addressed derived icons keep existing managed shortcut references valid; only normalized output is retained, never the source path. System failures remain visible and retryable without discarding a valid image. The default menu-bar template still adapts to system appearance, while users are responsible for the readability of custom color artwork.
