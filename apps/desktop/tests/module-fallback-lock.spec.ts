import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  clearDeadModuleFallbackLock,
  inspectModuleFallbackLock,
  type ProcessLiveness,
} from '../src/module-fallback-lock.ts'

const roots: string[] = []

async function fixtureLock(contents = '4242\n'): Promise<{ home: string; path: string }> {
  const home = await mkdtemp(join(tmpdir(), 'dsh-module-fallback-lock-'))
  roots.push(home)
  await mkdir(join(home, 'profiles'), { recursive: true })
  const path = join(home, 'profiles', 'node_modules.lock')
  await writeFile(path, contents)
  return { home, path }
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('module fallback writer lock recovery', () => {
  it('reports the owner PID and never removes a live lock', async () => {
    const { home, path } = await fixtureLock()
    const processLiveness = (): ProcessLiveness => 'alive'
    await expect(inspectModuleFallbackLock(home, { processLiveness }))
      .resolves.toEqual({ state: 'alive', ownerPid: 4242 })
    await expect(clearDeadModuleFallbackLock(home, { processLiveness }))
      .rejects.toThrow('alive or cannot be verified as dead')
    await expect(readFile(path, 'utf8')).resolves.toBe('4242\n')
  })

  it('keeps an unverifiable owner and a missing lock non-destructive', async () => {
    const { home, path } = await fixtureLock()
    const processLiveness = (): ProcessLiveness => 'unknown'
    await expect(inspectModuleFallbackLock(home, { processLiveness }))
      .resolves.toEqual({ state: 'unknown', ownerPid: 4242 })
    await expect(clearDeadModuleFallbackLock(home, { processLiveness }))
      .rejects.toThrow('alive or cannot be verified as dead')
    await rm(path)
    await expect(inspectModuleFallbackLock(home)).resolves.toEqual({ state: 'missing' })
    await expect(clearDeadModuleFallbackLock(home)).rejects.toThrow('no longer exists')
  })

  it('removes only the fixed lock after two dead-owner checks', async () => {
    const { home, path } = await fixtureLock()
    let checks = 0
    const processLiveness = (): ProcessLiveness => { checks += 1; return 'dead' }
    await expect(clearDeadModuleFallbackLock(home, { processLiveness }))
      .resolves.toEqual({ cleared: true, ownerPid: 4242 })
    expect(checks).toBe(2)
    await expect(readFile(path, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('refuses malformed and symbolic-link locks', async () => {
    const malformed = await fixtureLock('not-a-pid\n')
    await expect(inspectModuleFallbackLock(malformed.home)).resolves.toEqual({ state: 'invalid' })
    await expect(clearDeadModuleFallbackLock(malformed.home)).rejects.toThrow('invalid and was not removed')

    const target = await fixtureLock('5151\n')
    const linkedHome = await mkdtemp(join(tmpdir(), 'dsh-module-fallback-link-'))
    roots.push(linkedHome)
    await mkdir(join(linkedHome, 'profiles'), { recursive: true })
    await symlink(target.path, join(linkedHome, 'profiles', 'node_modules.lock'))
    await expect(inspectModuleFallbackLock(linkedHome)).resolves.toEqual({ state: 'invalid' })
  })

  it('refuses a lock replaced during owner verification', async () => {
    const { home, path } = await fixtureLock()
    let checks = 0
    const processLiveness = (): ProcessLiveness => {
      checks += 1
      if (checks === 1) writeFileSync(path, '5252\n')
      return 'dead'
    }
    await expect(clearDeadModuleFallbackLock(home, { processLiveness }))
      .rejects.toThrow('changed while it was being verified')
    await expect(readFile(path, 'utf8')).resolves.toBe('5252\n')
  })
})
