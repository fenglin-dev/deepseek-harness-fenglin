/** Configuration-home cache selection and same-layout pnpm cache rebinding. */

import { lstatSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { load, dump } from 'js-yaml'

/**
 * Rebind only the cache locator in a locally materialized dependency tree.
 * Package files, build results, lockfile and the old shared cache remain untouched.
 * Different store formats and external virtual stores retain pnpm's compatibility checks.
 * @param profileDir - Locked Profile directory owning node_modules.
 * @param storeDir - Absolute, versioned path returned by the selected pnpm executable.
 */
export function rebindProfilePnpmStore(profileDir: string, storeDir: string): void {
  const modulesDir = join(profileDir, 'node_modules')
  const metadata = join(modulesDir, '.modules.yaml')
  let source: string
  try {
    if (!lstatSync(modulesDir).isDirectory() || !lstatSync(metadata).isFile()) {
      throw new Error('dsh: refusing to rebind linked pnpm dependency metadata')
    }
    source = readFileSync(metadata, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
  const record: unknown = load(source)
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('dsh: invalid pnpm dependency metadata')
  }
  const data = record as Record<string, unknown>
  if (typeof data.storeDir !== 'string' || typeof data.virtualStoreDir !== 'string') return
  if (resolve(data.storeDir) === resolve(storeDir)) return
  if (!isAbsolute(storeDir) || !/^v\d+$/u.test(basename(storeDir))) {
    throw new Error('dsh: pnpm returned an invalid versioned store path')
  }
  if (!isAbsolute(data.storeDir) || basename(data.storeDir) !== basename(storeDir)) return
  const virtualStore = resolve(modulesDir, data.virtualStoreDir)
  const contained = relative(modulesDir, virtualStore)
  if (contained === '' || contained.startsWith('..') || isAbsolute(contained)) return
  const realRelative = relative(realpathSync(modulesDir), realpathSync(virtualStore))
  if (!lstatSync(virtualStore).isDirectory() || realRelative.startsWith('..') || isAbsolute(realRelative)) {
    throw new Error('dsh: refusing to rebind an external pnpm virtual store')
  }
  const temporary = join(dirname(metadata), `.modules-${randomUUID()}.tmp`)
  try {
    writeFileSync(temporary, dump({ ...data, storeDir }), { flag: 'wx', mode: 0o600 })
    renameSync(temporary, metadata)
  } finally {
    rmSync(temporary, { force: true })
  }
}
