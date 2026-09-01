/** Narrow update bridge for the trusted Harness renderer. */

import { contextBridge, ipcRenderer } from 'electron'
import type { OpenLogResult } from './log-reveal.ts'
import type { DesktopPreferences, DesktopPreferencesPatch } from './preferences.ts'
import type { DesktopReleaseStatus } from './release-checker.ts'
import type { DesktopReleaseDownloadStatus } from './release-downloader.ts'
import type { SourceUpdateResult, SourceUpdateStatus } from './source-updater.ts'
import type { DesktopCliStatus } from './desktop-cli-registration.ts'
import type {
  DesktopDataHomeSelectionResult,
  DesktopDataHomeSelectionKind,
  DesktopDataHomeStatus,
  DesktopDataHomeSwitchRequest,
  DesktopDataHomeSwitchResult,
} from './desktop-data-home.ts'
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
  getDataHome(): Promise<DesktopDataHomeStatus>
  chooseDataHome(kind: DesktopDataHomeSelectionKind): Promise<DesktopDataHomeSelectionResult>
  switchDataHome(request: DesktopDataHomeSwitchRequest): Promise<DesktopDataHomeSwitchResult>
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
  getDataHome: () => ipcRenderer.invoke('dsh:desktop:data-home:get') as Promise<DesktopDataHomeStatus>,
  chooseDataHome: kind => ipcRenderer.invoke(
    'dsh:desktop:data-home:choose', kind,
  ) as Promise<DesktopDataHomeSelectionResult>,
  switchDataHome: request => ipcRenderer.invoke(
    'dsh:desktop:data-home:switch', request,
  ) as Promise<DesktopDataHomeSwitchResult>,
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
      switchDataHome: '切换配置目录',
      logs: '打开日志目录',
      logLabel: '日志：',
      invalidDataHome: '请选择受支持的 DSH 配置目录，或选择一个完全空的目录来新建配置。',
      unreadableDataHome: '无法读取所选目录，请检查目录权限后重试。',
      unchangedDataHome: '当前已在使用这个配置目录，请选择其他目录。',
      switchDataHomeFailed: '配置目录切换失败，请重试或查看日志。',
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
      switchDataHome: 'Switch data directory',
      logs: 'Open log folder',
      logLabel: 'Log: ',
      invalidDataHome: 'Choose a supported DSH data directory, or a completely empty folder for a new configuration.',
      unreadableDataHome: 'The selected directory cannot be read. Check its permissions and try again.',
      unchangedDataHome: 'This configuration directory is already active. Choose a different directory.',
      switchDataHomeFailed: 'Could not switch the configuration directory. Retry or inspect the log.',
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
  const switchDataHome = document.querySelector<HTMLButtonElement>('#switch-data-home')
  const openLogs = document.querySelector<HTMLButtonElement>('#open-logs')
  const directoryError = document.querySelector<HTMLElement>('#directory-error')
  const slow = document.querySelector<HTMLElement>('#slow')
  const slowMessage = document.querySelector<HTMLElement>('#slow-message')
  const openSlowLog = document.querySelector<HTMLButtonElement>('#open-slow-log')
  if (
    title === null || description === null || progress === null || progressSurface === null
    || progressBar === null || progressTask === null || progressPercent === null || failure === null
    || message === null || logPath === null || retry === null || switchDataHome === null
    || openLogs === null || directoryError === null
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
  switchDataHome.textContent = copy.switchDataHome
  progressSurface.hidden = true
  failure.hidden = false
  retry.addEventListener('click', () => {
    retry.disabled = true
    void ipcRenderer.invoke('dsh:harness:retry').finally(() => { retry.disabled = false })
  })
  const showDirectoryError = (value: string): void => {
    directoryError.textContent = value
    directoryError.hidden = false
  }
  switchDataHome.addEventListener('click', () => {
    switchDataHome.disabled = true
    directoryError.hidden = true
    void ipcRenderer.invoke('dsh:desktop:data-home:choose-recovery').then(async (value) => {
      const selection = value as DesktopDataHomeSelectionResult
      if (selection.status === 'cancelled') return
      if (selection.status !== 'selected') {
        showDirectoryError(selection.status === 'unreadable'
          ? copy.unreadableDataHome
          : copy.invalidDataHome)
        return
      }
      const request: DesktopDataHomeSwitchRequest = selection.selectionKind === 'empty'
        ? { kind: 'create', selectionId: selection.selectionId }
        : { kind: 'custom', selectionId: selection.selectionId }
      const switched = await ipcRenderer.invoke(
        'dsh:desktop:data-home:switch', request,
      ) as DesktopDataHomeSwitchResult
      if (!switched.restarting) showDirectoryError(copy.unchangedDataHome)
    }).catch(() => {
      showDirectoryError(copy.switchDataHomeFailed)
    }).finally(() => {
      switchDataHome.disabled = false
    })
  })
  void ipcRenderer.invoke('dsh:desktop:data-home:get').then((value) => {
    const status = value as DesktopDataHomeStatus
    if (status.managedExternally) switchDataHome.hidden = true
  }, () => {
    // Keep the recovery action visible when capability probing fails.
  })
}

window.addEventListener('DOMContentLoaded', () => {
  installDesktopThemeSync()
  installLoadingPage()
}, { once: true })
