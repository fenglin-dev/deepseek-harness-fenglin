import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  parseDesktopCliSetup,
  resolveDesktopCliInvocation,
  runDesktopCli,
} from '../src/desktop-cli-launcher.ts'

const roots: string[] = []

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-desktop-cli-launcher-'))
  roots.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('desktop CLI launcher', () => {
  it('selects the recorded desktop home and preserves structured arguments', async () => {
    const root = await fixture()
    const setup = join(root, 'Application Data 中文', 'data-home-setup.json')
    const harness = join(root, 'runtime path', 'bin.js')
    const pnpm = join(root, 'runtime path', 'pnpm.mjs')
    const dshHome = join(root, 'desktop home')
    await mkdir(join(root, 'Application Data 中文'), { recursive: true })
    await mkdir(join(root, 'runtime path'), { recursive: true })
    await writeFile(harness, '')
    await writeFile(pnpm, '')
    await writeFile(setup, JSON.stringify({
      schema: 'open-deepseek-harness-desktop/data-home-setup/v1',
      mode: 'imported',
      dshHome,
      completedAt: '2026-08-25T00:00:00.000Z',
    }))

    const invocation = await resolveDesktopCliInvocation(['plugin', 'add', 'C:\\插件 目录\\one.tgz'], {
      PATH: '/system/bin',
      DSH_HOME: '/ambient-home',
      OPEN_DSH_DESKTOP_SETUP_FILE: setup,
      OPEN_DSH_DESKTOP_HARNESS_BIN: harness,
      DSH_PNPM_BIN: pnpm,
    })

    expect(invocation.command).toBe(process.execPath)
    expect(invocation.args).toEqual([harness, 'plugin', 'add', 'C:\\插件 目录\\one.tgz'])
    expect(invocation.environment.DSH_HOME).toBe(dshHome)
    expect(invocation.environment.DSH_PNPM_BIN).toBe(pnpm)
  })

  it('rejects missing, damaged, and relative setup state without creating a fallback', async () => {
    const root = await fixture()
    const harness = join(root, 'bin.js')
    const pnpm = join(root, 'pnpm.mjs')
    await writeFile(harness, '')
    await writeFile(pnpm, '')
    await expect(resolveDesktopCliInvocation([], {
      OPEN_DSH_DESKTOP_SETUP_FILE: join(root, 'missing.json'),
      OPEN_DSH_DESKTOP_HARNESS_BIN: harness,
      DSH_PNPM_BIN: pnpm,
    })).rejects.toThrow('launch the desktop app once')
    expect(() => parseDesktopCliSetup('{broken')).toThrow('selection is damaged')
    expect(() => parseDesktopCliSetup(JSON.stringify({
      schema: 'open-deepseek-harness-desktop/data-home-setup/v1', mode: 'fresh', dshHome: 'relative',
      completedAt: '2026-08-25T00:00:00.000Z',
    }))).toThrow('selection is invalid')
  })

  it('accepts a desktop-created empty-folder home', async () => {
    const root = await fixture()
    const dshHome = join(root, 'new configuration')
    expect(parseDesktopCliSetup(JSON.stringify({
      schema: 'open-deepseek-harness-desktop/data-home-setup/v1',
      mode: 'created',
      dshHome,
      completedAt: '2026-08-31T00:00:00.000Z',
    }))).toBe(dshHome)
  })

  it('returns the embedded Harness exit code', async () => {
    const root = await fixture()
    const setup = join(root, 'data-home-setup.json')
    const harness = join(root, 'bin.js')
    const pnpm = join(root, 'pnpm.mjs')
    await writeFile(harness, 'process.exit(7)\n')
    await writeFile(pnpm, '')
    await writeFile(setup, JSON.stringify({
      schema: 'open-deepseek-harness-desktop/data-home-setup/v1',
      mode: 'reused',
      dshHome: join(root, '.dsh'),
      completedAt: '2026-08-25T00:00:00.000Z',
    }))
    await expect(runDesktopCli([], {
      OPEN_DSH_DESKTOP_SETUP_FILE: setup,
      OPEN_DSH_DESKTOP_HARNESS_BIN: harness,
      DSH_PNPM_BIN: pnpm,
    })).resolves.toBe(7)
  })
})
