import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { backupAndResetDesktopSettings } from '../src/settings-recovery.ts'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function home(): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-desktop-settings-reset-'))
  roots.push(root)
  return root
}

describe('desktop settings recovery', () => {
  it('backs up exact bytes before writing an empty map', async () => {
    const root = home()
    const original = 'same: 1\r\nsame: 2\r\n'
    writeFileSync(join(root, 'settings.yaml'), original)
    const result = await backupAndResetDesktopSettings(root, () => new Date('2026-09-02T08:00:00.000Z'))
    expect(readFileSync(join(root, result.backupName!), 'utf8')).toBe(original)
    expect(readFileSync(join(root, 'settings.yaml'), 'utf8')).toBe('{}\n')
  })

  it('rejects a symlink without changing its target', async () => {
    const root = home()
    const target = join(root, 'target.yaml')
    writeFileSync(target, 'keep: true\n')
    symlinkSync(target, join(root, 'settings.yaml'))
    await expect(backupAndResetDesktopSettings(root)).rejects.toThrow(/symbolic-link/u)
    expect(readFileSync(target, 'utf8')).toBe('keep: true\n')
  })
})
