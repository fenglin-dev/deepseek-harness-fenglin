/** Fixed destinations supported by the desktop icon editor. */
export type IconTarget = 'application' | 'tray'

/** Icon geometry in a 512-pixel output canvas, shared by native rendering and previews. */
export interface IconPresentation { inset: number; radius: number }

/**
 * Choose the optical inset and rounded-corner radius for a runtime destination.
 * @param platform - Desktop operating system.
 * @param target - Application or tray destination.
 * @returns Pixel geometry; tray artwork stays larger than Dock artwork.
 */
export function iconPresentation(platform: string, target: IconTarget): IconPresentation {
  return platform === 'darwin' && target === 'application'
    ? { inset: 50, radius: 92 }
    : { inset: 16, radius: 80 }
}

/** Square crop in pixels of the normalized selection preview. */
export interface IconCrop { x: number; y: number; size: number }

/** Opaque, renderer-bound image selection. The source path is never exposed. */
export interface IconSelection { id: string; preview: string; width: number; height: number }

/** Independently reported OS surface result. */
export interface IconSurfaceResult {
  surface: 'application' | 'tray' | 'desktop' | 'start-menu' | 'taskbar'
  status: 'applied' | 'unavailable' | 'missing' | 'external' | 'repin' | 'unsupported'
  name?: string
}

/** Local desktop preference and safe image previews. */
export interface DesktopIconStatus {
  supported: boolean
  platform: string
  application: string
  tray: string
  applicationCustom: boolean
  trayCustom: boolean
  trayFollowsApplication: boolean
  damaged: boolean
  canCreateShortcut: boolean
  results: IconSurfaceResult[]
}

/** Narrow icon bridge: never accepts a path or an executable. */
export interface DesktopIconsBridge {
  getStatus: () => Promise<DesktopIconStatus>
  choose: () => Promise<IconSelection | null>
  discard: (id: string) => Promise<void>
  apply: (id: string, target: IconTarget, crop: IconCrop) => Promise<DesktopIconStatus>
  followTray: (follow: boolean) => Promise<DesktopIconStatus>
  reset: (target: IconTarget) => Promise<DesktopIconStatus>
  repairShortcuts: () => Promise<DesktopIconStatus>
  createShortcut: () => Promise<DesktopIconStatus>
  onStatus: (callback: (status: DesktopIconStatus) => void) => () => void
}
