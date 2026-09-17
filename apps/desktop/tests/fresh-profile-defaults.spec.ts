import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { desktopDataHomeSetup } from '../src/desktop-data-home.ts'
import { applyFreshProfileDefaults } from '../src/fresh-profile-defaults.ts'

const roots: string[] = []

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-fresh-profile-defaults-'))
  roots.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('fresh Profile product defaults', () => {
  it('disables only Better Sidebar terminal surfaces for a fresh home', async () => {
    const root = await fixture()
    expect(await applyFreshProfileDefaults(root, desktopDataHomeSetup('fresh', root))).toBe(true)
    expect(parse(await readFile(join(root, 'settings.yaml'), 'utf8'))).toEqual({
      'dsh-better-sidebar': {
        bottomPanelAutoTerminal: false,
        tabsEnabled: { terminal: false },
      },
    })
  })

  it('preserves an existing namespace and unrelated settings', async () => {
    const root = await fixture()
    await writeFile(join(root, 'settings.yaml'), [
      'ui-theme:',
      '  preference: dark',
      'dsh-better-sidebar:',
      '  bottomPanelAutoTerminal: true',
      '  tabsEnabled:',
      '    terminal: true',
      '',
    ].join('\n'))
    expect(await applyFreshProfileDefaults(root, desktopDataHomeSetup('created', root))).toBe(false)
    expect(await readFile(join(root, 'settings.yaml'), 'utf8')).toContain('terminal: true')
  })

  it.each(['imported', 'copied', 'reused', 'existing', 'explicit'] as const)(
    'does not change a %s home',
    async (mode) => {
      const root = await fixture()
      await mkdir(root, { recursive: true })
      expect(await applyFreshProfileDefaults(root, desktopDataHomeSetup(mode, root))).toBe(false)
      await expect(readFile(join(root, 'settings.yaml'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
    },
  )
})
