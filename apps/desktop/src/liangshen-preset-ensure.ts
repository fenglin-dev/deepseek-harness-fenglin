/** Fenglin: keep the verified LiangShen agent preset present on the active home. */

import { copyFile, lstat, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const FENGLIN_PRESET_FILES: ReadonlyArray<readonly [string, string]> = [
  ['agent.cordis.yml', 'liangshen-agent.cordis.yml'],
  ['preset.yml', 'liangshen-preset.yml'],
  ['minimal-prompt.mjs', 'minimal-prompt.mjs'],
  ['tool-catalog.mjs', 'tool-catalog.mjs'],
  ['custom-bash.mjs', 'custom-bash.mjs'],
  ['NOTICE', 'NOTICE'],
]

async function isFile(path: string): Promise<boolean> {
  try { return (await lstat(path)).isFile() } catch { return false }
}

async function copyIfPresent(source: string, target: string): Promise<boolean> {
  if (!await isFile(source)) return false
  await mkdir(dirname(target), { recursive: true })
  await copyFile(source, target)
  return true
}

/**
 * Ensure `$DSH_HOME/.agent-presets/liangshen` holds the Fenglin-owned composition.
 * Missing files are filled from bundled fenglin-fixes (install resources) or the
 * already-deployed prebuilt copy. Existing files are left untouched.
 * @param dshHome - Active Harness data home.
 * @returns Human-readable startup log line.
 */
export async function ensureFenglinLiangShenPreset(
  dshHome: string,
  bundledFixesRoot?: string,
): Promise<string> {
  const targetDir = join(dshHome, '.agent-presets', 'liangshen')
  await mkdir(targetDir, { recursive: true })
  const roots = [
    ...(bundledFixesRoot === undefined ? [] : [bundledFixesRoot]),
    // Packaged install resources next to the running desktop host.
    join(String(process.resourcesPath ?? ''), 'bundled-plugins', 'fenglin-fixes'),
  ].filter(root => root !== '' && root !== 'undefined')
  let filled = 0
  for (const [targetName, sourceName] of FENGLIN_PRESET_FILES) {
    const target = join(targetDir, targetName)
    if (await isFile(target)) continue
    for (const root of roots) {
      if (await copyIfPresent(join(root, sourceName), target)) {
        filled += 1
        break
      }
    }
  }
  const composition = join(targetDir, 'agent.cordis.yml')
  const ok = await isFile(composition)
  return filled === 0
    ? (ok ? 'liangshen preset ensure: composition present' : 'liangshen preset ensure: agent.cordis.yml still missing')
    : `liangshen preset ensure: restored ${filled} missing file(s)`
}
