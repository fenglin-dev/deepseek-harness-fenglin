/** Native menu ownership, content-focused editing, and authenticated titlebar popups. */
import { app, BrowserWindow, Menu, webContents, type IpcMain, type WebContents } from 'electron'
import type { DesktopWindowSurface } from './desktop-window-surface.ts'
import { applicationMenuTemplate, commandEnabled, isDesktopCommand, menuCopy, type DesktopCommand, type DesktopMenuState } from './application-menu.ts'

/** Dependencies supplied by the desktop lifecycle owner. */
export interface ApplicationMenuOptions {
  surface(): DesktopWindowSurface | undefined
  state(): DesktopMenuState
  icon(): string
  execute(command: DesktopCommand): void | Promise<void>
  reportError(error: unknown): void
}

/** Installs one application menu and native popups for the split titlebar. */
export class ApplicationMenuController {
  #menu: Menu | undefined
  #popup: Menu | undefined
  #fingerprint = ''
  readonly #windowMenus = new WeakMap<BrowserWindow, Menu>()
  constructor(readonly options: ApplicationMenuOptions) {}

  /** Rebuild only when presentation changes; always seed a newly loaded titlebar. */
  refresh(): void {
    const state = this.options.state()
    const fingerprint = JSON.stringify(state)
    if (fingerprint !== this.#fingerprint) {
      const first = this.#fingerprint === ''
      this.#fingerprint = fingerprint
      this.#menu = Menu.buildFromTemplate(applicationMenuTemplate(state, (command) => { this.execute(command) }))
      const watch = (menu: Menu): void => {
        menu.on('menu-will-show', () => {
          const current = this.options.state()
          for (const item of menu.items) if (isDesktopCommand(item.id)) item.enabled = commandEnabled(item.id, current)
        })
        // Electron returns null for leaf submenus despite its optional-only TypeScript declaration.
        for (const item of menu.items) if (item.submenu) watch(item.submenu)
      }
      watch(this.#menu)
      if (state.platform === 'darwin') Menu.setApplicationMenu(this.#menu)
      else if (first) Menu.setApplicationMenu(null)
    }
    const surface = this.options.surface()
    if (surface === undefined) return
    // Register application accelerators but never add a second native menu row to split windows.
    if (state.platform !== 'darwin' && this.#menu !== undefined && this.#windowMenus.get(surface.window) !== this.#menu) {
      surface.window.setMenu(this.#menu)
      surface.window.setMenuBarVisibility(!surface.split)
      this.#windowMenus.set(surface.window, this.#menu)
    }
    surface.sendTitlebar('dsh:menu:state', {
      platform: state.platform, maximized: state.maximized, labels: menuCopy(state.locale),
      groups: (this.#menu?.items ?? []).map(item => ({ id: item.id, label: item.label })), icon: this.options.icon(),
    })
  }

  /** Execute against live state, not the state from when the popup opened. @param command - Trusted menu identifier. */
  execute(command: DesktopCommand): void {
    void this.#execute(command).catch((error: unknown) => { this.options.reportError(error) })
  }

  async #execute(command: DesktopCommand): Promise<void> {
    const state = this.options.state()
    if (!commandEnabled(command, state)) throw new Error(state.busy ? menuCopy(state.locale).busy : menuCopy(state.locale).unavailable)
    const surface = this.options.surface()
    const focused = webContents.getFocusedWebContents()
    const target: WebContents | undefined = focused === surface?.titlebarRenderer ? surface.renderer : focused ?? surface?.renderer
    switch (command) {
      case 'emoji': app.showEmojiPanel(); return
      case 'undo': case 'redo': case 'cut': case 'copy': case 'paste':
        target?.focus(); target?.[command](); return
      case 'select-all': target?.focus(); target?.selectAll(); return
      case 'zoom-in': case 'zoom-out': case 'zoom-reset':
        if (surface !== undefined) {
          const level = command === 'zoom-reset' ? 0 : surface.renderer.getZoomLevel() + (command === 'zoom-in' ? 0.5 : -0.5)
          surface.renderer.setZoomLevel(Math.min(3, Math.max(-3, level)))
        }
        return
      case 'fullscreen': surface?.window.setFullScreen(!surface.window.isFullScreen()); return
      case 'minimize': surface?.window.minimize(); return
      case 'maximize':
        if (surface?.window.isMaximized()) surface.window.unmaximize()
        else surface?.window.maximize()
        return
      case 'close': (BrowserWindow.getFocusedWindow() ?? surface?.window)?.close(); return
      case 'devtools': surface?.renderer.toggleDevTools(); return
      default: await this.options.execute(command)
    }
  }

  /** Wire only the titlebar-owned popup channel. @param ipc - Main IPC dispatcher. @returns Cleanup for host teardown. */
  register(ipc: IpcMain): () => void {
    const listener = (event: Electron.IpcMainEvent, request: unknown): void => {
      const surface = this.options.surface()
      if (surface === undefined || event.sender !== surface.titlebarRenderer) return
      if (typeof request !== 'object' || request === null) return
      const { group, x, y } = request as { group?: unknown; x?: unknown; y?: unknown }
      if (typeof group !== 'string' || typeof x !== 'number' || typeof y !== 'number'
        || !Number.isFinite(x) || !Number.isFinite(y)) return
      this.refresh()
      const source = group === 'more' ? this.#menu : this.#menu?.getMenuItemById(group)?.submenu
      if (!source) return
      const previous = this.#popup
      this.#popup = source
      if (previous !== source) previous?.closePopup(surface.window)
      const [width] = surface.window.getContentSize()
      source.popup({
        window: surface.window, x: Math.max(0, Math.min(Math.round(x), width ?? 0)), y: Math.max(0, Math.min(Math.round(y), 36)),
        callback: () => {
          if (this.#popup !== source) return
          this.#popup = undefined
          if (!surface.renderer.isDestroyed()) surface.renderer.focus()
          surface.sendTitlebar('dsh:menu:closed')
        },
      })
    }
    ipc.on('dsh:menu:popup', listener)
    const focusContent = (event: Electron.IpcMainEvent): void => {
      const surface = this.options.surface()
      if (event.sender === surface?.titlebarRenderer) surface.renderer.focus()
    }
    ipc.on('dsh:menu:focus-content', focusContent)
    const activated = (): void => { this.refresh() }
    app.on('browser-window-focus', activated)
    return () => {
      ipc.removeListener('dsh:menu:popup', listener)
      ipc.removeListener('dsh:menu:focus-content', focusContent)
      app.removeListener('browser-window-focus', activated)
      this.#popup?.closePopup()
    }
  }

  /** Route window-local shortcuts without global registrations. @param surface - Newly created window and its content. */
  attach(surface: DesktopWindowSurface): void {
    if (!surface.split) return
    for (const renderer of [surface.renderer, surface.titlebarRenderer]) {
      renderer?.on('before-input-event', (event, input) => {
        if ((input.key === 'Alt' || input.key === 'F10') && !input.control && !input.meta && !input.shift) {
          event.preventDefault()
          if (input.type !== 'keyDown') return
          surface.titlebarRenderer?.focus()
          surface.sendTitlebar('dsh:menu:activate')
        }
      })
    }
  }
}
