/** Download, verification, shared-cache, and per-Profile state for optional workspace runtimes. */

import { createHash, randomUUID } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { lstat, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, normalize, posix, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { t, x } from 'tar'
import {
  WORKSPACE_RUNTIME_CAPABILITIES,
  type WorkspaceRuntimeArtifact,
  type WorkspaceRuntimeCapability,
  type WorkspaceRuntimeManifest,
  type WorkspaceRuntimeTarget,
} from './workspace-runtime-manifest.ts'

export type WorkspaceRuntimePhase =
  | 'not-installed' | 'downloading' | 'paused' | 'verifying' | 'waiting-restart'
  | 'enabled' | 'needs-update' | 'cleaning' | 'failed' | 'unsupported' | 'nas-unavailable'

export interface WorkspaceRuntimeCapabilityStatus {
  readonly capabilityId: WorkspaceRuntimeCapability
  readonly phase: WorkspaceRuntimePhase
  readonly message?: string
  readonly jobId?: string
  readonly transferredBytes?: number
  readonly totalBytes?: number
  readonly percent?: number
}

export interface WorkspaceRuntimeSnapshot {
  readonly currentHome: string
  readonly target?: WorkspaceRuntimeTarget
  readonly sharedPayload?: { readonly payloadDigest: string; readonly path: string; readonly desktopVersion: string }
  readonly capabilities: Readonly<Record<WorkspaceRuntimeCapability, WorkspaceRuntimeCapabilityStatus>>
}

export interface WorkspaceRuntimeJobSnapshot {
  readonly jobId: string
  readonly capabilityId: WorkspaceRuntimeCapability
  readonly phase: 'running' | 'paused' | 'succeeded' | 'cancelled' | 'failed'
  readonly stage: 'resolving' | 'downloading' | 'verifying' | 'extracting' | 'ready'
  readonly transferredBytes: number
  readonly totalBytes?: number
  readonly percent?: number
  readonly message?: string
}

export interface WorkspaceRuntimeOutputRead {
  readonly text: string
  readonly nextOffset: number
  readonly lossy: boolean
  readonly settled: boolean
}

interface RuntimeReference {
  payloadDigest: string
  desktopVersion: string
  state: 'pending-enable' | 'enabled' | 'pending-remove' | 'cleaning'
}

interface HomeRecord {
  office?: RuntimeReference
  ptc?: RuntimeReference
}

interface PersistedState {
  schema: 'open-dsh-desktop/workspace-runtimes/v1'
  homes: Record<string, HomeRecord>
  pendingCleanup: string[]
}

interface Job {
  snapshot: WorkspaceRuntimeJobSnapshot
  artifact?: WorkspaceRuntimeArtifact
  controller?: AbortController
  output: string
  outputBase: number
  completion?: Promise<void>
}

export interface OptionalRuntimeManagerOptions {
  readonly cacheRoot: string
  readonly stateFile: string
  readonly desktopVersion: string
  readonly platform: NodeJS.Platform
  readonly arch: string
  readonly getHome: () => string
  readonly isNas: () => boolean
  readonly source: () => 'github' | 'cnb'
  readonly loadManifest: () => Promise<WorkspaceRuntimeManifest>
  readonly fetch: (input: string, init?: RequestInit) => Promise<Response>
  readonly target?: WorkspaceRuntimeTarget
  readonly maxOutputBytes?: number
}

const MAX_ARCHIVE_ENTRIES = 100_000
const MAX_EXTRACTED_BYTES = 4 * 1024 * 1024 * 1024

function emptyState(): PersistedState {
  return { schema: 'open-dsh-desktop/workspace-runtimes/v1', homes: {}, pendingCleanup: [] }
}

function normalizedHome(home: string): string {
  return normalize(resolve(home))
}

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('desktop: invalid workspace-runtime state')
  }
  return value as Record<string, unknown>
}

function reference(value: unknown): RuntimeReference | undefined {
  if (value === undefined) return undefined
  const record = object(value)
  if (Object.keys(record).some(key => !['payloadDigest', 'desktopVersion', 'state'].includes(key))
    || typeof record.payloadDigest !== 'string' || !/^[a-f0-9]{64}$/u.test(record.payloadDigest)
    || typeof record.desktopVersion !== 'string'
    || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(record.desktopVersion)
    || !['pending-enable', 'enabled', 'pending-remove', 'cleaning'].includes(String(record.state))) {
    throw new TypeError('desktop: invalid workspace-runtime state')
  }
  return record as unknown as RuntimeReference
}

function persistedState(value: unknown): PersistedState {
  const root = object(value)
  if (root.schema !== 'open-dsh-desktop/workspace-runtimes/v1') {
    throw new TypeError('desktop: invalid workspace-runtime state')
  }
  const homesSource = object(root.homes)
  const homes: Record<string, HomeRecord> = {}
  for (const [home, value] of Object.entries(homesSource)) {
    if (normalizedHome(home) !== home) throw new TypeError('desktop: invalid workspace-runtime state')
    const source = object(value)
    if (Object.keys(source).some(key => !WORKSPACE_RUNTIME_CAPABILITIES.includes(key as WorkspaceRuntimeCapability))) {
      throw new TypeError('desktop: invalid workspace-runtime state')
    }
    const record = { office: reference(source.office), ptc: reference(source.ptc) }
    homes[home] = {
      ...(record.office === undefined ? {} : { office: record.office }),
      ...(record.ptc === undefined ? {} : { ptc: record.ptc }),
    }
  }
  if (!Array.isArray(root.pendingCleanup)
    || !root.pendingCleanup.every(value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value))
    || new Set(root.pendingCleanup).size !== root.pendingCleanup.length) {
    throw new TypeError('desktop: invalid workspace-runtime state')
  }
  return { schema: root.schema, homes, pendingCleanup: root.pendingCleanup as string[] }
}

async function exists(path: string): Promise<boolean> {
  try { await lstat(path); return true } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer)
  return hash.digest('hex')
}

function cloneSnapshot(job: Job): WorkspaceRuntimeJobSnapshot {
  return { ...job.snapshot }
}

/** Deep module that hides all optional-runtime persistence and archive handling from IPC callers. */
export class OptionalRuntimeManager {
  readonly #options: OptionalRuntimeManagerOptions
  readonly #jobs = new Map<string, Job>()
  #state: PersistedState | undefined

  constructor(options: OptionalRuntimeManagerOptions) {
    this.#options = options
  }

  async #readState(): Promise<PersistedState> {
    if (this.#state !== undefined) return this.#state
    try {
      const state = persistedState(JSON.parse(await readFile(this.#options.stateFile, 'utf8')) as unknown)
      this.#state = state
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error
      this.#state = emptyState()
    }
    return this.#state
  }

  async #writeState(): Promise<void> {
    const state = await this.#readState()
    await mkdir(dirname(this.#options.stateFile), { recursive: true })
    const temporary = `${this.#options.stateFile}.${randomUUID()}.tmp`
    await writeFile(temporary, `${JSON.stringify(state, undefined, 2)}\n`, { mode: 0o600 })
    await rename(temporary, this.#options.stateFile)
  }

  #target(): WorkspaceRuntimeTarget | undefined { return this.#options.target }

  #supported(capability: WorkspaceRuntimeCapability): boolean {
    if (this.#target() === undefined) return false
    return capability !== 'ptc' || this.#options.platform === 'darwin' || this.#options.platform === 'linux'
  }

  async get(): Promise<WorkspaceRuntimeSnapshot> {
    const home = normalizedHome(this.#options.getHome())
    const state = await this.#readState()
    const record = state.homes[home] ?? {}
    const target = this.#target()
    const currentJob = (capability: WorkspaceRuntimeCapability): Job | undefined => [...this.#jobs.values()].reverse()
      .find(job => job.snapshot.capabilityId === capability
        && !['succeeded', 'cancelled'].includes(job.snapshot.phase))
    const capability = (capabilityId: WorkspaceRuntimeCapability): WorkspaceRuntimeCapabilityStatus => {
      if (this.#options.isNas()) return { capabilityId, phase: 'nas-unavailable' }
      if (!this.#supported(capabilityId)) return { capabilityId, phase: 'unsupported' }
      const job = currentJob(capabilityId)
      if (job !== undefined) return {
        capabilityId,
        phase: job.snapshot.phase === 'failed' ? 'failed'
          : job.snapshot.phase === 'paused' ? 'paused'
            : job.snapshot.stage === 'verifying' ? 'verifying'
              : job.snapshot.phase === 'running' ? 'downloading' : 'not-installed',
        ...(job.snapshot.message === undefined ? {} : { message: job.snapshot.message }),
        jobId: job.snapshot.jobId,
        transferredBytes: job.snapshot.transferredBytes,
        ...(job.snapshot.totalBytes === undefined ? {} : { totalBytes: job.snapshot.totalBytes }),
        ...(job.snapshot.percent === undefined ? {} : { percent: job.snapshot.percent }),
      }
      const reference = record[capabilityId]
      if (reference === undefined) return { capabilityId, phase: 'not-installed' }
      if (reference.state === 'cleaning') return { capabilityId, phase: 'cleaning' }
      if (reference.state === 'pending-enable' || reference.state === 'pending-remove') {
        return { capabilityId, phase: 'waiting-restart' }
      }
      if (reference.desktopVersion !== this.#options.desktopVersion) return { capabilityId, phase: 'needs-update' }
      return { capabilityId, phase: 'enabled' }
    }
    const reference = [record.office, record.ptc].find(value => value?.state !== 'cleaning')
    return {
      currentHome: home,
      ...(target === undefined ? {} : { target }),
      ...(reference === undefined ? {} : {
        sharedPayload: {
          payloadDigest: reference.payloadDigest,
          path: join(this.#options.cacheRoot, reference.payloadDigest, target ?? 'unsupported'),
          desktopVersion: reference.desktopVersion,
        },
      }),
      capabilities: { office: capability('office'), ptc: capability('ptc') },
    }
  }

  start(capabilityId: WorkspaceRuntimeCapability): Promise<WorkspaceRuntimeJobSnapshot> {
    try {
      this.#assertCapability(capabilityId)
      if (this.#options.isNas()) throw new Error('desktop: workspace runtimes are unavailable in NAS mode')
      if (!this.#supported(capabilityId)) throw new Error('desktop: workspace runtime capability is unsupported on this platform')
      const existing = [...this.#jobs.values()].find(job => job.snapshot.capabilityId === capabilityId
        && (job.snapshot.phase === 'running' || job.snapshot.phase === 'paused'))
      if (existing !== undefined) {
        if (existing.snapshot.phase === 'paused') this.#resume(existing)
        return Promise.resolve(cloneSnapshot(existing))
      }
      if ([...this.#jobs.values()].some(job => job.snapshot.phase === 'running' || job.snapshot.phase === 'paused')) {
        throw new Error('desktop: another workspace-runtime download is active')
      }
      const job: Job = {
        snapshot: {
          jobId: randomUUID(), capabilityId, phase: 'running', stage: 'resolving', transferredBytes: 0,
        },
        output: '', outputBase: 0,
      }
      this.#jobs.set(job.snapshot.jobId, job)
      this.#resume(job)
      return Promise.resolve(cloneSnapshot(job))
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)))
    }
  }

  getJob(jobId: string): WorkspaceRuntimeJobSnapshot {
    const job = this.#requireJob(jobId)
    return cloneSnapshot(job)
  }

  readOutput(jobId: string, offset: number): WorkspaceRuntimeOutputRead {
    const job = this.#requireJob(jobId)
    if (!Number.isSafeInteger(offset) || offset < 0) throw new TypeError('desktop: invalid workspace-runtime output offset')
    const start = Math.max(0, offset - job.outputBase)
    return {
      text: job.output.slice(start),
      nextOffset: job.outputBase + job.output.length,
      lossy: offset < job.outputBase,
      settled: !['running', 'paused'].includes(job.snapshot.phase),
    }
  }

  async pause(jobId: string): Promise<WorkspaceRuntimeJobSnapshot> {
    const job = this.#requireJob(jobId)
    if (job.snapshot.phase === 'running') {
      job.snapshot = { ...job.snapshot, phase: 'paused' }
      job.controller?.abort('paused')
      await job.completion?.catch(() => undefined)
      this.#append(job, 'Download paused; the verified partial file is retained for resume.\n')
    }
    return cloneSnapshot(job)
  }

  async cancel(jobId: string): Promise<WorkspaceRuntimeJobSnapshot> {
    const job = this.#requireJob(jobId)
    job.snapshot = { ...job.snapshot, phase: 'cancelled' }
    job.controller?.abort('cancelled')
    await job.completion?.catch(() => undefined)
    const artifact = job.artifact
    const target = this.#target()
    if (artifact !== undefined && target !== undefined) await rm(this.#partialPath(artifact, target), { force: true })
    this.#append(job, 'Download cancelled; the partial file was removed.\n')
    return cloneSnapshot(job)
  }

  async activate(capabilityId: WorkspaceRuntimeCapability): Promise<WorkspaceRuntimeSnapshot> {
    this.#assertCapability(capabilityId)
    if (this.#options.isNas()) throw new Error('desktop: workspace runtimes are unavailable in NAS mode')
    if (!this.#supported(capabilityId)) throw new Error('desktop: workspace runtime capability is unsupported on this platform')
    const manifest = await this.#options.loadManifest()
    this.#assertManifest(manifest)
    const target = this.#target() as WorkspaceRuntimeTarget
    const artifact = manifest.artifacts[target]
    const payloadRoot = this.payloadRoot(artifact)
    if (!await exists(join(payloadRoot, 'runtime.json'))) throw new Error('desktop: workspace runtime must be downloaded before activation')
    await this.#validatePayload(payloadRoot, artifact)
    const home = normalizedHome(this.#options.getHome())
    const state = await this.#readState()
    if (state.pendingCleanup.includes(artifact.payloadDigest)) {
      await this.#collectUnused()
      if (state.pendingCleanup.includes(artifact.payloadDigest)) {
        throw new Error('desktop: workspace runtime is waiting for cleanup and cannot be re-enabled')
      }
      if (!await exists(join(payloadRoot, 'runtime.json'))) {
        throw new Error('desktop: workspace runtime must be downloaded again after cleanup')
      }
    }
    const record = state.homes[home] ??= {}
    const previous = record[capabilityId]
    if (previous !== undefined && previous.payloadDigest !== artifact.payloadDigest
      && !state.pendingCleanup.includes(previous.payloadDigest)) state.pendingCleanup.push(previous.payloadDigest)
    record[capabilityId] = { payloadDigest: artifact.payloadDigest, desktopVersion: manifest.desktopVersion, state: 'pending-enable' }
    await this.#writeState()
    return this.get()
  }

  async remove(capabilityId: WorkspaceRuntimeCapability): Promise<WorkspaceRuntimeSnapshot> {
    this.#assertCapability(capabilityId)
    if (this.#options.isNas()) throw new Error('desktop: workspace runtimes are unavailable in NAS mode')
    const home = normalizedHome(this.#options.getHome())
    const state = await this.#readState()
    const record = state.homes[home] ??= {}
    const reference = record[capabilityId]
    if (reference !== undefined) record[capabilityId] = { ...reference, state: 'pending-remove' }
    await this.#writeState()
    return this.get()
  }

  async pending(home = this.#options.getHome()): Promise<Readonly<Record<WorkspaceRuntimeCapability, 'enable' | 'remove' | undefined>>> {
    const record = (await this.#readState()).homes[normalizedHome(home)] ?? {}
    const pending = (capability: WorkspaceRuntimeCapability): 'enable' | 'remove' | undefined => {
      const state = record[capability]?.state
      return state === 'pending-enable' ? 'enable' : state === 'pending-remove' ? 'remove' : undefined
    }
    return { office: pending('office'), ptc: pending('ptc') }
  }

  async reference(
    home: string,
    capability: WorkspaceRuntimeCapability,
  ): Promise<{ payloadRoot: string; desktopVersion: string } | undefined> {
    const target = this.#target()
    const value = (await this.#readState()).homes[normalizedHome(home)]?.[capability]
    if (value === undefined || value.state === 'cleaning' || target === undefined) return undefined
    return { payloadRoot: join(this.#options.cacheRoot, value.payloadDigest, target), desktopVersion: value.desktopVersion }
  }

  async commitPending(home = this.#options.getHome()): Promise<void> {
    const key = normalizedHome(home)
    const state = await this.#readState()
    const record = state.homes[key]
    if (record === undefined) return
    for (const capability of WORKSPACE_RUNTIME_CAPABILITIES) {
      const reference = record[capability]
      if (reference?.state === 'pending-enable') record[capability] = { ...reference, state: 'enabled' }
      else if (reference?.state === 'pending-remove') {
        if (!state.pendingCleanup.includes(reference.payloadDigest)) state.pendingCleanup.push(reference.payloadDigest)
        record[capability] = { ...reference, state: 'cleaning' }
      }
    }
    await this.#writeState()
    await this.#collectUnused()
  }

  payloadRoot(artifact: WorkspaceRuntimeArtifact): string {
    return join(this.#options.cacheRoot, artifact.payloadDigest, artifact.target)
  }

  async dispose(): Promise<void> {
    for (const job of this.#jobs.values()) job.controller?.abort('desktop shutdown')
    await Promise.allSettled([...this.#jobs.values()].flatMap(job => job.completion === undefined ? [] : [job.completion]))
  }

  #resume(job: Job): void {
    job.snapshot = { ...job.snapshot, phase: 'running' }
    const controller = new AbortController()
    job.controller = controller
    job.completion = this.#run(job, controller.signal).catch((error: unknown) => {
      if (job.snapshot.phase === 'paused' || job.snapshot.phase === 'cancelled') return
      job.snapshot = { ...job.snapshot, phase: 'failed', message: error instanceof Error ? error.message : String(error) }
      this.#append(job, `Failed: ${job.snapshot.message ?? 'unknown error'}\n`)
    })
  }

  async #run(job: Job, signal: AbortSignal): Promise<void> {
    const manifest = await this.#options.loadManifest()
    this.#assertManifest(manifest)
    const target = this.#target() as WorkspaceRuntimeTarget
    const artifact = manifest.artifacts[target]
    job.artifact = artifact
    const payloadRoot = this.payloadRoot(artifact)
    if (await exists(join(payloadRoot, 'runtime.json'))) {
      try {
        await this.#validatePayload(payloadRoot, artifact)
        job.snapshot = { ...job.snapshot, phase: 'succeeded', stage: 'ready', transferredBytes: artifact.size, totalBytes: artifact.size, percent: 100 }
        this.#append(job, 'Verified workspace runtime is already present in the shared cache.\n')
        return
      } catch {
        await rm(payloadRoot, { recursive: true, force: true })
        this.#append(job, 'Discarded an incomplete shared runtime before downloading a clean payload.\n')
      }
    }
    await mkdir(join(this.#options.cacheRoot, '.downloads'), { recursive: true })
    const part = this.#partialPath(artifact, target)
    const transferred = await this.#download(job, artifact, part, signal)
    signal.throwIfAborted()
    job.snapshot = { ...job.snapshot, stage: 'verifying', transferredBytes: transferred, totalBytes: artifact.size, percent: 100 }
    this.#append(job, 'Verifying SHA-256 and archive policy.\n')
    if (transferred !== artifact.size) throw new Error(`desktop: workspace-runtime archive size mismatch (${transferred}/${artifact.size})`)
    if (await sha256File(part) !== artifact.sha256) {
      await rm(part, { force: true })
      throw new Error('desktop: workspace-runtime archive SHA-256 mismatch')
    }
    const staging = await mkdtemp(join(this.#options.cacheRoot, '.extract-'))
    try {
      job.snapshot = { ...job.snapshot, stage: 'extracting' }
      await this.#inspectArchive(part)
      await x({ file: part, cwd: staging, strict: true, preservePaths: false })
      const extracted = join(staging, 'workspace-runtime')
      await this.#validatePayload(extracted, artifact)
      await mkdir(dirname(payloadRoot), { recursive: true })
      if (!await exists(payloadRoot)) await rename(extracted, payloadRoot)
      await rm(part, { force: true })
    } finally {
      await rm(staging, { recursive: true, force: true })
    }
    job.snapshot = { ...job.snapshot, phase: 'succeeded', stage: 'ready', transferredBytes: artifact.size, totalBytes: artifact.size, percent: 100 }
    this.#append(job, 'Workspace runtime downloaded and verified. Choose activate, then quick restart.\n')
  }

  async #download(job: Job, artifact: WorkspaceRuntimeArtifact, part: string, signal: AbortSignal): Promise<number> {
    let offset = 0
    try { offset = (await stat(part)).size } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    if (offset > artifact.size) { await rm(part, { force: true }); offset = 0 }
    const url = this.#options.source() === 'cnb' ? artifact.cnbUrl : artifact.githubUrl
    this.#append(job, `${offset > 0 ? 'Resuming' : 'Downloading'} ${artifact.fileName}.\n`)
    const response = await this.#options.fetch(url, {
      signal,
      redirect: 'follow',
      headers: offset > 0 ? { Range: `bytes=${offset}-` } : {},
    })
    if (!response.ok || response.body === null) throw new Error(`desktop: workspace-runtime download returned HTTP ${response.status}`)
    const append = offset > 0 && response.status === 206
    if (append && !response.headers.get('content-range')?.startsWith(`bytes ${offset}-`)) {
      throw new Error('desktop: workspace-runtime resume response has an invalid Content-Range')
    }
    if (!append) offset = 0
    const declared = Number(response.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > artifact.size - offset) {
      throw new Error('desktop: workspace-runtime response exceeds the signed archive size')
    }
    job.snapshot = { ...job.snapshot, stage: 'downloading', transferredBytes: offset, totalBytes: artifact.size,
      percent: Math.floor(offset * 100 / artifact.size) }
    const reader = Readable.fromWeb(response.body as never)
    reader.on('data', (chunk: Buffer) => {
      offset += chunk.length
      job.snapshot = { ...job.snapshot, transferredBytes: offset, totalBytes: artifact.size,
        percent: Math.min(100, Math.floor(offset * 100 / artifact.size)) }
    })
    await pipeline(reader, createWriteStream(part, { flags: append ? 'a' : 'w', mode: 0o600 }), { signal })
    return offset
  }

  async #inspectArchive(path: string): Promise<void> {
    let entries = 0
    let bytes = 0
    await t({
      file: path,
      strict: true,
      onReadEntry: (entry) => {
        entries += 1
        bytes += entry.size
        const normalized = entry.path.replace(/\\/gu, '/')
        const relativePath = posix.relative('workspace-runtime', normalized)
        if (entries > MAX_ARCHIVE_ENTRIES || bytes > MAX_EXTRACTED_BYTES
          || normalized.startsWith('/') || normalized.includes('\0')
          || relativePath === '..' || relativePath.startsWith('../')
          || !['File', 'Directory'].includes(entry.type)) {
          throw new Error('desktop: workspace-runtime archive violates extraction policy')
        }
      },
    })
  }

  async #collectUnused(): Promise<void> {
    const state = await this.#readState()
    const retained = new Set<string>()
    for (const record of Object.values(state.homes)) {
      if (record.office !== undefined && record.office.state !== 'cleaning') retained.add(record.office.payloadDigest)
      if (record.ptc !== undefined && record.ptc.state !== 'cleaning') retained.add(record.ptc.payloadDigest)
    }
    for (const digest of [...state.pendingCleanup]) {
      if (!retained.has(digest)) {
        try { await rm(join(this.#options.cacheRoot, digest), { recursive: true, force: true }) }
        catch { continue }
      }
      state.pendingCleanup = state.pendingCleanup.filter(value => value !== digest)
      for (const record of Object.values(state.homes)) {
        if (record.office?.state === 'cleaning' && record.office.payloadDigest === digest) delete record.office
        if (record.ptc?.state === 'cleaning' && record.ptc.payloadDigest === digest) delete record.ptc
      }
      state.homes = Object.fromEntries(Object.entries(state.homes)
        .filter(([, record]) => record.office !== undefined || record.ptc !== undefined))
    }
    await this.#writeState()
  }

  async #validatePayload(root: string, artifact: WorkspaceRuntimeArtifact): Promise<void> {
    const value: unknown = JSON.parse(await readFile(join(root, 'runtime.json'), 'utf8'))
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('desktop: workspace-runtime payload metadata is invalid')
    const manifest = value as Record<string, unknown>
    const [platform, arch] = artifact.target.split('-')
    if (manifest.schema !== 'dsh/workspace-runtime-payload/v1'
      || manifest.desktopVersion !== this.#options.desktopVersion
      || manifest.platform !== platform || manifest.arch !== arch
      || manifest.payloadDigest !== artifact.payloadDigest || manifest.pythonVersion !== artifact.pythonVersion) {
      throw new Error('desktop: workspace-runtime payload identity does not match the signed catalog')
    }
    const pythonRoot = join(root, 'python')
    const python = platform === 'win32' ? join(pythonRoot, 'python.exe') : join(pythonRoot, 'bin', 'python3')
    const packages = platform === 'win32'
      ? join(pythonRoot, 'Lib', 'site-packages')
      : join(pythonRoot, 'lib', `python${artifact.pythonVersion.split('.').slice(0, 2).join('.')}`, 'site-packages')
    const [pythonStat, packagesStat] = await Promise.all([lstat(python), lstat(packages)])
    if (pythonStat.isSymbolicLink() || packagesStat.isSymbolicLink()
      || !pythonStat.isFile() || !packagesStat.isDirectory()) {
      throw new Error('desktop: workspace-runtime payload is incomplete')
    }
  }

  #partialPath(artifact: WorkspaceRuntimeArtifact, target: WorkspaceRuntimeTarget): string {
    return join(this.#options.cacheRoot, '.downloads', `${artifact.payloadDigest}-${target}.part`)
  }

  #append(job: Job, text: string): void {
    job.output += text
    const limit = this.#options.maxOutputBytes ?? 64 * 1024
    if (Buffer.byteLength(job.output) <= limit) return
    const before = job.output.length
    job.output = job.output.slice(-limit)
    job.outputBase += before - job.output.length
  }

  #assertManifest(manifest: WorkspaceRuntimeManifest): void {
    const now = Date.now()
    if (manifest.desktopVersion !== this.#options.desktopVersion) throw new Error('desktop: workspace-runtime manifest is for another Desktop version')
    if (Date.parse(manifest.issuedAt) > now + 10 * 60_000 || Date.parse(manifest.expiresAt) <= now) {
      throw new Error('desktop: workspace-runtime manifest is expired or not yet valid')
    }
  }

  #assertCapability(capability: string): asserts capability is WorkspaceRuntimeCapability {
    if (!WORKSPACE_RUNTIME_CAPABILITIES.includes(capability as WorkspaceRuntimeCapability)) {
      throw new TypeError('desktop: unknown workspace-runtime capability')
    }
  }

  #requireJob(jobId: string): Job {
    if (typeof jobId !== 'string' || !/^[0-9a-f-]{36}$/u.test(jobId)) throw new TypeError('desktop: invalid workspace-runtime job id')
    const job = this.#jobs.get(jobId)
    if (job === undefined) throw new Error('desktop: workspace-runtime job was not found')
    return job
  }
}
