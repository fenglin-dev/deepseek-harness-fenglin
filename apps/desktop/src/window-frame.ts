/** Platform policy for native and custom desktop window frames. */

/** Height, in CSS pixels, reserved for the desktop-owned custom title bar. */
export const CUSTOM_WINDOW_TITLE_BAR_HEIGHT = 36

/** Native rectangle occupied by the Harness renderer inside the main window. */
export interface DesktopContentBounds {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * Resolve the Harness renderer's native rectangle below custom desktop chrome.
 * @param width - BrowserWindow content width in device-independent pixels.
 * @param height - BrowserWindow content height in device-independent pixels.
 * @param titlebarHeight - Height reserved for the desktop-owned title bar.
 * @returns A non-negative rectangle for the Harness WebContentsView.
 */
export function harnessContentBounds(
  width: number,
  height: number,
  titlebarHeight = CUSTOM_WINDOW_TITLE_BAR_HEIGHT,
): DesktopContentBounds {
  const safeWidth = Math.max(0, Math.floor(width))
  const safeHeight = Math.max(0, Math.floor(height))
  const safeTitlebarHeight = Math.min(safeHeight, Math.max(0, Math.floor(titlebarHeight)))
  return {
    x: 0,
    y: safeTitlebarHeight,
    width: safeWidth,
    height: safeHeight - safeTitlebarHeight,
  }
}

/**
 * Decide whether the desktop host replaces the operating-system title bar.
 *
 * macOS retains its native title bar and traffic lights. Windows and Linux use
 * a desktop-owned title-bar renderer above the Harness WebContentsView.
 *
 * @param platform Node platform identifier.
 * @returns Whether to create a frameless BrowserWindow with custom controls.
 */
export function usesCustomWindowFrame(platform: NodeJS.Platform): boolean {
  return platform === 'win32' || platform === 'linux'
}

/**
 * Match an IPC sender to the one renderer that owns a desktop capability.
 * @param sender Renderer that emitted the IPC request.
 * @param expected Renderer assigned to the requested capability.
 * @returns Whether the sender owns that capability.
 */
export function isDesktopRenderer<T>(sender: T, expected: T | undefined): boolean {
  return expected !== undefined && sender === expected
}

/**
 * Stamp a Harness URL with desktop-shell metadata consumed by Web plugins.
 *
 * macOS keeps the original URL. Windows and Linux declare advanced desktop
 * mode with a zero renderer inset because the Harness WebContentsView already
 * excludes the desktop-owned title bar at the native view level.
 *
 * @param rawUrl Harness Web URL.
 * @param platform Node platform identifier.
 * @returns URL carrying desktop-shell metadata when required.
 */
export function withDesktopWindowMetadata(rawUrl: string, platform: NodeJS.Platform): string {
  if (!usesCustomWindowFrame(platform)) return rawUrl
  const url = new URL(rawUrl)
  url.searchParams.set('dsh-desktop-mode', 'advanced')
  url.searchParams.set('dsh-desktop-platform', platform)
  url.searchParams.set('dsh-desktop-titlebar-inset', '0')
  return url.href
}
