import { createHash, randomUUID } from 'node:crypto'
import {
  closeSync, constants, existsSync, fstatSync, lstatSync, mkdirSync, openSync, readSync, renameSync, unlinkSync, writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import type { NativeImage } from 'electron'
import { decodeIconImage, encodeIconIco, ICON_MAX_BYTES, renderIconPresentation, validateIconCrop } from './icon-image.js'
import type { DesktopIconStatus, IconSelection, IconSurfaceResult } from './icon-protocol.js'

interface Asset { id: string; icoHash: string }
interface IconPreferences { version: 1; application: Asset | null; tray: Asset | null; follow: boolean }
interface Draft { owner: number; expires: number; image: NativeImage }

/** Main-process-owned runtime images; no source paths reach the renderer. */
export interface DesktopIconImages {
  application: NativeImage
  tray: NativeImage
  trayTemplate: boolean
  applicationIco: string | null
}

/** Native adapters are injected so a failed OS surface cannot corrupt local preferences. */
export interface DesktopIconOptions {
  directory: string
  platform: string
  packaged: boolean
  defaultApplication: NativeImage
  defaultTray: NativeImage
  apply(images: DesktopIconImages, shortcuts: boolean, createShortcut: boolean): IconSurfaceResult[]
  notify(status: DesktopIconStatus): void
  now?: () => number
}

const defaults = (): IconPreferences => ({ version: 1, application: null, tray: null, follow: true })
const digest = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex')
const hashPattern = /^[a-f0-9]{64}$/

function readBoundedImageFile(path: string, limit: number): Buffer {
  if (lstatSync(path).isSymbolicLink()) throw new Error('icon.invalid-image')
  const fd = openSync(path, constants.O_RDONLY | (process.platform === 'win32' ? 0 : constants.O_NOFOLLOW))
  try {
    const stat = fstatSync(fd)
    if (!stat.isFile()) throw new Error('icon.invalid-image')
    if (stat.size > limit) throw new Error('icon.too-large')
    // A concurrently growing picker file must not cause an unbounded allocation.
    const bytes = Buffer.alloc(stat.size + 1)
    let used = 0
    while (used < bytes.length) {
      const count = readSync(fd, bytes, used, bytes.length - used, null)
      if (count === 0) return bytes.subarray(0, used)
      used += count
    }
    throw new Error('icon.invalid-image')
  } finally { closeSync(fd) }
}

function validAsset(value: unknown): value is Asset | null {
  if (value === null) return true
  if (typeof value !== 'object') return false
  const asset = value as Partial<Asset>
  return typeof asset.id === 'string' && hashPattern.test(asset.id)
    && typeof asset.icoHash === 'string' && hashPattern.test(asset.icoHash)
}

/** Own local icon preferences, bounded selections, and atomic commits independently of DSH_HOME. */
export class DesktopIconManager {
  private preferences = defaults()
  private drafts = new Map<string, Draft>()
  private application: NativeImage | undefined
  private tray: NativeImage | undefined
  private presentations = new WeakMap<NativeImage, { application: NativeImage; tray: NativeImage; ico: string | null }>()
  private damaged = false
  private results: IconSurfaceResult[] = []
  private readonly now: () => number

  constructor(private readonly options: DesktopIconOptions) {
    this.now = options.now ?? Date.now
    this.load()
  }

  private assertSupported(): void {
    if (!['darwin', 'win32'].includes(this.options.platform)) throw new Error('icon.unsupported')
  }

  private ensureDirectory(): void {
    mkdirSync(this.options.directory, { recursive: true, mode: 0o700 })
    if (!lstatSync(this.options.directory).isDirectory() || lstatSync(this.options.directory).isSymbolicLink()) throw new Error('icon.storage')
  }

  private read(name: string, max: number): Buffer {
    const path = join(this.options.directory, name)
    const stat = lstatSync(path)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > max) throw new Error('icon.storage')
    return readBoundedImageFile(path, max)
  }

  private loadAsset(asset: Asset | null): NativeImage | undefined {
    if (asset === null) return undefined
    const png = this.read(`${asset.id}.png`, ICON_MAX_BYTES)
    const ico = this.read(`${asset.id}.ico`, ICON_MAX_BYTES)
    if (digest(png) !== asset.id || digest(ico) !== asset.icoHash) throw new Error('icon.storage')
    const image = decodeIconImage(png)
    const size = image.getSize()
    if (size.width !== 512 || size.height !== 512) throw new Error('icon.storage')
    this.preparePresentation(image)
    return image
  }

  private preparePresentation(crop: NativeImage): void {
    const application = renderIconPresentation(crop, this.options.platform, 'application')
    const tray = renderIconPresentation(crop, this.options.platform, 'tray')
    let ico: string | null = null
    if (this.options.platform === 'win32') {
      const bytes = encodeIconIco(application)
      const name = `${digest(bytes)}.ico`
      // Keep legacy crop assets intact; only the derived shortcut reference changes.
      this.atomic(name, bytes)
      ico = join(this.options.directory, name)
    }
    this.presentations.set(crop, { application, tray, ico })
  }

  private load(): void {
    if (!existsSync(this.options.directory)) return
    try {
      if (lstatSync(this.options.directory).isSymbolicLink()) throw new Error('icon.storage')
      const statePath = join(this.options.directory, 'state.json')
      if (!existsSync(statePath)) return
      const parsed = JSON.parse(this.read('state.json', 4096).toString()) as Partial<IconPreferences> | null
      if (parsed === null || parsed.version !== 1 || typeof parsed.follow !== 'boolean'
        || !validAsset(parsed.application) || !validAsset(parsed.tray)) throw new Error('icon.storage')
      this.preferences = { version: 1, application: parsed.application, tray: parsed.tray, follow: parsed.follow }
      try { this.application = this.loadAsset(parsed.application) } catch { this.damaged = true }
      try { this.tray = this.loadAsset(parsed.tray) } catch { this.damaged = true }
    } catch {
      this.damaged = true
      this.preferences = defaults()
    }
  }

  private atomic(name: string, bytes: Buffer): void {
    this.ensureDirectory()
    const temporary = join(this.options.directory, `.pending-${randomUUID()}`)
    try {
      writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 })
      renameSync(temporary, join(this.options.directory, name))
    } finally {
      if (existsSync(temporary)) unlinkSync(temporary)
    }
  }

  private save(preferences: IconPreferences): void {
    try { this.atomic('state.json', Buffer.from(JSON.stringify(preferences))) } catch { throw new Error('icon.storage') }
    this.preferences = preferences
    this.damaged = (preferences.application !== null && this.application === undefined)
      || (preferences.tray !== null && this.tray === undefined)
  }

  /** Runtime images are ready before any BrowserWindow or Tray is constructed. */
  images(): DesktopIconImages {
    const application = this.application === undefined ? undefined : this.presentations.get(this.application)
    const trayCrop = this.preferences.follow ? this.application : this.tray
    const customTray = trayCrop === undefined ? undefined : this.presentations.get(trayCrop)?.tray
    return {
      application: application?.application ?? this.options.defaultApplication,
      tray: customTray ?? this.options.defaultTray,
      trayTemplate: this.options.platform === 'darwin' && customTray === undefined,
      applicationIco: application?.ico ?? null,
    }
  }

  /** Return previews and independent surface results, not raw configuration or paths. */
  status(): DesktopIconStatus {
    const images = this.images()
    return {
      supported: ['darwin', 'win32'].includes(this.options.platform), platform: this.options.platform,
      application: images.application.resize({ width: 64, height: 64 }).toDataURL(),
      tray: images.tray.resize({ width: 32, height: 32 }).toDataURL(),
      applicationCustom: this.application !== undefined, trayCustom: this.tray !== undefined,
      trayFollowsApplication: this.preferences.follow, damaged: this.damaged,
      canCreateShortcut: this.options.platform === 'win32' && this.options.packaged,
      results: this.results,
    }
  }

  /** Reapply saved choices after window creation, upgrades, or an explicit repair. */
  refresh(shortcuts = false, createShortcut = false): DesktopIconStatus {
    this.assertSupported()
    const retained = shortcuts ? [] : this.results.filter(result => result.surface === 'desktop' || result.surface === 'start-menu')
    this.results = [...this.options.apply(this.images(), shortcuts, createShortcut), ...retained]
    const status = this.status()
    this.options.notify(status)
    return status
  }

  /** The caller may read only a path just returned by the native picker. */
  select(owner: number, path: string): IconSelection {
    this.assertSupported()
    try {
      return this.selectBytes(owner, readBoundedImageFile(path, ICON_MAX_BYTES))
    } catch (error) {
      if (error instanceof Error && /^icon\.[a-z-]+$/.test(error.message)) throw error
      throw new Error('icon.invalid-image')
    }
  }

  /** Normalize a picker result and replace any previous draft for the same renderer. */
  selectBytes(owner: number, bytes: Buffer): IconSelection {
    this.assertSupported()
    this.discardOwner(owner)
    for (const [id, draft] of this.drafts) if (draft.expires <= this.now()) this.drafts.delete(id)
    if (this.drafts.size >= 4) throw new Error('icon.busy')
    const image = decodeIconImage(bytes)
    const id = randomUUID()
    this.drafts.set(id, { owner, expires: this.now() + 10 * 60_000, image })
    return { id, preview: image.toDataURL(), ...image.getSize() }
  }

  /** Expire all draft pixels when their renderer closes or navigates away. */
  discardOwner(owner: number): void {
    for (const [id, draft] of this.drafts) if (draft.owner === owner) this.drafts.delete(id)
  }

  /** Cancellation only releases the selected image; it never writes preferences. */
  discard(owner: number, id: unknown): void {
    if (typeof id === 'string' && this.drafts.get(id)?.owner === owner) this.drafts.delete(id)
  }

  /** Commit one validated square crop, then apply each supported OS surface independently. */
  apply(owner: number, id: unknown, target: unknown, crop: unknown): DesktopIconStatus {
    this.assertSupported()
    if (target !== 'application' && target !== 'tray') throw new Error('icon.invalid-target')
    const draft = typeof id === 'string' ? this.drafts.get(id) : undefined
    if (draft === undefined || draft.owner !== owner || draft.expires <= this.now()) throw new Error('icon.expired')
    const { width, height } = draft.image.getSize()
    const rectangle = validateIconCrop(crop, width, height)
    const image = draft.image.crop({ x: rectangle.x, y: rectangle.y, width: rectangle.size, height: rectangle.size })
      .resize({ width: 512, height: 512, quality: 'best' })
    const png = image.toPNG()
    const ico = encodeIconIco(image)
    const asset = { id: digest(png), icoHash: digest(ico) }
    const next = { ...this.preferences, [target]: asset, ...(target === 'tray' ? { follow: false } : {}) }
    try {
      this.preparePresentation(image)
      this.atomic(`${asset.id}.png`, png)
      this.atomic(`${asset.id}.ico`, ico)
      this.save(next)
    } catch { throw new Error('icon.storage') }
    if (target === 'application') this.application = image
    else this.tray = image
    this.damaged = (next.application !== null && this.application === undefined) || (next.tray !== null && this.tray === undefined)
    this.discard(owner, id)
    return this.refresh(target === 'application')
  }

  /** Follow toggles do not overwrite either stored custom image. */
  followTray(value: unknown): DesktopIconStatus {
    this.assertSupported()
    if (typeof value !== 'boolean') throw new Error('icon.invalid-target')
    this.save({ ...this.preferences, follow: value })
    return this.refresh()
  }

  /** Restore only the requested surface; a tray reset also restores follow mode. */
  reset(target: unknown): DesktopIconStatus {
    this.assertSupported()
    if (target !== 'application' && target !== 'tray') throw new Error('icon.invalid-target')
    this.save({ ...this.preferences, [target]: null, ...(target === 'tray' ? { follow: true } : {}) })
    if (target === 'application') this.application = undefined
    else this.tray = undefined
    return this.refresh(target === 'application')
  }
}
