/** Re-apply Fenglin runtime overlays after plugin install/seed. */

import { copyFile, lstat, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

async function isFile(path: string): Promise<boolean> {
  try { return (await lstat(path)).isFile() } catch { return false }
}

async function isDirectory(path: string): Promise<boolean> {
  try { return (await lstat(path)).isDirectory() } catch { return false }
}

async function copyIfPresent(source: string, target: string): Promise<boolean> {
  if (!await isFile(source)) return false
  await mkdir(dirname(target), { recursive: true })
  await copyFile(source, target)
  return true
}

const RUNTIME_COPIES: ReadonlyArray<readonly [string, string]> = [
  ['dsh-better-sidebar/lib/client.js', 'dsh-better-sidebar/lib/client.js'],
  ['dsh-better-sidebar/lib/client-terminal.js', 'dsh-better-sidebar/lib/client-terminal.js'],
  ['dsh-better-sidebar/lib/index.js', 'dsh-better-sidebar/lib/index.js'],
  ['dshmarket/lib/hot.js', 'dshmarket/lib/hot.js'],
  ['@linxin666/dsh-web-all/lib/client.js', '@linxin666/dsh-web-all/lib/client.js'],
]

/**
 * Copy verified Fenglin client/server overlays into the active Profile packages.
 * Seed/install can restore stock tgz contents; this puts the tested bundles back.
 */
export async function applyFenglinRuntimeOverlays(
  dshHome: string,
  fixesRoot?: string,
): Promise<string> {
  const roots = [
    ...(fixesRoot === undefined ? [] : [fixesRoot]),
    join(String(process.resourcesPath ?? ''), 'bundled-plugins', 'fenglin-fixes'),
    join(String(process.resourcesPath ?? ''), 'bundled-plugins', 'fenglin-fixes', 'runtime-libs'),
  ].filter(root => root !== '' && root !== 'undefined')

  const profileNm = join(dshHome, 'profiles', 'web', 'node_modules')
  if (!await isDirectory(profileNm)) return 'fenglin overlays: profile node_modules missing'

  const runtimeRoots = roots.map(root => (
    root.endsWith('runtime-libs') ? root : join(root, 'runtime-libs')
  )).filter(root => root !== '')

  let copied = 0
  for (const [from, to] of RUNTIME_COPIES) {
    const target = join(profileNm, ...to.split('/'))
    if (!await isDirectory(dirname(target))) continue
    for (const root of runtimeRoots) {
      if (await copyIfPresent(join(root, from), target)) {
        copied += 1
        break
      }
    }
  }

  // Re-run text patches over stock files when runtime-libs copies are absent.
  for (const root of roots) {
    const patchSidebar = join(root, 'patch-better-sidebar-client.mjs')
    if (await isFile(patchSidebar)) {
      try {
        const { patchBetterSidebarClient } = await import(pathToFileURL(patchSidebar).href)
        await patchBetterSidebarClient(join(profileNm, 'dsh-better-sidebar'))
      } catch { /* keep overlays even if optional patch fails */ }
      break
    }
  }
  for (const root of roots) {
    const patchWebAll = join(root, 'patch-web-all-liangshen-client.mjs')
    if (await isFile(patchWebAll)) {
      try {
        const { patchWebAllLiangShenClient } = await import(pathToFileURL(patchWebAll).href)
        await patchWebAllLiangShenClient(join(profileNm, '@linxin666', 'dsh-web-all', 'lib', 'client.js'))
      } catch { /* optional */ }
      break
    }
  }

  return `fenglin overlays: applied ${copied} runtime file(s)`
}

/** Absolute file URL import helper for Windows paths. */
export function toImportUrl(path: string): string {
  return `file:///${path.replace(/\\/gu, '/')}`
}
