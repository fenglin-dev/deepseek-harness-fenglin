import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ensureWorkspacePtcPlugin, hasManagedWorkspacePtcBlock, isWorkspacePtcPluginInstalled, PTC_PLUGIN_NAME } from '../src/workspace-ptc-plugin.ts'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

async function fixture(): Promise<{ home: string; profile: string; version: string }> {
  const home = await mkdtemp(join(tmpdir(), 'dsh-optional-ptc-'))
  roots.push(home)
  const profile = join(home, 'profiles', 'web')
  await mkdir(profile, { recursive: true })
  return { home, profile, version: '0.1.6-alpha.2' }
}

async function install(profile: string, version: string): Promise<void> {
  const plugin = join(profile, 'node_modules', '@deepseek-ai', 'dsh-experimental-ptc-runtime-python')
  await mkdir(plugin, { recursive: true })
  await writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: { [PTC_PLUGIN_NAME]: version } }))
  await writeFile(join(plugin, 'package.json'), JSON.stringify({ name: PTC_PLUGIN_NAME, version }))
}

describe('optional Desktop PTC plugin', () => {
  it('keeps an untouched Profile free of the experimental package', async () => {
    const { home, profile, version } = await fixture()
    expect(await hasManagedWorkspacePtcBlock(home)).toBe(false)
    expect(await isWorkspacePtcPluginInstalled(home, version)).toBe(false)
    await expect(readFile(join(profile, 'package.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('installs the exact release-family version only after opt-in and is idempotent', async () => {
    const { home, profile, version } = await fixture()
    const requests: string[] = []
    const add = async (spec: string) => { requests.push(spec); await install(profile, version) }
    expect(await ensureWorkspacePtcPlugin(home, version, add)).toBe(true)
    expect(await ensureWorkspacePtcPlugin(home, version, add)).toBe(false)
    expect(requests).toEqual([`${PTC_PLUGIN_NAME}@${version}`])
  })

  it('detects an older opted-in block and repairs a missing Profile dependency', async () => {
    const { home, profile, version } = await fixture()
    await writeFile(join(profile, 'cordis.patch.yml'), '# BEGIN community-desktop:workspace-runtime:ptc\n- insert: []\n# END community-desktop:workspace-runtime:ptc\n')
    expect(await hasManagedWorkspacePtcBlock(home)).toBe(true)
    expect(await isWorkspacePtcPluginInstalled(home, version)).toBe(false)
    await ensureWorkspacePtcPlugin(home, version, async () => { await install(profile, version) })
    expect(await isWorkspacePtcPluginInstalled(home, version)).toBe(true)
  })

  it('rejects a package-manager success that did not install the expected package', async () => {
    const { home, version } = await fixture()
    await expect(ensureWorkspacePtcPlugin(home, version, async () => {})).rejects.toThrow(/matching Profile dependency/u)
  })

  it('does not replace a different user-managed PTC source', async () => {
    const { home, profile, version } = await fixture()
    await writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: { [PTC_PLUGIN_NAME]: 'github:example/ptc-fork' } }))
    const add = async () => { throw new Error('must not install') }
    await expect(ensureWorkspacePtcPlugin(home, version, add)).rejects.toThrow(/user-managed Profile source/u)
    const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8')) as { dependencies: Record<string, string> }
    expect(manifest.dependencies[PTC_PLUGIN_NAME]).toBe('github:example/ptc-fork')
  })
})
