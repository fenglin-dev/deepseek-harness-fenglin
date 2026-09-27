/** Fenglin: keep profile pnpm installs working with third-party optional platform packages. */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseDocument } from 'yaml'

/**
 * Optional platform binaries that must never be required on this install.
 * `@xmanrui/dsh-im` pulls `@tencent-qqmail/agently-cli`, which ships one
 * optional package per OS/CPU. pnpm 11 can fail a whole `add`/`update` with
 * `unsupported_platform` when it evaluates a wrong-arch optional (observed as
 * `gently-cli-win32-arm64` in market logs on win32-x64). Ignoring the foreign
 * binaries keeps marketplace updates working; the matching win32-x64 package
 * is still allowed.
 */
export const IGNORED_OPTIONAL_DEPENDENCIES = Object.freeze([
  '@tencent-qqmail/agently-cli-darwin-arm64',
  '@tencent-qqmail/agently-cli-darwin-x64',
  '@tencent-qqmail/agently-cli-linux-arm64',
  '@tencent-qqmail/agently-cli-linux-x64',
  '@tencent-qqmail/agently-cli-win32-arm64',
  'sharp-darwin-arm64',
  'sharp-darwin-x64',
  'sharp-linux-arm',
  'sharp-linux-arm64',
  'sharp-linux-x64',
  'sharp-linuxmusl-arm64',
  'sharp-linuxmusl-x64',
  'sharp-win32-arm64',
])

/**
 * Merge `ignoredOptionalDependencies` into a profile pnpm-workspace.yaml.
 * Existing keys and allowBuilds rules are preserved; only missing ignore entries are added.
 * @param profileDir - Profile directory containing pnpm-workspace.yaml.
 * @returns true when the file changed.
 */
export async function ensureIgnoredOptionalDependencies(profileDir: string): Promise<boolean> {
  const path = join(profileDir, 'pnpm-workspace.yaml')
  let source: string
  try {
    source = await readFile(path, 'utf8')
  } catch {
    return false
  }
  const document = parseDocument(source)
  if (document.errors.length > 0) return false
  let list = document.get('ignoredOptionalDependencies')
  if (list === undefined) {
    document.set('ignoredOptionalDependencies', [...IGNORED_OPTIONAL_DEPENDENCIES])
    await writeFile(path, String(document), 'utf8')
    return true
  }
  if (!Array.isArray(list)) return false
  const existing = new Set(list.map(String))
  let changed = false
  for (const name of IGNORED_OPTIONAL_DEPENDENCIES) {
    if (!existing.has(name)) {
      list.push(name)
      existing.add(name)
      changed = true
    }
  }
  if (changed) {
    document.set('ignoredOptionalDependencies', list)
    await writeFile(path, String(document), 'utf8')
  }
  return changed
}
