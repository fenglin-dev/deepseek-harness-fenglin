/** Renderer-owned projection of desktop download routing settings. */

import type {
  DesktopDownloadNetworkBridge, DownloadNetworkSettings, DownloadNetworkTarget, DownloadNetworkTestStatus,
  DownloadProxySettings,
} from './bridge.ts'

type PasswordDrafts = Record<DownloadNetworkTarget, string>

/** Immutable state consumed by the download settings presentation. */
export interface DownloadNetworkProjectionSnapshot {
  saved: DownloadNetworkSettings | null
  draft: DownloadNetworkSettings | null
  test: DownloadNetworkTestStatus
  passwords: PasswordDrafts
  busy: DownloadNetworkTarget | null
  error: string | null
}

const EMPTY_PASSWORDS: PasswordDrafts = { application: '', npm: '', github: '' }

function clone(settings: DownloadNetworkSettings): DownloadNetworkSettings { return structuredClone(settings) }

function messageOf(error: unknown): string { return error instanceof Error ? error.message : String(error) }

/** Owns subscriptions, drafts, and operations for the download settings panel. */
export class DownloadNetworkProjection {
  #snapshot: DownloadNetworkProjectionSnapshot = {
    saved: null,
    draft: null,
    test: { phase: 'idle' },
    passwords: EMPTY_PASSWORDS,
    busy: null,
    error: null,
  }
  readonly #listeners = new Set<() => void>()
  #disposers: (() => void)[] = []

  constructor(private readonly bridge: DesktopDownloadNetworkBridge) {}

  /** Read the current immutable presentation state. @returns the current snapshot. */
  getSnapshot = (): DownloadNetworkProjectionSnapshot => this.#snapshot

  /** Subscribe to state changes. @param listener - Callback invoked after publication. @returns the disposer. */
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => { this.#listeners.delete(listener) }
  }

  #publish(patch: Partial<DownloadNetworkProjectionSnapshot>): void {
    this.#snapshot = { ...this.#snapshot, ...patch }
    for (const listener of [...this.#listeners]) {
      try { listener() } catch (error) { console.error('[ui-desktop-shell] download settings listener failed', error) }
    }
  }

  #accept(settings: DownloadNetworkSettings): void {
    if (this.#snapshot.saved !== null && settings.revision < this.#snapshot.saved.revision) return
    this.#publish({ saved: settings, draft: clone(settings) })
  }

  /** Load initial values and subscribe to main-process publications. */
  start(): void {
    this.#disposers = [
      this.bridge.onSettings((settings) => { this.#accept(settings) }),
      this.bridge.onTestStatus((test) => { this.#publish({ test }) }),
    ]
    void Promise.all([this.bridge.get(), this.bridge.getTestStatus()]).then(([settings, test]) => {
      this.#publish({ saved: settings, draft: clone(settings), test })
    }).catch((error: unknown) => { this.#publish({ error: messageOf(error) }) })
  }

  /** Remove bridge subscriptions and presentation observers. */
  dispose(): void {
    for (const dispose of this.#disposers.splice(0)) dispose()
    this.#listeners.clear()
  }

  /** Replace the application source in the unsaved draft.
   * @param source - Selected source.
   */
  setApplicationSource(source: DownloadNetworkSettings['application']['source']): void {
    const draft = this.#snapshot.draft
    if (draft !== null) this.#publish({ draft: { ...draft, application: { ...draft.application, source } } })
  }

  /** Replace the npm registry in the unsaved draft.
   * @param registry - Selected registry.
   */
  setNpmRegistry(registry: DownloadNetworkSettings['npm']['registry']): void {
    const draft = this.#snapshot.draft
    if (draft !== null) this.#publish({ draft: { ...draft, npm: { ...draft.npm, registry } } })
  }

  /** Replace the custom npm registry URL.
   * @param registryUrl - User-entered URL.
   */
  setNpmRegistryUrl(registryUrl: string): void {
    const draft = this.#snapshot.draft
    if (draft !== null) this.#publish({ draft: { ...draft, npm: { ...draft.npm, registryUrl } } })
  }

  /** Replace the GitHub download route.
   * @param download - Selected route.
   */
  setGithubDownload(download: DownloadNetworkSettings['github']['download']): void {
    const draft = this.#snapshot.draft
    if (draft !== null) this.#publish({ draft: { ...draft, github: { ...draft.github, download } } })
  }

  /** Replace the custom GitHub accelerator URL.
   * @param acceleratorUrl - User-entered URL.
   */
  setGithubAcceleratorUrl(acceleratorUrl: string): void {
    const draft = this.#snapshot.draft
    if (draft !== null) this.#publish({ draft: { ...draft, github: { ...draft.github, acceleratorUrl } } })
  }

  /** Replace one target's proxy draft.
   * @param target - Download target.
   * @param proxy - Redacted proxy fields.
   */
  setProxy(target: DownloadNetworkTarget, proxy: DownloadProxySettings): void {
    const draft = this.#snapshot.draft
    if (draft !== null) this.#publish({ draft: { ...draft, [target]: { ...draft[target], proxy } } })
  }

  /** Replace one target's transient password draft.
   * @param target - Download target.
   * @param password - Plaintext draft.
   */
  setPassword(target: DownloadNetworkTarget, password: string): void {
    this.#publish({ passwords: { ...this.#snapshot.passwords, [target]: password } })
  }

  /** Persist one target's validated draft.
   * @param target - Download target.
   */
  async save(target: DownloadNetworkTarget): Promise<void> {
    const draft = this.#snapshot.draft
    if (draft === null) return
    this.#publish({ busy: target, error: null })
    try {
      const password = this.#snapshot.passwords[target]
      const next = target === 'application'
        ? await this.bridge.update({ target, application: { source: draft.application.source, proxy: draft.application.proxy,
          ...(password === '' ? {} : { password }) } })
        : target === 'npm'
          ? await this.bridge.update({ target, npm: { registry: draft.npm.registry,
            ...(draft.npm.registryUrl === undefined ? {} : { registryUrl: draft.npm.registryUrl }),
            proxy: draft.npm.proxy, ...(password === '' ? {} : { password }) } })
          : await this.bridge.update({ target, github: { download: draft.github.download,
            ...(draft.github.acceleratorUrl === undefined ? {} : { acceleratorUrl: draft.github.acceleratorUrl }),
            proxy: draft.github.proxy, ...(password === '' ? {} : { password }) } })
      this.#accept(next)
      this.setPassword(target, '')
    } catch (error) {
      this.#publish({ error: messageOf(error) })
    } finally {
      this.#publish({ busy: null })
    }
  }

  /** Restore one target to its desktop defaults.
   * @param target - Download target.
   */
  async reset(target: DownloadNetworkTarget): Promise<void> {
    this.#publish({ busy: target, error: null })
    try {
      this.#accept(await this.bridge.reset(target))
      this.setPassword(target, '')
    } catch (error) {
      this.#publish({ error: messageOf(error) })
    } finally {
      this.#publish({ busy: null })
    }
  }

  /** Run the bounded main-process connectivity test.
   * @param target - Download target.
   */
  async test(target: DownloadNetworkTarget): Promise<void> {
    try { this.#publish({ test: await this.bridge.test(target), error: null }) } catch (error) {
      this.#publish({ error: messageOf(error) })
    }
  }

  /** Persist the opposite application source and refresh this projection. */
  async switchApplicationSource(): Promise<void> {
    const current = this.#snapshot.saved ?? await this.bridge.get()
    this.#accept(await this.bridge.update({
      target: 'application',
      application: {
        source: current.application.source === 'github' ? 'cnb' : 'github',
        proxy: current.application.proxy,
      },
    }))
  }
}
