/** Minimal IPC wiring for the desktop-owned custom title bar. */

import { ipcRenderer } from 'electron'
import type { menuCopy } from './application-menu.ts'

window.addEventListener('DOMContentLoaded', () => {
  const title = document.querySelector<HTMLElement>('#dsh-desktop-titlebar-title')
  const minimize = document.querySelector<HTMLButtonElement>('[data-action="minimize"]')
  const maximize = document.querySelector<HTMLButtonElement>('[data-action="maximize"]')
  const close = document.querySelector<HTMLButtonElement>('[data-action="close"]')
  if (title === null || minimize === null || maximize === null || close === null) {
    throw new Error('desktop: custom title bar markup is incomplete')
  }

  const chinese = navigator.language.toLowerCase().startsWith('zh')
  const labels = chinese
    ? { minimize: '最小化', maximize: '最大化', restore: '还原', close: '关闭' }
    : { minimize: 'Minimize', maximize: 'Maximize', restore: 'Restore', close: 'Close' }
  minimize.ariaLabel = labels.minimize
  maximize.ariaLabel = labels.maximize
  close.ariaLabel = labels.close

  minimize.addEventListener('click', () => { ipcRenderer.send('dsh:window:minimize') })
  maximize.addEventListener('click', () => { ipcRenderer.send('dsh:window:toggle-maximize') })
  close.addEventListener('click', () => { ipcRenderer.send('dsh:window:close') })
  const nav = document.querySelector<HTMLElement>('#application-menu')
  const icon = document.querySelector<HTMLImageElement>('#application-icon')
  if (nav === null || icon === null) throw new Error('desktop: custom menu markup is incomplete')
  let signature = ''
  let activeButton: HTMLButtonElement | undefined
  const buttons = (): HTMLButtonElement[] => [...nav.querySelectorAll<HTMLButtonElement>('button')].filter(button => !button.hidden)
  const fit = (): void => {
    const items = [...nav.querySelectorAll<HTMLButtonElement>('button')]
    const more = items.at(-1)
    if (more === undefined) return
    for (const button of items) button.hidden = false
    const budget = Math.max(50, window.innerWidth - (document.querySelector('#dsh-desktop-window-controls')?.clientWidth ?? 138) - 100)
    let width = more.offsetWidth
    let overflow = false
    for (const button of items.slice(0, -1)) {
      width += button.offsetWidth
      button.hidden = overflow || width > budget
      overflow ||= button.hidden
    }
    more.hidden = !overflow
  }
  const popup = (button: HTMLButtonElement): void => {
    activeButton?.setAttribute('aria-expanded', 'false')
    activeButton = button
    button.setAttribute('aria-expanded', 'true')
    const rect = button.getBoundingClientRect()
    ipcRenderer.send('dsh:menu:popup', { group: button.dataset.group, x: rect.left, y: 36 })
  }
  ipcRenderer.on('dsh:menu:state', (_event, state: {
    platform: string
    maximized: boolean
    labels: ReturnType<typeof menuCopy>
    groups: { id: string; label: string }[]
    icon: string
  }) => {
    document.body.dataset.platform = state.platform
    minimize.ariaLabel = state.labels.minimize
    maximize.ariaLabel = state.maximized ? state.labels.restore : state.labels.maximize
    close.ariaLabel = state.labels.close
    maximize.dataset.maximized = String(state.maximized)
    icon.src = state.icon
    const nextSignature = JSON.stringify([state.groups, state.labels.more])
    if (signature === nextSignature) return
    signature = nextSignature
    nav.replaceChildren()
    for (const group of [...state.groups, { id: 'more', label: state.labels.more }]) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'menu-button'
      button.dataset.group = group.id
      button.textContent = group.label
      button.setAttribute('role', 'menuitem')
      button.setAttribute('aria-haspopup', 'menu')
      button.setAttribute('aria-expanded', 'false')
      button.addEventListener('mousedown', (event) => { event.preventDefault() })
      button.addEventListener('click', () => { popup(button) })
      button.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') { event.preventDefault(); popup(button) }
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault()
          const visible = buttons()
          visible[(visible.indexOf(button) + (event.key === 'ArrowLeft' ? -1 : 1) + visible.length) % visible.length]?.focus()
        } else if (event.key === 'Escape') { ipcRenderer.send('dsh:menu:focus-content') }
      })
      nav.append(button)
    }
    fit()
  })
  ipcRenderer.on('dsh:menu:activate', () => { buttons()[0]?.focus() })
  ipcRenderer.on('dsh:menu:closed', () => {
    activeButton?.setAttribute('aria-expanded', 'false')
    activeButton = undefined
  })
  window.addEventListener('resize', fit)
  ipcRenderer.on('dsh:window:maximized', (_event, maximized: boolean) => {
    maximize.dataset.maximized = String(maximized)
    maximize.ariaLabel = maximized ? labels.restore : labels.maximize
  })
  ipcRenderer.on('dsh:window:title', (_event, value: unknown) => {
    if (typeof value === 'string' && value !== '') title.textContent = value
  })
  ipcRenderer.on('dsh:window:theme', (_event, dark: unknown) => {
    if (typeof dark === 'boolean') document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  })
}, { once: true })
