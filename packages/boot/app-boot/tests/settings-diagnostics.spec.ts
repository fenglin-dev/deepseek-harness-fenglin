import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  backupAndResetInvalidSettings,
  prepareDiagnosticSettingsDocument,
} from '../src/settings-diagnostics.ts'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function home(): string {
  const value = mkdtempSync(join(tmpdir(), 'dsh-settings-diagnostic-'))
  roots.push(value)
  return value
}

describe('settings diagnostic recovery', () => {
  it('uses an isolated empty settings document in safe mode', () => {
    const root = home()
    writeFileSync(join(root, 'settings.yaml'), 'duplicate: 1\nduplicate: 2\n')
    const safe = prepareDiagnosticSettingsDocument(root)
    expect(safe).not.toBe(join(root, 'settings.yaml'))
    expect(readFileSync(safe, 'utf8')).toBe('{}\n')
    expect(readFileSync(join(root, 'settings.yaml'), 'utf8')).toContain('duplicate: 2')
  })

  it('preserves exact invalid bytes before resetting the active document', () => {
    const root = home()
    const original = 'duplicate: 1\r\nduplicate: 2\r\n'
    writeFileSync(join(root, 'settings.yaml'), original)
    const result = backupAndResetInvalidSettings(root, () => new Date('2026-09-02T08:00:00.000Z'))
    expect(result.backupName).toBe('settings.before-reset.2026-09-02T08-00-00-000Z.yaml')
    expect(readFileSync(result.backupPath!, 'utf8')).toBe(original)
    expect(readFileSync(result.documentPath, 'utf8')).toBe('{}\n')
  })

  it('refuses to follow a settings symlink', () => {
    const root = home()
    const outside = join(root, 'outside.yaml')
    writeFileSync(outside, 'keep: true\n')
    symlinkSync(outside, join(root, 'settings.yaml'))
    expect(() => backupAndResetInvalidSettings(root)).toThrow(/symbolic-link/u)
    expect(existsSync(outside)).toBe(true)
  })
})
