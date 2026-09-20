/** Fenglin: merge legacy session homes into the active DSH_HOME on upgrade. */

import { createHash } from 'node:crypto'
import { copyFile, lstat, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'

const MARKER = 'sessions-legacy-compatibility-v1.json'
const MAX_CANDIDATE_HOMES = 8

function projectKeyFromDirName(name: string): string | undefined {
  return name.startsWith('--') && name.endsWith('--') && name.length > 4 ? name : undefined
}

async function isDirectory(path: string): Promise<boolean> {
  try { return (await lstat(path)).isDirectory() } catch { return false }
}

async function isFile(path: string): Promise<boolean> {
  try { return (await lstat(path)).isFile() } catch { return false }
}

/** Candidate homes that may still hold 2.x / community session trees. */
function candidateLegacyHomes(activeHome: string, appData: string): string[] {
  const active = activeHome.replaceAll('\\', '/').toLowerCase()
  const list = [
    join(homedir(), '.dsh'),
    join(appData, 'open-deepseek-harness-desktop', 'dsh-home'),
    join(appData, 'open-deepseek-harness-desktop-home', 'dsh-home'),
  ]
  // Sibling data homes under the same desktop product directory.
  const desktopRoot = join(appData, 'open-deepseek-harness-desktop')
  return [...new Set(list.map(path => path))]
    .filter(path => path.replaceAll('\\', '/').toLowerCase() !== active)
    .slice(0, MAX_CANDIDATE_HOMES)
    .concat([desktopRoot])
}

async function copySessionTree(sourceProject: string, targetProject: string): Promise<number> {
  let copied = 0
  let entries: string[]
  try { entries = await readdir(sourceProject) } catch { return 0 }
  for (const sessionId of entries) {
    const sourceSession = join(sourceProject, sessionId)
    const targetSession = join(targetProject, sessionId)
    if (!await isDirectory(sourceSession)) continue
    if (await isDirectory(targetSession)) continue
    await mkdir(targetSession, { recursive: true })
    let files: string[]
    try { files = await readdir(sourceSession) } catch { continue }
    for (const file of files) {
      const from = join(sourceSession, file)
      const to = join(targetSession, file)
      if (!await isFile(from) || await isFile(to)) continue
      await copyFile(from, to)
      copied += 1
    }
  }
  return copied
}

/**
 * Copy missing legacy session project/session trees into the active home.
 * Never overwrites an existing session directory; never deletes source data.
 * @param dshHome - Active Harness data home.
 * @param appData - Electron application-data root used to locate sibling homes.
 * @returns Human-readable summary for the startup log.
 */
export async function ensureLegacySessionCompatibility(
  dshHome: string,
  appData: string,
): Promise<string> {
  const markerPath = join(dshHome, MARKER)
  try {
    if (await isFile(markerPath)) return 'legacy session compatibility already applied'
  } catch { /* first run */ }
  const targetRoot = join(dshHome, 'sessions')
  await mkdir(targetRoot, { recursive: true })
  const candidates: string[] = []
  for (const home of candidateLegacyHomes(dshHome, appData)) {
    const sessions = join(home, 'sessions')
    if (home === dshHome) continue
    if (await isDirectory(sessions)) candidates.push(sessions)
  }
  // Also accept any `*/dsh-home/sessions` beside a data-home-setup.json under appData.
  try {
    const siblings = await readdir(appData)
    for (const name of siblings) {
      const home = join(appData, name)
      if (home.replaceAll('\\', '/').toLowerCase() === dshHome.replaceAll('\\', '/').toLowerCase()) continue
      const sessions = join(home, 'sessions')
      const setup = join(home, 'data-home-setup.json')
      const identity = join(home, '.open-deepseek-harness-desktop.json')
      if ((await isFile(setup) || await isFile(identity)) && await isDirectory(sessions)) candidates.push(sessions)
    }
  } catch { /* ignore unreadable appData */ }

  let copiedFiles = 0
  const sources: string[] = []
  for (const sourceRoot of [...new Set(candidates)]) {
    if (sourceRoot.replaceAll('\\', '/').toLowerCase() === targetRoot.replaceAll('\\', '/').toLowerCase()) continue
    let projects: string[]
    try { projects = await readdir(sourceRoot) } catch { continue }
    for (const projectName of projects) {
      if (!projectKeyFromDirName(projectName) && projectName !== '_no-cwd') continue
      const sourceProject = join(sourceRoot, projectName)
      const targetProject = join(targetRoot, projectName)
      if (!await isDirectory(sourceProject)) continue
      await mkdir(targetProject, { recursive: true })
      const copied = await copySessionTree(sourceProject, targetProject)
      if (copied > 0) {
        copiedFiles += copied
        sources.push(`${sourceRoot} (${projectName}: +${copied})`)
      }
    }
  }
  const marker = {
    schema: 'open-deepseek-harness-desktop/sessions-legacy-compatibility/v1',
    appliedAt: new Date().toISOString(),
    activeHome: dshHome,
    copiedFiles,
    sources,
  }
  const bytes = `${JSON.stringify(marker, null, 2)}\n`
  await writeFile(markerPath, bytes, 'utf8')
  return copiedFiles === 0
    ? 'legacy session compatibility: no missing session trees to copy'
    : `legacy session compatibility: copied ${copiedFiles} files from ${sources.length} source roots`
}

/** Stable content hash helper for tests / diagnostics. */
export function sessionCompatibilityMarkerName(): string {
  return MARKER
}

/** @internal test helper */
export function hashCompatibilityReport(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 12)
}

/** Directory name used by an empty project key (sessions without cwd). */
export const NO_CWD_PROJECT = '_no-cwd'

/** Exposed for tests that construct fake legacy homes. */
export function isLegacyProjectDirName(name: string): boolean {
  return projectKeyFromDirName(name) !== undefined || name === NO_CWD_PROJECT || basename(name) === NO_CWD_PROJECT
}
