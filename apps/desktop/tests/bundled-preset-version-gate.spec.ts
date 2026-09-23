import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { BundledPresetVersionGate } from '../src/bundled-preset-version-gate.ts'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function gate(): Promise<{ home: string; gate: BundledPresetVersionGate }> {
  const home = await mkdtemp(join(tmpdir(), 'dsh-preset-version-'))
  roots.push(home)
  return { home, gate: new BundledPresetVersionGate(home) }
}

describe('bundled preset version gate', () => {
  it('attempts once on a fresh or upgraded desktop version', async () => {
    const { home, gate: current } = await gate()
    expect(await current.shouldAttempt('0.1.5-rc.2.3')).toBe(true)
    await current.markAttempted('0.1.5-rc.2.3')
    expect(await new BundledPresetVersionGate(home).shouldAttempt('0.1.5-rc.2.3')).toBe(false)
    expect(await current.shouldAttempt('0.1.6-alpha.2.1')).toBe(true)
    await current.markAttempted('0.1.6-alpha.2.1')
    expect(await current.shouldAttempt('0.1.6-alpha.2.1')).toBe(false)
    expect(await current.shouldAttempt('0.1.5-rc.2.3')).toBe(false)
  })

  it('does not retry the same version after an interrupted upgrade attempt', async () => {
    const { home, gate: current } = await gate()
    await current.markAttempted('0.1.6-alpha.2.1')
    expect(await new BundledPresetVersionGate(home).shouldAttempt('0.1.6-alpha.2.1')).toBe(false)
  })

  it('rejects a damaged marker rather than silently repeating preparation', async () => {
    const { home, gate: current } = await gate()
    await current.markAttempted('0.1.5-rc.2.3')
    await writeFile(join(home, 'bundled-plugins', 'desktop-preset-attempt.v1.json'), '{ damaged')
    await expect(current.shouldAttempt('0.1.6-alpha.2.1')).rejects.toThrow(/invalid.*marker/i)
  })

  it('stores only the version, with no Profile or command content', async () => {
    const { home, gate: current } = await gate()
    await current.markAttempted('0.1.6-alpha.2.1')
    const marker = await readFile(join(home, 'bundled-plugins', 'desktop-preset-attempt.v1.json'), 'utf8')
    expect(JSON.parse(marker)).toEqual({ schema: 1, attemptedVersion: '0.1.6-alpha.2.1' })
  })
})
