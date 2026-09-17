/** Product defaults applied only while creating a new desktop-owned Profile. */

import { lstat, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { isMap, parseDocument } from 'yaml'
import type { DesktopDataHomeSetup } from './desktop-data-home.ts'

const BETTER_SIDEBAR_NAMESPACE = 'dsh-better-sidebar'

/**
 * Disable Better Sidebar's duplicate terminal surface for a newly created
 * community Profile. Imported, reused, copied, explicit and existing homes are
 * user-owned and must retain their settings unchanged.
 *
 * Existing namespace values also win, including a user-created settings file
 * that raced with first start.
 */
export async function applyFreshProfileDefaults(
  home: string,
  setup: DesktopDataHomeSetup | undefined,
): Promise<boolean> {
  if (setup?.mode !== 'fresh' && setup?.mode !== 'created') return false
  const path = join(home, 'settings.yaml')
  let source = '{}\n'
  try {
    const stat = await lstat(path)
    if (!stat.isFile()) throw new Error('desktop: settings.yaml must be a regular file')
    source = await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const document = parseDocument(source, { uniqueKeys: true })
  if (document.errors.length > 0) throw new Error(`desktop: settings.yaml is invalid: ${document.errors[0]?.message ?? 'unknown YAML error'}`)
  if (document.contents !== null && !isMap(document.contents)) {
    throw new Error('desktop: settings.yaml root must be a mapping')
  }
  if (document.has(BETTER_SIDEBAR_NAMESPACE)) return false
  document.set(BETTER_SIDEBAR_NAMESPACE, {
    bottomPanelAutoTerminal: false,
    tabsEnabled: { terminal: false },
  })
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  const temporary = `${path}.${process.pid}.desktop-defaults.tmp`
  await writeFile(temporary, document.toString(), { encoding: 'utf8', mode: 0o600 })
  await rename(temporary, path)
  return true
}
