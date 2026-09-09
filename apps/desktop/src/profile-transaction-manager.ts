/** Desktop ownership of a staged plugin activation after its producing CLI exits. */
import { lstat, readFile, realpath } from 'node:fs/promises'
import { isAbsolute, join, relative, sep } from 'node:path'
import { inspectProfileMutationLock } from './menu-mutation-guard.ts'

interface PendingTransaction {
  id: string
  producerPid: number
  phase: string
}

/** Narrow CLI and Harness operations used to activate a checked candidate. */
export interface ProfileTransactionManagerOptions {
  readonly home: string
  command(args: readonly string[], token?: string): Promise<void>
  stopHarness(): Promise<void>
  resumeHarness(): void
  onError(error: unknown): void
  onRollback(error: unknown): void
  onActivation(): void
}

function alive(pid: number): boolean {
  try { process.kill(pid, 0); return true } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH'
  }
}

/** Owns activation, readiness confirmation, rollback, and periodic handoff discovery. */
export class ProfileTransactionManager {
  readonly #options: ProfileTransactionManagerOptions
  #timer: NodeJS.Timeout | undefined
  #deadline: NodeJS.Timeout | undefined
  #operation: Promise<void> | undefined
  #checking: string | undefined
  #disposed = false
  #settlement: { id: string; promise: Promise<boolean>; resolve(value: boolean): void; reject(error: unknown): void } | undefined

  constructor(options: ProfileTransactionManagerOptions) { this.#options = options }

  async #pending(): Promise<PendingTransaction | undefined> {
    let source: string
    const path = join(this.#options.home, 'plugin-transactions', 'web', 'pending.json')
    try {
      if (!(await lstat(path)).isFile()) throw new Error('desktop: unsafe plugin transaction journal')
      const child = relative(await realpath(this.#options.home), await realpath(path))
      if (isAbsolute(child) || child === '..' || child.startsWith(`..${sep}`)) throw new Error('desktop: plugin transaction journal escapes its home')
      source = await readFile(path, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
      throw error
    }
    const record = JSON.parse(source) as Partial<PendingTransaction> | null
    if (record === null || typeof record.id !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(record.id)
      || !Number.isSafeInteger(record.producerPid) || (record.producerPid ?? 0) <= 0 || typeof record.phase !== 'string') {
      throw new Error('desktop: invalid plugin transaction journal')
    }
    return record as PendingTransaction
  }

  /** Restore interrupted activation before startup can inspect or repair the active Profile. */
  async recoverBeforeStartup(): Promise<void> {
    const record = await this.#pending()
    if (record === undefined) return
    const lock = inspectProfileMutationLock(this.#options.home)
    if (lock.active || alive(record.producerPid)) return
    await this.#options.command(['transaction', 'rollback', record.id])
  }

  /** Observe new handoffs without spawning a CLI for unchanged state. */
  start(): void {
    if (this.#timer !== undefined || this.#disposed) return
    this.#timer = setInterval(() => {
      if (this.#operation !== undefined || this.#checking !== undefined) return
      this.#run(async () => {
        const record = await this.#pending()
        if (this.#disposed || record === undefined || alive(record.producerPid)) return
        const lock = inspectProfileMutationLock(this.#options.home)
        if (record.phase === 'preparing' && !lock.active) {
          await this.#options.command(['transaction', 'rollback', record.id])
          return
        }
        if (record.phase !== 'prepared') return
        if (lock.pid !== process.pid || lock.workerPid !== undefined) return
        await this.#activate(record.id, true)
      })
    }, 500)
    this.#timer.unref()
  }

  /**
   * Activate a desktop-prepared candidate under its existing lease.
   * @param id - Verified transaction ID returned by the owned CLI.
   * @param resume - False during initial startup, before the Harness supervisor exists.
   */
  async activatePrepared(id: string, resume: boolean): Promise<void> {
    if (this.#disposed || this.#operation !== undefined || this.#checking !== undefined) throw new Error('desktop: another plugin activation is active')
    const operation = (async () => {
      const record = await this.#pending()
      const lock = inspectProfileMutationLock(this.#options.home)
      if (record?.id !== id || record.phase !== 'prepared' || lock.pid !== process.pid || lock.workerPid !== undefined) {
        throw new Error('desktop: prepared plugin transaction is not owned by this desktop')
      }
      await this.#activate(id, resume)
    })()
    this.#operation = operation
    try { await operation } finally { if (this.#operation === operation) this.#operation = undefined }
  }

  /**
   * Wait for normal readiness or rollback, not merely the install command exit.
   * @param id - Transaction activated by this manager.
   * @returns True after commit, false after a complete rollback.
   */
  waitForSettlement(id: string): Promise<boolean> {
    if (this.#settlement?.id !== id) return Promise.reject(new Error('desktop: plugin activation is not tracked'))
    return this.#settlement.promise
  }

  async #activate(id: string, resume: boolean): Promise<void> {
    const deferred = Promise.withResolvers<boolean>()
    // Startup has no awaiting caller; the failure still reaches onError.
    void deferred.promise.catch(() => {})
    this.#settlement = { id, ...deferred }
    this.#options.onActivation()
    await this.#options.stopHarness()
    if (!this.#canContinue()) throw new Error('desktop: plugin activation was cancelled')
    try {
      await this.#options.command(['transaction', 'activate', id], id)
      this.#checking = id
      this.#deadline = setTimeout(() => { this.failed() }, 30_000)
      if (resume) this.#options.resumeHarness()
    } catch (error) {
      await this.#rollback(id)
      this.#options.onRollback(error)
    }
  }

  #run(operation: () => Promise<void>): void {
    if (this.#disposed || this.#operation !== undefined) return
    const pending = operation().catch((error: unknown) => {
      if (this.#timer !== undefined) clearInterval(this.#timer)
      this.#timer = undefined
      this.#clearDeadline()
      this.#settlement?.reject(error)
      this.#options.onError(error)
    }).finally(() => {
      if (this.#operation === pending) this.#operation = undefined
    })
    this.#operation = pending
  }

  #canContinue(): boolean { return !this.#disposed }

  #clearDeadline(): void {
    if (this.#deadline !== undefined) clearTimeout(this.#deadline)
    this.#deadline = undefined
  }

  async #release(id: string): Promise<void> {
    await this.#options.command(['snapshot', 'end-restore-lease'], id)
  }

  async #rollback(id: string): Promise<void> {
    this.#clearDeadline()
    await this.#options.stopHarness()
    await this.#options.command(['transaction', 'rollback', id], id)
    await this.#release(id)
    this.#checking = undefined
    if (this.#settlement?.id === id) this.#settlement.resolve(false)
    if (!this.#disposed) this.#options.resumeHarness()
  }

  /** Commit a candidate only after both ordinary-Profile readiness markers arrive. */
  ready(): void {
    if (this.#operation !== undefined) { void this.#operation.then(() => { this.ready() }); return }
    const id = this.#checking
    if (id === undefined) return
    this.#clearDeadline()
    this.#run(async () => {
      await this.#options.command(['transaction', 'commit', id], id)
      await this.#release(id)
      this.#checking = undefined
      if (this.#settlement?.id === id) this.#settlement.resolve(true)
    })
  }

  /** Stop a failed candidate and restore its managed files and complete dependency directory. */
  failed(): void {
    if (this.#operation !== undefined) { void this.#operation.then(() => { this.failed() }); return }
    const id = this.#checking
    if (id !== undefined) this.#run(() => this.#rollback(id))
  }

  /** Cancel discovery and wait for the supervisor-owned command to finish or be aborted. */
  async dispose(): Promise<void> {
    this.#disposed = true
    if (this.#timer !== undefined) clearInterval(this.#timer)
    this.#timer = undefined
    this.#clearDeadline()
    this.#settlement?.reject(new Error('desktop: plugin activation cancelled during shutdown'))
    await this.#operation
  }
}
