/** Guarded recovery helpers for a user-owned settings document. */

import { randomUUID } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'

const PROFILE_HEALTH_DIRECTORY = 'profile-health'
const SETTINGS_FILENAME = 'settings.yaml'

function atomicWrite(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`
  writeFileSync(temporary, content, { flag: 'wx', mode: 0o600 })
  renameSync(temporary, path)
}

/**
 * Materialize the empty settings document used only by diagnostic safe mode.
 * @param home - Selected Harness home.
 * @returns Absolute app-maintained diagnostic settings path.
 */
export function prepareDiagnosticSettingsDocument(home: string = resolveDshHome()): string {
  const path = join(home, PROFILE_HEALTH_DIRECTORY, 'safe-mode-settings.yaml')
  if (existsSync(path)) unlinkSync(path)
  atomicWrite(path, '{}\n')
  return path
}

/** Paths retained after replacing an invalid user settings document. */
export interface ResetInvalidSettingsResult {
  readonly documentPath: string
  readonly backupPath?: string
  readonly backupName?: string
}

/**
 * Back up the exact user settings bytes and replace the active document with
 * an empty valid map. The original is restored if the replacement cannot be
 * committed. Symlinks are rejected so this narrow recovery can never rewrite
 * an arbitrary target outside the selected Harness home.
 * @param home - Selected Harness home.
 * @param now - Clock used to create the collision-resistant backup label.
 * @returns Active document path and optional backup identity.
 */
export function backupAndResetInvalidSettings(
  home: string = resolveDshHome(),
  now: () => Date = () => new Date(),
): ResetInvalidSettingsResult {
  const documentPath = join(home, SETTINGS_FILENAME)
  if (!existsSync(documentPath)) {
    atomicWrite(documentPath, '{}\n')
    return { documentPath }
  }
  if (lstatSync(documentPath).isSymbolicLink()) {
    throw new Error('dsh: refusing to reset a symbolic-link settings document')
  }
  const stamp = now().toISOString().replace(/[:.]/gu, '-')
  const backupPath = join(home, `settings.before-reset.${stamp}.yaml`)
  renameSync(documentPath, backupPath)
  try {
    atomicWrite(documentPath, '{}\n')
  } catch (error) {
    if (existsSync(documentPath)) unlinkSync(documentPath)
    renameSync(backupPath, documentPath)
    throw error
  }
  return { documentPath, backupPath, backupName: basename(backupPath) }
}
