/** Prevent inherited self-restart commands from competing with the Desktop supervisor. */
import { resolve } from 'node:path'

interface DesktopWebGeneration {
  ownerPid: number
  home: string
  hostPid: number
}

/**
 * Claim one Desktop-launched Web generation, or suppress an inherited replacement of that Profile.
 * Other profiles and homes retain ordinary CLI behavior; this grants no mutation authority.
 * @param profile - Parsed CLI Profile name.
 * @param home - Resolved data directory for this invocation.
 * @param environment - Process environment inherited by plugin subprocesses.
 * @returns False only for a replacement of the same Desktop-owned Web Profile.
 */
export function claimDesktopWebLaunch(profile: string, home: string, environment: NodeJS.ProcessEnv): boolean {
  const owner = environment.DSH_DESKTOP_WEB_RESTART_OWNER
  if (owner === undefined || profile !== 'web') return true
  const ownerPid = Number(owner)
  if (!Number.isSafeInteger(ownerPid) || ownerPid <= 0) throw new Error('dsh: invalid Desktop restart owner')
  const normalize = (path: string): string => process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path)
  const inherited = environment.DSH_DESKTOP_WEB_GENERATION
  if (inherited !== undefined) {
    const record = JSON.parse(inherited) as Partial<DesktopWebGeneration> | null
    if (record === null || record.ownerPid !== ownerPid || typeof record.home !== 'string'
      || !Number.isSafeInteger(record.hostPid) || (record.hostPid ?? 0) <= 0) {
      throw new Error('dsh: invalid Desktop Web generation')
    }
    return normalize(record.home) !== normalize(home)
  }
  environment.DSH_DESKTOP_WEB_GENERATION = JSON.stringify({ ownerPid, home: normalize(home), hostPid: process.pid })
  return true
}
