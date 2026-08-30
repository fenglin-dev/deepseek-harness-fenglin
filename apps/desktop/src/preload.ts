/** Narrow update bridge plus desktop-owned Windows and Linux title-bar chrome. */

import { contextBridge, ipcRenderer } from 'electron'
import type { OpenLogResult } from './log-reveal.ts'
import type { DesktopPreferences, DesktopPreferencesPatch } from './preferences.ts'
import type { DesktopReleaseStatus } from './release-checker.ts'
import type { DesktopReleaseDownloadStatus } from './release-downloader.ts'
import type { SourceUpdateResult, SourceUpdateStatus } from './source-updater.ts'
import type { DesktopCliStatus } from './desktop-cli-registration.ts'
import type { DesktopChatBackground } from './chat-background-store.ts'
import type {
  BundledPluginDeferredStartResult,
  BundledPluginInstallSnapshot,
  BundledPluginStartResult,
} from './bundled-plugin-installer.ts'
import type { ImportedPluginRestoreSnapshot } from './imported-plugin-restore.ts'
import type {
  DiagnosticLabRunSnapshot,
  DiagnosticLabScenario,
  DiagnosticLabStartRequest,
} from './diagnostic-lab.ts'
import { CUSTOM_WINDOW_TITLE_BAR_HEIGHT, usesCustomWindowFrame } from './window-frame.ts'
import {
  parseDesktopStartupProgress,
  type DesktopStartupProgress,
  type DesktopStartupStage,
} from './startup-progress.ts'

/** Renderer-visible update methods; no generic process or filesystem access is exposed. */
export interface DesktopUpdateBridge {
  check(): Promise<SourceUpdateStatus>
  upgrade(expectedCommit: string): Promise<SourceUpdateResult>
  restart(): Promise<{ restarting: true }>
}

const bridge: DesktopUpdateBridge = {
  check: () => ipcRenderer.invoke('dsh:source-update:check') as Promise<SourceUpdateStatus>,
  upgrade: expectedCommit => ipcRenderer.invoke('dsh:source-update:upgrade', expectedCommit) as Promise<SourceUpdateResult>,
  restart: () => ipcRenderer.invoke('dsh:source-update:restart') as Promise<{ restarting: true }>,
}

/** Capability flags returned by the trusted main process. */
export interface DesktopCapabilities {
  platform: NodeJS.Platform
  packaged: boolean
  launchAtLoginAvailable: boolean
  sourceUpdateAvailable: boolean
  commandLineAvailable: boolean
}

/** Narrow desktop-shell preference and diagnostics bridge. */
export interface DesktopShellBridge {
  getCapabilities(): Promise<DesktopCapabilities>
  getPreferences(): Promise<DesktopPreferences>
  updatePreferences(patch: DesktopPreferencesPatch): Promise<DesktopPreferences>
  onPreferences(callback: (preferences: DesktopPreferences) => void): () => void
  openLog(): Promise<OpenLogResult>
  restart(): Promise<{ restarting: true }>
  getCommandLine(): Promise<DesktopCliStatus>
  installCommandLine(force: boolean): Promise<DesktopCliStatus>
  removeCommandLine(): Promise<DesktopCliStatus>
  reportReadiness(phase: 'client' | 'event-dispatch'): void
}

/** Release discovery and verified system-assisted installer download bridge. */
export interface DesktopReleasesBridge {
  getStatus(): Promise<DesktopReleaseStatus>
  check(): Promise<DesktopReleaseStatus>
  onStatus(callback: (status: DesktopReleaseStatus) => void): () => void
  openDownload(releaseUrl: string): Promise<{ error: string }>
  getDownloadStatus(): Promise<DesktopReleaseDownloadStatus>
  startDownload(): Promise<DesktopReleaseDownloadStatus>
  cancelDownload(): Promise<DesktopReleaseDownloadStatus>
  openInstaller(): Promise<{ error: string }>
  onDownloadStatus(callback: (status: DesktopReleaseDownloadStatus) => void): () => void
}

/** Exact allowlisted bundled-plugin operations; no arbitrary package path is exposed. */
export interface DesktopBundledPluginsBridge {
  startInstall(request: { profile: string; packageSpec: string }): Promise<BundledPluginStartResult>
  startDeferred(request: { profile: string; packageSpec: string }): Promise<BundledPluginDeferredStartResult>
  getInstall(installId: string): Promise<BundledPluginInstallSnapshot>
}

/** Opaque-id restore operations; package specs never cross from renderer to main. */
export interface DesktopImportedPluginsBridge {
  readonly development?: true
  get(): Promise<ImportedPluginRestoreSnapshot | undefined>
  checkSources(): Promise<ImportedPluginRestoreSnapshot | undefined>
  start(restoreIds: readonly string[]): Promise<ImportedPluginRestoreSnapshot>
  chooseLocalDirectory(restoreId: string): Promise<ImportedPluginRestoreSnapshot | undefined>
  chooseLocalArchive(restoreId: string): Promise<ImportedPluginRestoreSnapshot | undefined>
  dismiss(): Promise<ImportedPluginRestoreSnapshot | undefined>
  ignore(): Promise<ImportedPluginRestoreSnapshot | undefined>
}

/** Fixed desktop diagnostic exercises; no renderer-supplied path or command is accepted. */
export interface DesktopDiagnosticLabBridge {
  catalog(): Promise<readonly DiagnosticLabScenario[]>
  current(): Promise<DiagnosticLabRunSnapshot | undefined>
  start(request: DiagnosticLabStartRequest): Promise<DiagnosticLabRunSnapshot>
  getRun(runId: string): Promise<DiagnosticLabRunSnapshot>
  cancel(runId: string): Promise<DiagnosticLabRunSnapshot>
  restoreAll(runId: string): Promise<DiagnosticLabRunSnapshot>
  exportReport(runId: string): Promise<string>
  onStatus(callback: (snapshot: DiagnosticLabRunSnapshot) => void): () => void
}

/** Device-local background persistence owned by the desktop data directory. */
export interface DesktopChatBackgroundBridge {
  read(): Promise<DesktopChatBackground | undefined>
  write(background: DesktopChatBackground): Promise<DesktopChatBackground>
}

const shellBridge: DesktopShellBridge = {
  getCapabilities: () => ipcRenderer.invoke('dsh:desktop:capabilities') as Promise<DesktopCapabilities>,
  getPreferences: () => ipcRenderer.invoke('dsh:desktop:preferences:get') as Promise<DesktopPreferences>,
  updatePreferences: patch => ipcRenderer.invoke('dsh:desktop:preferences:update', patch) as Promise<DesktopPreferences>,
  onPreferences(callback) {
    const listener = (_event: Electron.IpcRendererEvent, next: DesktopPreferences): void => { callback(next) }
    ipcRenderer.on('dsh:desktop:preferences', listener)
    return () => { ipcRenderer.removeListener('dsh:desktop:preferences', listener) }
  },
  openLog: () => ipcRenderer.invoke('dsh:desktop:log:open') as Promise<OpenLogResult>,
  restart: () => ipcRenderer.invoke('dsh:desktop:restart') as Promise<{ restarting: true }>,
  getCommandLine: () => ipcRenderer.invoke('dsh:desktop:cli:get') as Promise<DesktopCliStatus>,
  installCommandLine: force => ipcRenderer.invoke('dsh:desktop:cli:install', force) as Promise<DesktopCliStatus>,
  removeCommandLine: () => ipcRenderer.invoke('dsh:desktop:cli:remove') as Promise<DesktopCliStatus>,
  reportReadiness: (phase) => { ipcRenderer.send('dsh:desktop:readiness', phase) },
}

const releasesBridge: DesktopReleasesBridge = {
  getStatus: () => ipcRenderer.invoke('dsh:desktop:releases:get') as Promise<DesktopReleaseStatus>,
  check: () => ipcRenderer.invoke('dsh:desktop:releases:check') as Promise<DesktopReleaseStatus>,
  onStatus(callback) {
    const listener = (_event: Electron.IpcRendererEvent, next: DesktopReleaseStatus): void => { callback(next) }
    ipcRenderer.on('dsh:desktop:release-status', listener)
    return () => { ipcRenderer.removeListener('dsh:desktop:release-status', listener) }
  },
  openDownload: releaseUrl => ipcRenderer.invoke('dsh:desktop:releases:open', releaseUrl) as Promise<{ error: string }>,
  getDownloadStatus: () => ipcRenderer.invoke(
    'dsh:desktop:releases:download:get',
  ) as Promise<DesktopReleaseDownloadStatus>,
  startDownload: () => ipcRenderer.invoke(
    'dsh:desktop:releases:download:start',
  ) as Promise<DesktopReleaseDownloadStatus>,
  cancelDownload: () => ipcRenderer.invoke(
    'dsh:desktop:releases:download:cancel',
  ) as Promise<DesktopReleaseDownloadStatus>,
  openInstaller: () => ipcRenderer.invoke(
    'dsh:desktop:releases:download:open',
  ) as Promise<{ error: string }>,
  onDownloadStatus(callback) {
    const listener = (_event: Electron.IpcRendererEvent, next: DesktopReleaseDownloadStatus): void => { callback(next) }
    ipcRenderer.on('dsh:desktop:release-download-status', listener)
    return () => { ipcRenderer.removeListener('dsh:desktop:release-download-status', listener) }
  },
}

const bundledPluginsBridge: DesktopBundledPluginsBridge = {
  startInstall: request => ipcRenderer.invoke('dsh:desktop:bundled-plugins:start', request) as Promise<BundledPluginStartResult>,
  startDeferred: request => ipcRenderer.invoke('dsh:desktop:bundled-plugins:start-deferred', request) as Promise<BundledPluginDeferredStartResult>,
  getInstall: installId => ipcRenderer.invoke('dsh:desktop:bundled-plugins:get', installId) as Promise<BundledPluginInstallSnapshot>,
}

const importedPluginsBridge: DesktopImportedPluginsBridge = {
  get: () => ipcRenderer.invoke('dsh:desktop:imported-plugins:get') as Promise<ImportedPluginRestoreSnapshot | undefined>,
  checkSources: () => ipcRenderer.invoke(
    'dsh:desktop:imported-plugins:check-sources',
  ) as Promise<ImportedPluginRestoreSnapshot | undefined>,
  start: restoreIds => ipcRenderer.invoke(
    'dsh:desktop:imported-plugins:start', [...restoreIds],
  ) as Promise<ImportedPluginRestoreSnapshot>,
  chooseLocalDirectory: restoreId => ipcRenderer.invoke(
    'dsh:desktop:imported-plugins:choose-directory', restoreId,
  ) as Promise<ImportedPluginRestoreSnapshot | undefined>,
  chooseLocalArchive: restoreId => ipcRenderer.invoke(
    'dsh:desktop:imported-plugins:choose-archive', restoreId,
  ) as Promise<ImportedPluginRestoreSnapshot | undefined>,
  dismiss: () => ipcRenderer.invoke(
    'dsh:desktop:imported-plugins:dismiss',
  ) as Promise<ImportedPluginRestoreSnapshot | undefined>,
  ignore: () => ipcRenderer.invoke(
    'dsh:desktop:imported-plugins:ignore',
  ) as Promise<ImportedPluginRestoreSnapshot | undefined>,
}

const diagnosticLabBridge: DesktopDiagnosticLabBridge = {
  catalog: () => ipcRenderer.invoke('dsh:desktop:diagnostic-lab:catalog') as Promise<readonly DiagnosticLabScenario[]>,
  current: () => ipcRenderer.invoke('dsh:desktop:diagnostic-lab:current') as Promise<DiagnosticLabRunSnapshot | undefined>,
  start: request => ipcRenderer.invoke('dsh:desktop:diagnostic-lab:start', request) as Promise<DiagnosticLabRunSnapshot>,
  getRun: runId => ipcRenderer.invoke('dsh:desktop:diagnostic-lab:get', runId) as Promise<DiagnosticLabRunSnapshot>,
  cancel: runId => ipcRenderer.invoke('dsh:desktop:diagnostic-lab:cancel', runId) as Promise<DiagnosticLabRunSnapshot>,
  restoreAll: runId => ipcRenderer.invoke('dsh:desktop:diagnostic-lab:restore-all', runId) as Promise<DiagnosticLabRunSnapshot>,
  exportReport: runId => ipcRenderer.invoke('dsh:desktop:diagnostic-lab:export', runId) as Promise<string>,
  onStatus(callback) {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: DiagnosticLabRunSnapshot): void => { callback(snapshot) }
    ipcRenderer.on('dsh:desktop:diagnostic-lab:status', listener)
    return () => { ipcRenderer.removeListener('dsh:desktop:diagnostic-lab:status', listener) }
  },
}

const chatBackgroundBridge: DesktopChatBackgroundBridge = {
  read: () => ipcRenderer.invoke('dsh:desktop:chat-background:read') as Promise<DesktopChatBackground | undefined>,
  write: background => ipcRenderer.invoke(
    'dsh:desktop:chat-background:write', background,
  ) as Promise<DesktopChatBackground>,
}

const sourceMode = process.argv.includes('--dsh-source')
contextBridge.exposeInMainWorld('deepSeekHarnessDesktop', Object.freeze({
  shell: Object.freeze(shellBridge),
  releases: Object.freeze(releasesBridge),
  bundledPlugins: Object.freeze(bundledPluginsBridge),
  importedPlugins: Object.freeze(sourceMode
    ? { ...importedPluginsBridge, development: true as const }
    : importedPluginsBridge),
  diagnosticLab: Object.freeze(diagnosticLabBridge),
  chatBackground: Object.freeze(chatBackgroundBridge),
  ...(sourceMode ? {
    updater: Object.freeze(bridge),
  } : {}),
}))

type DesktopThemeSource = 'system' | 'light' | 'dark'

function readDesktopThemeSource(): DesktopThemeSource | undefined {
  const source = document.documentElement.getAttribute('data-dsh-color-scheme-source')
  return source === 'system' || source === 'light' || source === 'dark' ? source : undefined
}

function installDesktopThemeSync(): void {
  const root = document.documentElement
  let published: DesktopThemeSource | undefined
  const publish = (): void => {
    const source = readDesktopThemeSource()
    if (source === undefined || source === published) return
    published = source
    ipcRenderer.send('dsh:desktop:theme-source', source)
  }
  publish()
  const observer = new MutationObserver(publish)
  observer.observe(root, { attributes: true, attributeFilter: ['data-dsh-color-scheme-source'] })
  window.addEventListener('unload', () => { observer.disconnect() }, { once: true })
}

function installLoadingPage(): void {
  if (!location.pathname.endsWith('/loading.html')) return
  const query = new URLSearchParams(location.search)
  const chinese = navigator.language.toLowerCase().startsWith('zh')
  const copy = chinese
    ? {
      startupTitle: '正在启动 DeepSeek Harness',
      startupDescription: '正在准备本地运行环境与预设插件。会话和凭据仅保存在本机。',
      title: 'DeepSeek Harness 启动失败',
      description: '内置 Harness 连续三次未能完成启动。你可以重试或打开日志目录查看详情。',
      retry: '重新启动',
      logs: '打开日志目录',
      logLabel: '日志：',
      slow: '启动时间较长，你可以打开 Harness 日志查看当前进度。',
      stages: {
        'preparing-desktop': '正在准备桌面环境',
        'preparing-runtime': '正在准备内置运行时',
        'checking-profile': '正在检查插件兼容性',
        'verifying-plugin': '正在校验插件',
        'extracting-plugin': '正在解压插件',
        'configuring-plugin': '正在配置插件',
        'starting-harness': '正在启动 Harness',
        'restarting-harness': '正在重新启动 Harness',
        ready: '启动完成',
      } satisfies Record<DesktopStartupStage, string>,
    }
    : {
      startupTitle: 'Starting DeepSeek Harness',
      startupDescription: 'Preparing the local runtime and preset plugins. Your sessions and credentials stay on this machine.',
      title: 'DeepSeek Harness could not start',
      description: 'The embedded Harness failed to become ready after three attempts. Retry or open the log folder for details.',
      retry: 'Retry',
      logs: 'Open log folder',
      logLabel: 'Log: ',
      slow: 'Startup is taking longer than expected. Open the Harness log to inspect its progress.',
      stages: {
        'preparing-desktop': 'Preparing desktop environment',
        'preparing-runtime': 'Preparing the embedded runtime',
        'checking-profile': 'Checking plugin compatibility',
        'verifying-plugin': 'Verifying plugin',
        'extracting-plugin': 'Extracting plugin',
        'configuring-plugin': 'Configuring plugin',
        'starting-harness': 'Starting Harness',
        'restarting-harness': 'Restarting Harness',
        ready: 'Startup complete',
      } satisfies Record<DesktopStartupStage, string>,
    }
  const title = document.querySelector<HTMLElement>('#title')
  const description = document.querySelector<HTMLElement>('#description')
  const progress = document.querySelector<HTMLElement>('#progress')
  const progressSurface = document.querySelector<HTMLElement>('#progress-surface')
  const progressBar = document.querySelector<HTMLElement>('#progress-bar')
  const progressTask = document.querySelector<HTMLElement>('#progress-task')
  const progressPercent = document.querySelector<HTMLElement>('#progress-percent')
  const failure = document.querySelector<HTMLElement>('#failure')
  const message = document.querySelector<HTMLElement>('#failure-message')
  const logPath = document.querySelector<HTMLElement>('#log-path')
  const retry = document.querySelector<HTMLButtonElement>('#retry')
  const openLogs = document.querySelector<HTMLButtonElement>('#open-logs')
  const slow = document.querySelector<HTMLElement>('#slow')
  const slowMessage = document.querySelector<HTMLElement>('#slow-message')
  const openSlowLog = document.querySelector<HTMLButtonElement>('#open-slow-log')
  if (
    title === null || description === null || progress === null || progressSurface === null
    || progressBar === null || progressTask === null || progressPercent === null || failure === null
    || message === null || logPath === null || retry === null || openLogs === null
    || slow === null || slowMessage === null || openSlowLog === null
  ) return
  title.textContent = copy.startupTitle
  description.textContent = copy.startupDescription
  const renderProgress = (snapshot: DesktopStartupProgress): void => {
    const value = snapshot.progress
    progressBar.style.width = `${value}%`
    progressPercent.textContent = `${value}%`
    progressTask.textContent = snapshot.detail === undefined
      ? copy.stages[snapshot.stage]
      : `${copy.stages[snapshot.stage]} · ${snapshot.detail}`
    progress.setAttribute('aria-valuenow', String(value))
    progress.setAttribute('aria-valuetext', progressTask.textContent)
  }
  const initial = parseDesktopStartupProgress({
    stage: query.get('stage'),
    progress: Number(query.get('progress')),
    detail: query.get('detail') ?? undefined,
  })
  if (initial !== undefined) renderProgress(initial)
  const progressListener = (_event: Electron.IpcRendererEvent, value: unknown): void => {
    const snapshot = parseDesktopStartupProgress(value)
    if (snapshot !== undefined) renderProgress(snapshot)
  }
  ipcRenderer.on('dsh:startup-progress', progressListener)
  window.addEventListener('unload', () => {
    ipcRenderer.removeListener('dsh:startup-progress', progressListener)
  }, { once: true })
  void ipcRenderer.invoke('dsh:desktop:startup-progress:get').then((value: unknown) => {
    const snapshot = parseDesktopStartupProgress(value)
    if (snapshot !== undefined) renderProgress(snapshot)
  }, () => {
    // The query snapshot remains usable if navigation starts before the reply.
  })
  const openLog = (): void => { void ipcRenderer.invoke('dsh:desktop:log:open') }
  openLogs.textContent = copy.logs
  openSlowLog.textContent = copy.logs
  openLogs.addEventListener('click', openLog)
  openSlowLog.addEventListener('click', openLog)
  if (query.get('state') !== 'failed') {
    setTimeout(() => {
      slowMessage.textContent = copy.slow
      slow.hidden = false
    }, 15_000)
    return
  }
  title.textContent = copy.title
  description.textContent = copy.description
  message.textContent = query.get('message') ?? copy.description
  logPath.textContent = `${copy.logLabel}${query.get('logPath') ?? ''}`
  retry.textContent = copy.retry
  progressSurface.hidden = true
  failure.hidden = false
  retry.addEventListener('click', () => {
    retry.disabled = true
    void ipcRenderer.invoke('dsh:harness:retry').finally(() => { retry.disabled = false })
  })
}

const TITLE_BAR_STYLE = `
  html.dsh-desktop-custom-frame {
    box-sizing: border-box !important;
    height: 100%;
    overflow: hidden;
    padding-top: ${CUSTOM_WINDOW_TITLE_BAR_HEIGHT}px !important;
  }
  html.dsh-desktop-custom-frame body {
    box-sizing: border-box;
    height: 100% !important;
    margin: 0 !important;
    min-height: 100% !important;
  }
  html.dsh-desktop-custom-frame #root {
    transform: translateZ(0) !important;
  }
  #dsh-desktop-titlebar {
    -webkit-app-region: drag;
    align-items: center;
    background: color-mix(in srgb, var(--dsw-alias-bg-base, #fff) 94%, transparent);
    border-bottom: 1px solid var(--dsw-alias-border-l2, rgb(0 0 0 / 10%));
    color: var(--dsw-alias-label-primary, #171719);
    display: flex;
    font-family: var(--dsw-font-family, "Segoe UI", sans-serif);
    height: ${CUSTOM_WINDOW_TITLE_BAR_HEIGHT}px;
    inset: 0 0 auto;
    position: fixed;
    user-select: none;
    z-index: 2147483647;
  }
  #dsh-desktop-titlebar-title {
    flex: 1;
    font-size: 12px;
    font-weight: 500;
    line-height: ${CUSTOM_WINDOW_TITLE_BAR_HEIGHT}px;
    min-width: 0;
    overflow: hidden;
    padding: 0 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  #dsh-desktop-window-controls {
    -webkit-app-region: no-drag;
    align-self: stretch;
    display: flex;
  }
  .dsh-desktop-window-control {
    appearance: none;
    background: transparent;
    border: 0;
    color: inherit;
    height: ${CUSTOM_WINDOW_TITLE_BAR_HEIGHT}px;
    margin: 0;
    outline: none;
    padding: 0;
    position: relative;
    width: 46px;
  }
  .dsh-desktop-window-control:hover { background: var(--dsw-alias-bg-mask-2, rgb(0 0 0 / 8%)); }
  .dsh-desktop-window-control:focus-visible { box-shadow: inset 0 0 0 2px #4176e6; }
  .dsh-desktop-window-control[data-action="close"]:hover { background: #c42b1c; color: #fff; }
  .dsh-desktop-window-control::before,
  .dsh-desktop-window-control::after {
    box-sizing: border-box;
    content: "";
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
  }
  .dsh-desktop-window-control[data-action="minimize"]::before { border-top: 1px solid currentColor; width: 10px; }
  .dsh-desktop-window-control[data-action="maximize"]::before { border: 1px solid currentColor; height: 10px; width: 10px; }
  .dsh-desktop-window-control[data-action="maximize"][data-maximized="true"]::before {
    height: 8px;
    margin: 1px 0 0 -1px;
    width: 8px;
  }
  .dsh-desktop-window-control[data-action="maximize"][data-maximized="true"]::after {
    border: 1px solid currentColor;
    height: 8px;
    margin: -2px 0 0 2px;
    width: 8px;
  }
  .dsh-desktop-window-control[data-action="close"]::before,
  .dsh-desktop-window-control[data-action="close"]::after { border-top: 1px solid currentColor; width: 12px; }
  .dsh-desktop-window-control[data-action="close"]::before { transform: translate(-50%, -50%) rotate(45deg); }
  .dsh-desktop-window-control[data-action="close"]::after { transform: translate(-50%, -50%) rotate(-45deg); }
  @media (prefers-color-scheme: dark) {
    #dsh-desktop-titlebar { background: color-mix(in srgb, var(--dsw-alias-bg-base, #202024) 94%, transparent); color: var(--dsw-alias-label-primary, #f4f4f5); }
  }
`

function installCustomTitleBar(): void {
  const root = document.documentElement
  root.classList.add('dsh-desktop-custom-frame')

  const style = document.createElement('style')
  style.id = 'dsh-desktop-titlebar-style'
  style.textContent = TITLE_BAR_STYLE
  document.head.append(style)

  // Force inline styles — highest priority, cannot be overridden by the web app's CSS.
  root.style.setProperty('padding-top', `${CUSTOM_WINDOW_TITLE_BAR_HEIGHT}px`, 'important')
  root.style.setProperty('box-sizing', 'border-box', 'important')
  const rootEl = document.getElementById('root')
  if (rootEl) rootEl.style.setProperty('transform', 'translateZ(0)', 'important')

  const titleBar = document.createElement('header')
  titleBar.id = 'dsh-desktop-titlebar'
  titleBar.setAttribute('role', 'banner')

  const title = document.createElement('div')
  title.id = 'dsh-desktop-titlebar-title'
  const syncTitle = (): void => {
    title.textContent = document.title || 'DeepSeek Harness'
  }
  syncTitle()
  const documentTitle = document.querySelector('title')
  if (documentTitle !== null) new MutationObserver(syncTitle).observe(documentTitle, { childList: true })
  titleBar.append(title)

  const controls = document.createElement('div')
  controls.id = 'dsh-desktop-window-controls'
  const chinese = navigator.language.toLowerCase().startsWith('zh')
  const labels = chinese
    ? { minimize: '最小化', maximize: '最大化', restore: '还原', close: '关闭' }
    : { minimize: 'Minimize', maximize: 'Maximize', restore: 'Restore', close: 'Close' }

  const minimize = document.createElement('button')
  minimize.className = 'dsh-desktop-window-control'
  minimize.dataset.action = 'minimize'
  minimize.type = 'button'
  minimize.ariaLabel = labels.minimize
  minimize.addEventListener('click', () => {
    ipcRenderer.send('dsh:window:minimize')
  })

  const maximize = document.createElement('button')
  maximize.className = 'dsh-desktop-window-control'
  maximize.dataset.action = 'maximize'
  maximize.dataset.maximized = 'false'
  maximize.type = 'button'
  maximize.ariaLabel = labels.maximize
  maximize.addEventListener('click', () => {
    ipcRenderer.send('dsh:window:toggle-maximize')
  })
  ipcRenderer.on('dsh:window:maximized', (_event, maximized: boolean) => {
    maximize.dataset.maximized = String(maximized)
    maximize.ariaLabel = maximized ? labels.restore : labels.maximize
  })

  const close = document.createElement('button')
  close.className = 'dsh-desktop-window-control'
  close.dataset.action = 'close'
  close.type = 'button'
  close.ariaLabel = labels.close
  close.addEventListener('click', () => {
    ipcRenderer.send('dsh:window:close')
  })

  controls.append(minimize, maximize, close)
  titleBar.append(controls)
  document.body.prepend(titleBar)
}

window.addEventListener('DOMContentLoaded', () => {
  installDesktopThemeSync()
  installLoadingPage()
  if (usesCustomWindowFrame(process.platform)) installCustomTitleBar()
}, { once: true })
