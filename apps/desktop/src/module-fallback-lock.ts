/** Narrow inspection and recovery for the shared Profile module-fallback writer lock. */

import { randomUUID } from 'node:crypto'
import { lstat, readFile, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'

export type ProcessLiveness = 'alive' | 'dead' | 'unknown'

export type ModuleFallbackLockStatus =
  | { readonly state: 'missing' }
  | { readonly state: 'invalid' }
  | { readonly state: ProcessLiveness; readonly ownerPid: number }

interface LockSnapshot {
  readonly ownerPid: number
  readonly identity: string
}

export interface ModuleFallbackLockOptions {
  readonly processLiveness?: (pid: number) => ProcessLiveness
}

function moduleFallbackLockPath(home: string): string {
  return join(home, 'profiles', 'node_modules.lock')
}

function defaultProcessLiveness(pid: number): ProcessLiveness {
  try {
    process.kill(pid, 0)
    return 'alive'
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ESRCH') return 'dead'
    return 'unknown'
  }
}

async function readLockSnapshot(home: string): Promise<LockSnapshot | 'missing' | 'invalid'> {
  const path = moduleFallbackLockPath(home)
  let stats
  try {
    stats = await lstat(path)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return 'missing'
    throw error
  }
  if (!stats.isFile() || stats.isSymbolicLink() || stats.size < 1 || stats.size > 64) return 'invalid'
  const value = await readFile(path, 'utf8')
  const match = /^([1-9]\d{0,14})\r?\n?$/u.exec(value)
  if (match === null) return 'invalid'
  const ownerPid = Number(match[1])
  if (!Number.isSafeInteger(ownerPid) || ownerPid <= 0) return 'invalid'
  return {
    ownerPid,
    identity: `${stats.dev}:${stats.ino}:${stats.size}:${stats.mtimeMs}:${value}`,
  }
}

/** Inspect only the fixed Profile module-fallback lock and disclose no filesystem path. */
export async function inspectModuleFallbackLock(
  home: string,
  options: ModuleFallbackLockOptions = {},
): Promise<ModuleFallbackLockStatus> {
  const snapshot = await readLockSnapshot(home)
  if (snapshot === 'missing' || snapshot === 'invalid') return { state: snapshot }
  const state = (options.processLiveness ?? defaultProcessLiveness)(snapshot.ownerPid)
  return { state, ownerPid: snapshot.ownerPid }
}

/**
 * Remove the fixed lock only after two consistent reads prove its recorded owner is dead.
 * A live, unverifiable, malformed, replaced, or missing lock is never removed.
 */
export async function clearDeadModuleFallbackLock(
  home: string,
  options: ModuleFallbackLockOptions = {},
): Promise<{ readonly cleared: true; readonly ownerPid: number }> {
  const processLiveness = options.processLiveness ?? defaultProcessLiveness
  const first = await readLockSnapshot(home)
  if (first === 'missing') throw new Error('desktop: the shared dependency writer lock no longer exists')
  if (first === 'invalid') throw new Error('desktop: the shared dependency writer lock is invalid and was not removed')
  if (processLiveness(first.ownerPid) !== 'dead') {
    throw new Error(`desktop: writer process ${first.ownerPid} is alive or cannot be verified as dead`)
  }
  const second = await readLockSnapshot(home)
  if (second === 'missing' || second === 'invalid' || second.identity !== first.identity) {
    throw new Error('desktop: the shared dependency writer lock changed while it was being verified')
  }
  if (processLiveness(second.ownerPid) !== 'dead') {
    throw new Error(`desktop: writer process ${second.ownerPid} is alive or cannot be verified as dead`)
  }

  const path = moduleFallbackLockPath(home)
  const quarantined = `${path}.orphaned-${randomUUID()}`
  await rename(path, quarantined)
  await rm(quarantined, { force: true })
  return { cleared: true, ownerPid: second.ownerPid }
}
