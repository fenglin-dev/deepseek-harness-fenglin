import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs/promises'
import { copyCommunityDesktopData } from '../src/desktop-data-home.ts'

const roots: string[] = []
vi.mock('node:fs/promises', { spy: true })
afterEach(async () => { vi.restoreAllMocks(); for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }) })
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'community-copy-'))
  roots.push(root)
  const source = join(root, '社区 来源')
  const target = join(root, '独立 副本')
  await mkdir(source)
  return { root, source, target }
}

describe('same-computer community copy', () => {
  it('preserves plugin contents, private data, lockfiles and executable mode without a restore plan', async () => {
    const { source, target } = await fixture()
    const store = 'profiles/web/node_modules/.pnpm/demo/node_modules/demo'
    await mkdir(join(source, store), { recursive: true })
    await mkdir(join(source, 'plugin-private-data'))
    await writeFile(join(source, store, 'index.js'), 'export default 42')
    await chmod(join(source, store, 'index.js'), 0o755)
    await writeFile(join(source, 'plugin-private-data', 'state.json'), '{"value":42}')
    await writeFile(join(source, 'profiles/web/pnpm-lock.yaml'), 'lockfileVersion: 9')
    await symlink('.pnpm/demo/node_modules/demo', join(source, 'profiles/web/node_modules/demo'), 'dir')
    await copyCommunityDesktopData(source, target)
    expect(await realpath(join(target, 'profiles/web/node_modules/demo'))).toBe(await realpath(join(target, store)))
    expect(await readFile(join(target, 'profiles/web/node_modules/demo/index.js'), 'utf8')).toBe('export default 42')
    expect(await readFile(join(target, 'plugin-private-data/state.json'), 'utf8')).toBe('{"value":42}')
    expect(await readFile(join(target, 'profiles/web/pnpm-lock.yaml'), 'utf8')).toBe('lockfileVersion: 9')
    if (process.platform !== 'win32') expect((await lstat(join(target, store, 'index.js'))).mode & 0o777).toBe(0o755)
    expect(await readdir(target)).not.toContain('imported-plugin-restore.v1.json')
    await writeFile(join(target, 'profiles/web/node_modules/demo/index.js'), 'changed')
    expect(await readFile(join(source, store, 'index.js'), 'utf8')).toBe('export default 42')
  })

  it('rebases absolute internal links and refuses external links without publishing a partial copy', async () => {
    const { root, source, target } = await fixture()
    await writeFile(join(source, 'settings.yaml'), 'locale: zh')
    await symlink(join(source, 'settings.yaml'), join(source, 'settings-link'))
    await copyCommunityDesktopData(source, target)
    expect(await realpath(join(target, 'settings-link'))).toBe(await realpath(join(target, 'settings.yaml')))
    await writeFile(join(root, 'outside'), 'untouched')
    await symlink(join(root, 'outside'), join(source, 'external'))
    await expect(copyCommunityDesktopData(source, join(root, 'failure'))).rejects.toThrow('external link')
    expect(await readFile(join(root, 'outside'), 'utf8')).toBe('untouched')
    expect((await readdir(root)).filter(name => name.startsWith('.community-copy-'))).toEqual([])
  })

  it('refuses active plugin writes, overlapping paths and nonempty destinations', async () => {
    const { source, target } = await fixture()
    await mkdir(target)
    await writeFile(join(target, 'keep'), 'keep')
    await expect(copyCommunityDesktopData(source, target)).rejects.toThrow('non-empty')
    await expect(copyCommunityDesktopData(source, join(source, 'nested'))).rejects.toThrow('overlap')
    await expect(copyCommunityDesktopData(source, join(source, 'missing/deep/target'))).rejects.toThrow('overlap')
    expect(await readdir(source)).toEqual([])
    await mkdir(join(source, 'plugin-snapshots/v1'), { recursive: true })
    await writeFile(join(source, 'plugin-snapshots/v1/.profile-plugin-mutation.web.lock'), JSON.stringify({ pid: process.pid }))
    await expect(copyCommunityDesktopData(source, `${target}-empty`)).rejects.toThrow('active plugin task')
    expect(await readFile(join(target, 'keep'), 'utf8')).toBe('keep')
  })

  it('discards the staged copy when the source changes during copying', async () => {
    const { root, source, target } = await fixture()
    await writeFile(join(source, 'settings.yaml'), 'before')
    const original = fs.copyFile
    vi.spyOn(fs, 'copyFile').mockImplementationOnce(async (...args) => {
      await original(...args)
      await writeFile(join(source, 'settings.yaml'), 'after')
    })
    await expect(copyCommunityDesktopData(source, target)).rejects.toThrow('changed during copying')
    expect(await readFile(join(source, 'settings.yaml'), 'utf8')).toBe('after')
    expect(await readdir(root)).toEqual(['社区 来源'])
  })

  it('accepts an existing empty destination and omits session lease files', async () => {
    const { source, target } = await fixture()
    await mkdir(target)
    await mkdir(join(source, 'sessions/one'), { recursive: true })
    await writeFile(join(source, 'sessions/one/session.lock'), '')
    await writeFile(join(source, 'sessions/one/session.jsonl'), '{}')
    await copyCommunityDesktopData(source, target)
    expect(await readdir(join(target, 'sessions/one'))).toEqual(['session.jsonl'])
  })
})
