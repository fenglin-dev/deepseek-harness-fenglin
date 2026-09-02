/** Fixed-path desktop recovery for an invalid user settings document. */

import { randomUUID } from 'node:crypto'
import { lstat, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface DesktopSettingsResetResult {
  readonly backupName?: string
}

/**
 * Preserve the original settings bytes, replace it with an empty map, and roll back on failure.
 * @param home - Electron-selected Harness home; the renderer cannot supply this path.
 * @param now - Clock used for the backup label.
 * @returns The backup basename when an original document existed.
 */
export async function backupAndResetDesktopSettings(
  home: string,
  now: () => Date = () => new Date(),
): Promise<DesktopSettingsResetResult> {
  const settingsPath = join(home, 'settings.yaml')
  await mkdir(home, { recursive: true, mode: 0o700 })
  let backupName: string | undefined
  try {
    const info = await lstat(settingsPath)
    if (info.isSymbolicLink()) throw new Error('desktop: refusing to reset a symbolic-link settings document')
    backupName = `settings.before-reset.${now().toISOString().replace(/[:.]/gu, '-')}.yaml`
    await rename(settingsPath, join(home, backupName))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }

  const temporary = join(home, `.settings-reset.${process.pid}.${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, '{}\n', { flag: 'wx', mode: 0o600 })
    await rename(temporary, settingsPath)
  } catch (error) {
    await rm(temporary, { force: true })
    if (backupName !== undefined) await rename(join(home, backupName), settingsPath)
    throw error
  }
  return backupName === undefined ? {} : { backupName }
}
