/** Install the experimental PTC adapter only for a Desktop Profile that opted in. */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { valid } from 'semver'

export const PTC_PLUGIN_NAME = '@deepseek-ai/dsh-experimental-ptc-runtime-python'

async function readManifest(path: string): Promise<Record<string, unknown> | undefined> {
  try {
    const value: unknown = JSON.parse(await readFile(path, 'utf8'))
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) return undefined
    throw error
  }
}

/** Require both a durable Profile dependency and its installed package at the CLI's release version. */
export async function isWorkspacePtcPluginInstalled(home: string, version: string): Promise<boolean> {
  if (valid(version) === null) throw new Error('desktop: invalid Harness version for optional PTC plugin')
  const profile = join(home, 'profiles', 'web')
  const manifest = await readManifest(join(profile, 'package.json'))
  const dependencies = manifest?.dependencies
  if (dependencies === null || typeof dependencies !== 'object' || Array.isArray(dependencies)
    || (dependencies as Record<string, unknown>)[PTC_PLUGIN_NAME] !== version) return false
  const installed = await readManifest(join(profile, 'node_modules', '@deepseek-ai', 'dsh-experimental-ptc-runtime-python', 'package.json'))
  return installed?.name === PTC_PLUGIN_NAME && installed.version === version
}

/** A previously opted-in Profile needs this package after the default CLI closure stops carrying it. */
export async function hasManagedWorkspacePtcBlock(home: string): Promise<boolean> {
  try {
    const patch = await readFile(join(home, 'profiles', 'web', 'cordis.patch.yml'), 'utf8')
    return patch.includes('# BEGIN community-desktop:workspace-runtime:ptc')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

/** Pin the release-family package only after the user has enabled PTC, inside a Profile transaction. */
export async function ensureWorkspacePtcPlugin(
  home: string,
  version: string,
  add: (packageSpec: string) => Promise<void>,
): Promise<boolean> {
  if (await isWorkspacePtcPluginInstalled(home, version)) return false
  const profile = await readManifest(join(home, 'profiles', 'web', 'package.json'))
  const dependencies = profile?.dependencies
  if (dependencies !== null && typeof dependencies === 'object' && !Array.isArray(dependencies)) {
    const existing = (dependencies as Record<string, unknown>)[PTC_PLUGIN_NAME]
    if (existing !== undefined && existing !== version) {
      throw new Error('desktop: optional PTC plugin already has a different user-managed Profile source; it was not replaced')
    }
  }
  await add(`${PTC_PLUGIN_NAME}@${version}`)
  if (!await isWorkspacePtcPluginInstalled(home, version)) {
    throw new Error('desktop: optional PTC plugin installation did not create a matching Profile dependency')
  }
  return true
}
