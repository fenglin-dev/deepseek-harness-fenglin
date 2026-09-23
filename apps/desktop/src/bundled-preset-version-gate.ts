/** Per-Profile, per-desktop-version limit on automatic preset preparation. */

import { randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gt, valid } from 'semver'

const SCHEMA = 1
const FILE = 'desktop-preset-attempt.v1.json'

export class BundledPresetVersionGate {
  readonly #path: string

  constructor(home: string) {
    this.#path = join(home, 'bundled-plugins', FILE)
  }

  /** Missing records permit one upgrade attempt; older application versions never downgrade presets. */
  async shouldAttempt(version: string): Promise<boolean> {
    if (valid(version) === null) throw new Error('desktop: invalid application version for preset preparation')
    let source: string
    try {
      if (!(await lstat(this.#path)).isFile()) throw new Error('desktop: invalid preset preparation marker')
      source = await readFile(this.#path, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return true
      throw error
    }
    let record: unknown
    try { record = JSON.parse(source) } catch {
      throw new Error('desktop: invalid preset preparation marker')
    }
    if (record === null || typeof record !== 'object' || Array.isArray(record)
      || Object.keys(record).sort().join(',') !== 'attemptedVersion,schema') {
      throw new Error('desktop: invalid preset preparation marker')
    }
    const value = record as { schema: unknown; attemptedVersion: unknown }
    if (value.schema !== SCHEMA || typeof value.attemptedVersion !== 'string'
      || valid(value.attemptedVersion) === null) {
      throw new Error('desktop: invalid preset preparation marker')
    }
    return gt(version, value.attemptedVersion)
  }

  /** Persist before an existing-Profile attempt or during a successful first-start commit. */
  async markAttempted(version: string): Promise<void> {
    if (valid(version) === null) throw new Error('desktop: invalid application version for preset preparation')
    const directory = dirname(this.#path)
    await mkdir(directory, { recursive: true, mode: 0o700 })
    if (!(await lstat(directory)).isDirectory()) throw new Error('desktop: invalid preset preparation directory')
    const temporary = `${this.#path}.${process.pid}.${randomUUID()}.tmp`
    try {
      await writeFile(temporary, `${JSON.stringify({ schema: SCHEMA, attemptedVersion: version })}\n`, {
        flag: 'wx', mode: 0o600,
      })
      await rename(temporary, this.#path)
    } catch (error) {
      await unlink(temporary).catch(() => {})
      throw error
    }
  }
}
