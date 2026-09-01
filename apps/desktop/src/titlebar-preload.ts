/** Minimal IPC wiring for the desktop-owned custom title bar. */

import { ipcRenderer } from 'electron'

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
