import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { app, BrowserWindow, ipcMain, Menu, webContents, type MenuItemConstructorOptions } from 'electron'
import { ApplicationMenuController } from '../src/application-menu-controller.ts'
import type { DesktopWindowSurface } from '../src/desktop-window-surface.ts'
import type { DesktopMenuState } from '../src/application-menu.ts'

vi.mock('electron', async () => {
  const { EventEmitter } = await import('node:events')
  class NativeMenu extends EventEmitter {
    items: { id?: string; label?: string; submenu?: NativeMenu }[]
    popup = vi.fn()
    closePopup = vi.fn()
    constructor(template: MenuItemConstructorOptions[]) {
      super()
      // Native Electron uses null for leaves, unlike its TypeScript declarations.
      this.items = template.map(item => ({
        ...item, submenu: Array.isArray(item.submenu) ? new NativeMenu(item.submenu) : null,
      })) as unknown as typeof this.items
    }
    getMenuItemById(id: string): typeof this.items[number] | undefined {
      for (const item of this.items) {
        if (item.id === id) return item
        const nested = item.submenu?.getMenuItemById(id)
        if (nested !== undefined) return nested
      }
      return undefined
    }
  }
  return {
    app: Object.assign(new EventEmitter(), { showEmojiPanel: vi.fn() }),
    ipcMain: new EventEmitter(), BrowserWindow: { getFocusedWindow: vi.fn() },
    webContents: { getFocusedWebContents: vi.fn() },
    Menu: { buildFromTemplate: vi.fn((template: MenuItemConstructorOptions[]) => new NativeMenu(template)), setApplicationMenu: vi.fn() },
  }
})
afterEach(() => { vi.clearAllMocks(); ipcMain.removeAllListeners(); app.removeAllListeners() })
function bench() {
  let state: DesktopMenuState = { platform: 'win32', locale: 'en', ready: true, busy: false, maximized: false, fullscreen: false, development: false }
  const renderer = Object.assign(new EventEmitter(), {
    focus: vi.fn(), isDestroyed: () => false, copy: vi.fn(), getZoomLevel: () => 0, setZoomLevel: vi.fn(),
  })
  const titlebar = Object.assign(new EventEmitter(), { focus: vi.fn(), setZoomLevel: vi.fn() })
  const window = { setMenu: vi.fn(), setMenuBarVisibility: vi.fn(), getContentSize: () => [800, 600], close: vi.fn() }
  const sendTitlebar = vi.fn()
  const surface = { window, renderer, titlebarRenderer: titlebar, split: true, sendTitlebar } as unknown as DesktopWindowSurface
  const execute = vi.fn()
  const error = vi.fn()
  const controller = new ApplicationMenuController({
    surface: () => surface, state: () => state, icon: () => 'data:image/png;base64,', execute, reportError: error,
  })
  controller.register(ipcMain)
  controller.refresh()
  controller.attach(surface)
  return { controller, renderer, titlebar, window, surface, sendTitlebar, execute, error,
    state: (patch: Partial<DesktopMenuState>) => { state = { ...state, ...patch } } }
}
describe('native menu ownership', () => {
  it('keeps editing and zoom on the content even when the titlebar has focus', async () => {
    const b = bench()
    vi.spyOn(webContents, 'getFocusedWebContents').mockReturnValue(b.titlebar as never)
    b.controller.execute('copy')
    b.controller.execute('zoom-in')
    await Promise.resolve()
    expect(b.renderer.copy).toHaveBeenCalledOnce()
    expect(b.renderer.setZoomLevel).toHaveBeenCalledWith(0.5)
    expect(b.titlebar.setZoomLevel).not.toHaveBeenCalled()
    expect(b.window.setMenuBarVisibility).toHaveBeenCalledWith(false)
  })
  it('only accepts finite, clamped popup coordinates from the titlebar', () => {
    const b = bench()
    const menu = vi.spyOn(Menu, 'buildFromTemplate').mock.results.at(-1)!.value as Menu
    const source = menu.getMenuItemById('file')!.submenu!
    const popup = vi.spyOn(source, 'popup')
    ipcMain.emit('dsh:menu:popup', { sender: b.renderer }, { group: 'file', x: 5, y: 36 })
    ipcMain.emit('dsh:menu:popup', { sender: b.titlebar }, { group: 'file', x: NaN, y: 36 })
    expect(popup).not.toHaveBeenCalled()
    ipcMain.emit('dsh:menu:popup', { sender: b.titlebar }, { group: 'file', x: 99999, y: 99999 })
    expect(popup).toHaveBeenCalledWith(expect.objectContaining({ x: 800, y: 36 }))
    ipcMain.emit('dsh:menu:focus-content', { sender: {} })
    expect(b.renderer.focus).not.toHaveBeenCalled()
    ipcMain.emit('dsh:menu:focus-content', { sender: b.titlebar })
    expect(b.renderer.focus).toHaveBeenCalledOnce()
  })
  it('rechecks live state after opening menus, with no duplicate rebuilds', async () => {
    const b = bench()
    const build = vi.spyOn(Menu, 'buildFromTemplate')
    const count = build.mock.calls.length
    b.controller.refresh()
    expect(build).toHaveBeenCalledTimes(count)
    b.state({ busy: true })
    b.controller.execute('restart')
    await Promise.resolve()
    expect(b.execute).not.toHaveBeenCalled()
    expect(b.error).toHaveBeenCalledOnce()
  })
  it('activates menus using window-local Alt without registering global shortcuts', () => {
    const b = bench()
    const event = { preventDefault: vi.fn() }
    b.renderer.emit('before-input-event', event, { type: 'keyDown', key: 'Alt', control: false, meta: false, shift: false })
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(b.titlebar.focus).toHaveBeenCalledOnce()
    expect(b.sendTitlebar).toHaveBeenCalledWith('dsh:menu:activate')
  })
  it('closes the focused independent window, not an unrelated main window', () => {
    const b = bench()
    const chooser = { close: vi.fn() }
    vi.spyOn(BrowserWindow, 'getFocusedWindow').mockReturnValue(chooser as never)
    b.controller.execute('close')
    expect(chooser.close).toHaveBeenCalledOnce()
    expect(b.window.close).not.toHaveBeenCalled()
  })
})
