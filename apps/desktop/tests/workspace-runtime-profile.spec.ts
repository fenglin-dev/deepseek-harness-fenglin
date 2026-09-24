import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { configureWorkspaceRuntimeCapability } from '../src/workspace-runtime-profile.ts'

const roots: string[] = []
afterEach(async () => {
  const { rm } = await import('node:fs/promises')
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function fixture(): Promise<{ home: string; patch: string }> {
  const home = await mkdtemp(join(tmpdir(), 'dsh-workspace-profile-'))
  roots.push(home)
  const profile = join(home, 'profiles', 'web')
  await mkdir(profile, { recursive: true })
  const patch = join(profile, 'cordis.patch.yml')
  await writeFile(patch, '# user comment\n- insert:\n    - id: user.plugin\n      name: example\n')
  return { home, patch }
}

const paths = {
  runtimeRoot: '/cache/runtime', python: '/cache/runtime/python/bin/python3',
  node: '/app/node', pnpm: '/app/pnpm.mjs', nodePackages: '/app/node_modules',
}

describe('workspace runtime Profile composition', () => {
  it('keeps user YAML while independently enabling and disabling capabilities', async () => {
    const { home, patch } = await fixture()
    expect(configureWorkspaceRuntimeCapability(home, 'office', true, paths)).toBe(true)
    expect(configureWorkspaceRuntimeCapability(home, 'ptc', true, paths)).toBe(true)
    expect(configureWorkspaceRuntimeCapability(home, 'office', true, paths)).toBe(false)
    expect(configureWorkspaceRuntimeCapability(home, 'office', false, paths)).toBe(true)
    const text = await readFile(patch, 'utf8')
    expect(text).toContain('# user comment')
    expect(text).toContain('user.plugin')
    expect(text).not.toContain('workspace-runtime:office')
    expect(text).toContain('workspace-runtime:ptc')
    expect(text).toContain('@deepseek-ai/dsh-experimental-ptc-runtime-python')
  })

  it('repairs a lone Office marker without removing unrelated YAML', async () => {
    const { home, patch } = await fixture()
    const original = '# BEGIN community-desktop:workspace-runtime:office\n[]\n'
    await writeFile(patch, original)
    expect(configureWorkspaceRuntimeCapability(home, 'office', false, paths)).toBe(true)
    await expect(readFile(patch, 'utf8')).resolves.toBe('[]\n')
  })

  it('refuses ambiguous managed entries without rewriting the file', async () => {
    const { home, patch } = await fixture()
    const original = [
      '# BEGIN community-desktop:workspace-runtime:office',
      '- insert:',
      '    - id: community-desktop.workspace-runtime.office',
      '      name: first',
      '- insert:',
      '    - id: community-desktop.workspace-runtime.office',
      '      name: second',
      '',
    ].join('\n')
    await writeFile(patch, original)
    expect(() => configureWorkspaceRuntimeCapability(home, 'office', false, paths)).toThrow(/malformed managed office/u)
    await expect(readFile(patch, 'utf8')).resolves.toBe(original)
  })

  it('repairs an orphaned Office marker without changing other Profile entries', async () => {
    const { home, patch } = await fixture()
    const original = [
      '# user comment',
      '- insert:',
      '    - id: user.plugin',
      '      name: example',
      '# BEGIN community-desktop:workspace-runtime:office',
      '- insert:',
      '    - id: community-desktop.workspace-runtime.office',
      "      name: '@deepseek-ai/dsh-host-workspace-runtime'",
      '      config: { office: true }',
      '',
    ].join('\n')
    await writeFile(patch, original)
    expect(configureWorkspaceRuntimeCapability(home, 'office', false, paths)).toBe(true)
    const repaired = await readFile(patch, 'utf8')
    expect(repaired).toContain('# user comment')
    expect(repaired).toContain('user.plugin')
    expect(repaired).not.toContain('community-desktop.workspace-runtime.office')
    expect(repaired).not.toContain('workspace-runtime:office')
  })

  it('replaces an Office entry with only its ending marker and preserves following entries', async () => {
    const { home, patch } = await fixture()
    await writeFile(patch, [
      '- insert:',
      '    - id: community-desktop.workspace-runtime.office',
      "      name: '@deepseek-ai/dsh-host-workspace-runtime'",
      '      config: { office: true }',
      '# END community-desktop:workspace-runtime:office',
      '- insert:',
      '    - id: user.after',
      '      name: example',
      '',
    ].join('\n'))
    expect(configureWorkspaceRuntimeCapability(home, 'office', true, paths)).toBe(true)
    const repaired = await readFile(patch, 'utf8')
    expect(repaired.match(/^    - id: community-desktop\.workspace-runtime\.office$/gmu)).toHaveLength(1)
    expect(repaired).toContain('user.after')
    expect(repaired).toContain('# BEGIN community-desktop:workspace-runtime:office')
    expect(repaired).toContain('# END community-desktop:workspace-runtime:office')
  })
})
