/** Fenglin: filesystem discovery of user agent presets under `$DSH_HOME/.agent-presets`. */

import { readdir, readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { load } from 'js-yaml'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'
import { entryListProblem } from './definition.ts'
import type { PresetDefinition } from './definition.ts'

/** Directory name under dshHome holding locally authored presets. */
export const USER_PRESET_DIR = '.agent-presets'

/** Composition file that makes a directory a preset. */
export const COMPOSITION_FILE = 'agent.cordis.yml'

/** Display metadata file beside a composition. */
export const METADATA_FILE = 'preset.yml'

const PRESET_ID = /^[a-z0-9][a-z0-9-]*$/

/** Resolve the Harness home without a home-paths dependency (DSH_HOME, else ~/.dsh). */
export function resolveUserPresetHome(): string {
  const fromEnv = process.env.DSH_HOME
  const selected = fromEnv !== undefined && fromEnv.trim().length > 0 ? fromEnv : join(homedir(), '.dsh')
  return resolve(selected.startsWith('~') ? join(homedir(), selected.slice(1).replace(/^[\\/]/, '')) : selected)
}

async function isFile(path: string): Promise<boolean> {
  try { return (await stat(path)).isFile() } catch { return false }
}

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/** Load display metadata (name/description/order) from preset.yml. */
export async function readPresetMetadata(directory: string): Promise<{
  name?: string
  description?: string
  order?: number
}> {
  let raw: string
  try { raw = await readFile(join(directory, METADATA_FILE), { encoding: 'utf8' }) } catch { return {} }
  let parsed: unknown
  try { parsed = load(raw, { schema: entryListSchema }) } catch { return {} }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
  const record = parsed as Record<string, unknown>
  const name = text(record.name)
  const description = text(record.description)
  const order = typeof record.order === 'number' && Number.isFinite(record.order) ? record.order : undefined
  return {
    ...(name === undefined ? {} : { name }),
    ...(description === undefined ? {} : { description }),
    ...(order === undefined ? {} : { order }),
  }
}

/**
 * Scan `$DSH_HOME/.agent-presets` for directories named as valid preset ids.
 * Each directory must contain agent.cordis.yml; metadata is optional.
 * @param dshHome - Active Harness data home.
 * @returns Definitions ready for registry.register(), missing files skipped.
 */
export async function discoverUserPresets(dshHome: string = resolveUserPresetHome()): Promise<PresetDefinition[]> {
  const root = join(dshHome, USER_PRESET_DIR)
  let children: Array<{ name: string; isDirectory(): boolean }>
  try {
    children = await readdir(root, { withFileTypes: true, encoding: 'utf8' })
  } catch {
    return []
  }
  const found: PresetDefinition[] = []
  for (const child of children) {
    const name = typeof child.name === 'string' ? child.name : String(child.name)
    if (!child.isDirectory() || !PRESET_ID.test(name)) continue
    const directory = join(root, name)
    const composition = join(directory, COMPOSITION_FILE)
    if (!await isFile(composition)) continue
    let raw: string
    try { raw = await readFile(composition, { encoding: 'utf8' }) } catch { continue }
    let plugins: unknown
    try { plugins = load(raw, { schema: entryListSchema }) } catch (error) {
      console.warn(`agent-presets: cannot parse ${composition}: ${String(error)}`)
      continue
    }
    if (entryListProblem(plugins) !== undefined) continue
    const metadata = await readPresetMetadata(directory)
    found.push({
      id: name,
      ...(metadata.name === undefined ? {} : { name: metadata.name }),
      ...(metadata.description === undefined ? {} : { description: metadata.description }),
      ...(metadata.order === undefined ? {} : { order: metadata.order }),
      plugins: plugins as PresetDefinition['plugins'],
    })
  }
  return found.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.id.localeCompare(b.id))
}
