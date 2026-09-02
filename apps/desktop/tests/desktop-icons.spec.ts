import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { NativeImage } from 'electron'
import { TestIconImage } from './icon-test-image.ts'
import { DesktopIconManager } from '../src/desktop-icons.ts'
import { encodeIconIco, inspectIconImage, orientIconBitmap, renderIconPresentation, validateIconCrop } from '../src/icon-image.ts'
import type { IconSurfaceResult } from '../src/icon-protocol.ts'

const faults = vi.hoisted(() => ({ save: false }))
vi.mock('electron', async () => ({ nativeImage: (await import('./icon-test-image.ts')).testNativeImage }))
vi.mock('node:fs', async (original) => {
  const fs = await original<typeof import('node:fs')>()
  return { ...fs, renameSync: (source: string, target: string) => {
    if (faults.save && target.endsWith('state.json')) throw new Error('interrupted save')
    fs.renameSync(source, target)
  } }
})
const temporary: string[] = []
afterEach(() => { faults.save = false; for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true }) })
const raster = (width = 700, height = 600, color = 1): Buffer => new TestIconImage(width, height, color).toPNG()

function setup(platform = 'darwin') {
  const root = mkdtempSync(join(tmpdir(), 'desktop-icon-test-')); temporary.push(root)
  const options = {
    directory: join(root, 'icons'), platform, packaged: true,
    defaultApplication: new TestIconImage(64, 64, 8) as unknown as NativeImage,
    defaultTray: new TestIconImage(22, 22, 9) as unknown as NativeImage,
    apply: vi.fn((): IconSurfaceResult[] => [{ surface: 'application', status: 'applied' }]), notify: vi.fn(), now: () => 100,
  }
  return { root, options, manager: new DesktopIconManager(options) }
}

describe('desktop icon persistence and authority', () => {
  it('keeps defaults without creating a directory or mutating DSH_HOME', () => {
    const { root, manager } = setup()
    expect(manager.status()).toMatchObject({ supported: true, damaged: false, applicationCustom: false, trayFollowsApplication: true })
    expect(readdirSync(root)).toEqual([])
    expect(manager.images().trayTemplate).toBe(true)
  })
  it('retains only normalized crop assets, survives restart, and does not retain picker paths', () => {
    const { manager, options } = setup()
    const selection = manager.selectBytes(7, raster())
    manager.apply(7, selection.id, 'application', { x: 20, y: 10, size: 512 })
    const state = readFileSync(join(options.directory, 'state.json'), 'utf8')
    expect(state).not.toContain(selection.id)
    expect(readdirSync(options.directory).sort().map(name => name.replace(/^[a-f0-9]{64}/, 'asset'))).toEqual(['asset.ico', 'asset.png', 'state.json'])
    const restart = new DesktopIconManager(options)
    expect(restart.status().application).toEqual(manager.status().application)
    expect(restart.status().applicationCustom).toBe(true)
    expect(restart.images().trayTemplate).toBe(false)
    expect(restart.images().application.getSize()).toEqual({ width: 512, height: 512 })
  })
  it('rejects forged, cross-window, expired, reused and replaced selections', () => {
    const { manager, options } = setup()
    const crop = { x: 0, y: 0, size: 512 }
    let selection = manager.selectBytes(7, raster())
    expect(() => manager.apply(8, selection.id, 'application', crop)).toThrow('icon.expired')
    expect(() => manager.apply(7, '../../file', 'application', crop)).toThrow('icon.expired')
    const old = selection
    selection = manager.selectBytes(7, raster())
    expect(() => manager.apply(7, old.id, 'application', crop)).toThrow('icon.expired')
    manager.apply(7, selection.id, 'application', crop)
    expect(() => manager.apply(7, selection.id, 'application', crop)).toThrow('icon.expired')
    let clock = 0
    const expiring = new DesktopIconManager({ ...options, now: () => clock })
    selection = expiring.selectBytes(7, raster())
    clock = 601_000
    expect(() => expiring.apply(7, selection.id, 'application', crop)).toThrow('icon.expired')
  })
  it('cancel and renderer destruction discard without saving', () => {
    const { manager, root } = setup()
    const selection = manager.selectBytes(7, raster())
    manager.discard(8, selection.id)
    manager.discardOwner(7)
    expect(() => manager.apply(7, selection.id, 'application', { x: 0, y: 0, size: 100 })).toThrow('icon.expired')
    expect(readdirSync(root)).toEqual([])
  })
  it('keeps old settings after an interrupted atomic save and allows retry', () => {
    const { manager, options } = setup()
    const initial = manager.selectBytes(7, raster())
    manager.apply(7, initial.id, 'application', { x: 0, y: 0, size: 512 })
    const old = manager.status().application
    const selection = manager.selectBytes(7, raster(700, 600, 2))
    faults.save = true
    expect(() => manager.apply(7, selection.id, 'application', { x: 0, y: 0, size: 512 })).toThrow('icon.storage')
    expect(manager.status().application).toBe(old)
    expect(new DesktopIconManager(options).status().application).toBe(old)
    faults.save = false
    manager.apply(7, selection.id, 'application', { x: 0, y: 0, size: 512 })
    expect(manager.status().application).not.toBe(old)
  })
  it('keeps separate tray preference while toggling follow and restores the template default', () => {
    const { manager } = setup()
    const selection = manager.selectBytes(7, raster(700, 600, 2))
    manager.apply(7, selection.id, 'tray', { x: 0, y: 0, size: 512 })
    const custom = manager.status().tray
    expect(manager.status().trayFollowsApplication).toBe(false)
    expect(manager.images().trayTemplate).toBe(false)
    manager.followTray(true)
    expect(manager.images().trayTemplate).toBe(true)
    manager.followTray(false)
    expect(manager.status().tray).toBe(custom)
    manager.reset('tray')
    expect(manager.images().trayTemplate).toBe(true)
  })
  it.each(['missing', 'modified', 'symlink'])('falls back on a %s saved image without blocking startup', (kind) => {
    const { manager, options, root } = setup()
    const selection = manager.selectBytes(7, raster())
    manager.apply(7, selection.id, 'application', { x: 0, y: 0, size: 512 })
    const name = readdirSync(options.directory).find(name => name.endsWith('.png'))!
    const path = join(options.directory, name)
    unlinkSync(path)
    if (kind === 'modified') writeFileSync(path, raster(512, 512, 8))
    if (kind === 'symlink') { writeFileSync(join(root, 'outside.png'), raster(512, 512)); symlinkSync(join(root, 'outside.png'), path) }
    const restart = new DesktopIconManager(options)
    expect(restart.status()).toMatchObject({ damaged: true, applicationCustom: false })
    expect(restart.images().trayTemplate).toBe(true)
    restart.reset('application')
    expect(new DesktopIconManager(options).status().damaged).toBe(false)
  })
  it('rejects traversal in the saved state and arbitrary target names', () => {
    const { manager, options } = setup()
    manager.followTray(false)
    writeFileSync(join(options.directory, 'state.json'), JSON.stringify({ version: 1, follow: true, application: { id: '../outside', icoHash: 'a'.repeat(64) }, tray: null }))
    expect(new DesktopIconManager(options).status().damaged).toBe(true)
    expect(() => manager.apply(7, 'id', 'notifications', {})).toThrow('icon.invalid-target')
    expect(() => manager.followTray('yes')).toThrow('icon.invalid-target')
  })
  it('keeps valid preferences when the OS reports a partial application failure', () => {
    const { manager, options } = setup('win32')
    options.apply.mockReturnValue([{ surface: 'application', status: 'applied' }, { surface: 'tray', status: 'unavailable' }])
    const selection = manager.selectBytes(7, raster())
    manager.apply(7, selection.id, 'application', { x: 0, y: 0, size: 512 })
    expect(options.apply).toHaveBeenCalledWith(expect.anything(), true, false)
    expect(manager.status().results).toContainEqual({ surface: 'tray', status: 'unavailable' })
    expect(new DesktopIconManager(options).status().applicationCustom).toBe(true)
  })
  it('does not support Linux', () => {
    const { manager } = setup('linux')
    expect(manager.status().supported).toBe(false)
    expect(() => manager.selectBytes(7, raster())).toThrow('icon.unsupported')
  })
})

describe('bounded icon image protocol', () => {
  it.each([
    ['darwin', 'application', 50, 92],
    ['win32', 'application', 16, 80],
    ['darwin', 'tray', 16, 80],
    ['win32', 'tray', 16, 80],
  ] as const)('renders %s %s with transparent padding and antialiased corners', (platform, target, inset, radius) => {
    const source = new TestIconImage(512, 512, 120) as unknown as NativeImage
    const image = renderIconPresentation(source, platform, target)
    const bitmap = image.toBitmap()
    const alpha = (x: number, y: number): number => bitmap.readUInt8((y * 512 + x) * 4 + 3)
    expect(alpha(256, inset - 1)).toBe(0)
    expect(alpha(256, inset)).toBe(255)
    expect(alpha(256, 511 - inset)).toBe(255)
    expect(alpha(256, 512 - inset)).toBe(0)
    expect(alpha(inset, inset)).toBe(0)
    expect(alpha(inset + radius, inset + radius)).toBe(255)
    expect([...bitmap].some((value, index) => index % 4 === 3 && value > 0 && value < 255)).toBe(true)
    expect(source.toBitmap()[3]).toBe(255)
  })
  it('re-renders saved unstyled crops once and keeps tray artwork larger than Dock artwork', () => {
    const { manager, options } = setup()
    const selection = manager.selectBytes(7, raster())
    manager.apply(7, selection.id, 'application', { x: 0, y: 0, size: 512 })
    const before = manager.images()
    expect(before.application.toBitmap()[(20 * 512 + 256) * 4 + 3]).toBe(0)
    expect(before.tray.toBitmap()[(20 * 512 + 256) * 4 + 3]).toBe(255)
    expect(new DesktopIconManager(options).images().application.toBitmap()).toEqual(before.application.toBitmap())
    expect(manager.images().application).toBe(before.application)
  })
  it('keeps the renderer mirror equal to the Electron narrow protocol', () => {
    expect(readFileSync(new URL('../src/icon-protocol.ts', import.meta.url), 'utf8')).toEqual(
      readFileSync(new URL('../../../packages/client/ui-desktop-shell/src/client/icon-protocol.ts', import.meta.url), 'utf8'),
    )
  })
  it('checks magic and dimensions before decoding', () => {
    expect(inspectIconImage(raster())).toMatchObject({ width: 700, height: 600 })
    expect(() => inspectIconImage(Buffer.from('<svg/>'))).toThrow('icon.invalid-image')
    expect(() => inspectIconImage(raster(8000, 8000))).toThrow('icon.too-many-pixels')
    expect(() => inspectIconImage(Buffer.alloc(10 * 1024 * 1024 + 1))).toThrow('icon.too-large')
  })
  it.each([
    {}, { x: NaN, y: 0, size: 1 }, { x: -1, y: 0, size: 1 }, { x: 0, y: 0, size: 0 },
    { x: 0, y: 0, size: Infinity }, { x: 0.5, y: 0, size: 1 }, { x: 99, y: 0, size: 2 },
  ])('rejects malformed or out-of-bounds crop %j', (crop) => {
    expect(() => validateIconCrop(crop, 100, 100)).toThrow('icon.invalid-crop')
  })
  it('validates boundary crops', () => {
    expect(validateIconCrop({ x: 0, y: 0, size: 100 }, 100, 100).size).toBe(100)
  })
  it('orients all EXIF rotations and reflections', () => {
    const pixels = Buffer.from([1, 0, 0, 255, 2, 0, 0, 255, 3, 0, 0, 255, 4, 0, 0, 255, 5, 0, 0, 255, 6, 0, 0, 255])
    const expected = [
      [1, 2, 3, 4, 5, 6], [3, 2, 1, 6, 5, 4], [6, 5, 4, 3, 2, 1], [4, 5, 6, 1, 2, 3],
      [1, 4, 2, 5, 3, 6], [4, 1, 5, 2, 6, 3], [6, 3, 5, 2, 4, 1], [3, 6, 2, 5, 1, 4],
    ]
    for (let orientation = 1; orientation <= 8; orientation++) {
      const output = orientIconBitmap(pixels, 3, 2, orientation)
      expect([...output.pixels].filter((_value, index) => index % 4 === 0)).toEqual(expected[orientation - 1])
      expect(output.width).toBe(orientation >= 5 ? 2 : 3)
    }
  })
  it('generates seven indexed PNG frames in an ICO', () => {
    const bytes = encodeIconIco(new TestIconImage(512, 512) as unknown as NativeImage)
    expect(bytes.readUInt16LE(2)).toBe(1)
    expect(bytes.readUInt16LE(4)).toBe(7)
    for (let i = 0; i < 7; i++) {
      const offset = bytes.readUInt32LE(6 + i * 16 + 12)
      expect(bytes.subarray(offset, offset + 8).toString('hex')).toBe('89504e470d0a1a0a')
    }
  })
})
