/**
 * Production client composition without the page: mount the Loader over a
 * module system, create every manifest row, wait for quiescence, and audit
 * activation. `AppWebEntry` and the whole-client test carrier both call it.
 * @module @deepseek-ai/dsh-client-web/src/boot-client
 */
import type { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import type { BootManifest, ClientModuleLoader } from '@deepseek-ai/dsh-client-modules/client'
import { STATE_LABELS } from './loader-status.ts'

/** Entry state label as the boot page renders it. */
export type EntryStateLabel = (typeof STATE_LABELS)[keyof typeof STATE_LABELS] | 'loading' | 'failed'

/** Inputs of {@link bootClient}. */
export interface ClientBootOptions {
  /** Fresh root Context that will own the plugin tree. */
  readonly ctx: Context
  /** Module system installed as `loader.internal`. */
  readonly modules: ClientModuleLoader
  /** Parsed manifest whose `plugins` rows become Loader entries (entry name = row id). */
  readonly manifest: BootManifest
  /** Per-entry state reporting (the boot page); omitted when no one renders progress. */
  readonly onEntryState?: (name: string, state: EntryStateLabel) => void
}

/**
 * Compose the client: `ctx.plugin(Loader)`, `loader.internal = modules`, one
 * `loader.create({ name })` per manifest row, `loader.await()`, then
 * {@link assertEntriesActive}. A row whose module cannot be imported is marked
 * failed; the Loader logs its import error and the audit rejects startup only
 * when an official application-shell entry did not activate.
 * @param options - context, module system, manifest, optional progress sink.
 * @returns resolves after required entries are active; rejects with their audit report otherwise.
 */
export async function bootClient(options: ClientBootOptions): Promise<void> {
  const { ctx, manifest, onEntryState } = options
  await ctx.plugin(Loader)
  const loader = ctx.loader
  loader.internal = options.modules as never

  ctx.on('internal/status', (fiber) => {
    const entry = fiber.entry
    if (entry === undefined || entry.fiber === undefined) return
    onEntryState?.(entry.options.name, STATE_LABELS[entry.fiber.state])
  })

  const rows = manifest.plugins.map(row => row.id)
  for (const name of rows) onEntryState?.(name, 'loading')
  await options.modules.entries.start(loader, manifest)
  for (const entry of loader.entries()) {
    if (entry.fiber === undefined) onEntryState?.(entry.options.name, 'failed')
  }

  await loader.await()
  assertEntriesActive(ctx)
}

/** Official client packages are part of the application shell; external packages are optional extensions. */
function isRequiredEntry(name: string): boolean {
  return name.startsWith('@deepseek-ai/')
}

/**
 * Audit entries that failed import/apply or still wait on missing services.
 * External package failures are warnings; official application-shell failures
 * remain fatal.
 * @param ctx - root Context carrying the Loader.
 * @throws {Error} listing every non-active required entry with its reason.
 */
export function assertEntriesActive(ctx: Context): void {
  const requiredFailures: string[] = []
  const optionalFailures: string[] = []
  for (const entry of ctx.loader.entries()) {
    const name = entry.options.name
    if (entry.fiber === undefined) {
      const failures = isRequiredEntry(name) ? requiredFailures : optionalFailures
      failures.push(`${name}: import failed (see console for the import error)`)
      continue
    }
    const state = STATE_LABELS[entry.fiber.state]
    if (state === 'active') continue
    if (state === 'pending') {
      const missing = Object.keys(entry.fiber.inject).filter(service => ctx.get(service) === undefined)
      const failures = isRequiredEntry(name) ? requiredFailures : optionalFailures
      failures.push(`${name}: pending (waiting for service${missing.length === 1 ? '' : 's'}: ${missing.join(', ') || 'unknown'})`)
    } else {
      const failures = isRequiredEntry(name) ? requiredFailures : optionalFailures
      failures.push(`${name}: ${state}`)
    }
  }
  if (optionalFailures.length > 0) {
    ctx.logger.warn(`web boot: optional client plugin${optionalFailures.length === 1 ? '' : 's'} did not activate\n${optionalFailures.join('\n')}`)
  }
  if (requiredFailures.length > 0) {
    throw new Error(`web boot: ${String(requiredFailures.length)} entr${requiredFailures.length === 1 ? 'y' : 'ies'} did not activate\n${requiredFailures.join('\n')}`)
  }
}
