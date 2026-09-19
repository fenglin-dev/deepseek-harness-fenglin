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

  it('refuses malformed owned markers without rewriting the file', async () => {
    const { home, patch } = await fixture()
    const original = '# BEGIN community-desktop:workspace-runtime:office\n[]\n'
    await writeFile(patch, original)
    expect(() => configureWorkspaceRuntimeCapability(home, 'office', false, paths)).toThrow(/malformed managed office/u)
    await expect(readFile(patch, 'utf8')).resolves.toBe(original)
  })
})
