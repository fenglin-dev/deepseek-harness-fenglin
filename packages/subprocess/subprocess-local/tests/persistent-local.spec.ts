import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { Context } from '@deepseek-ai/cordis'
import {
  FilePersistentServiceAuthorizer,
  persistentProfileFingerprint,
  persistentSpawnSpecFingerprint,
} from '@deepseek-ai/dsh-subprocess'
import type { PersistentServiceDeclaration, SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess'
import { afterEach, describe, expect, it } from 'vitest'
import LocalSubprocessRuntime from '../src/index.ts'

const directories: string[] = []
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }) })

describe('local persistent service lifecycle', () => {
  it('denies the first launch, survives Harness disposal after approval, and remains stoppable', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dsh-persistent-local-'))
    directories.push(directory)
    const statePath = join(directory, 'services.json')
    const dataHome = join(directory, 'profile')
    const spec: SubprocessSpawnSpec = {
      argv: process.platform === 'win32'
        ? [process.execPath, '-e', 'setTimeout(() => {}, 60000)']
        : ['/bin/sh', '-c', 'sleep 60'],
      cwd: directory,
      env: { DSH_HOME: dataHome, DSH_DESKTOP_PERSISTENT_SERVICES: statePath },
      stdio: { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' },
      graceMs: 100,
    }
    const declaration: PersistentServiceDeclaration = {
      pluginName: '@fixture/background', pluginVersion: '1.0.0', serviceId: 'worker',
      purpose: 'Exercise the approved persistent lifetime.',
      specFingerprint: persistentSpawnSpecFingerprint(spec),
    }
    const ctx = new Context()
    const fiber = await ctx.plugin(LocalSubprocessRuntime)
    const runtime = ctx.subprocess as LocalSubprocessRuntime
    expect(() => runtime.spawnPersistent(spec, declaration)).toThrow('approval required')
    const authority = new FilePersistentServiceAuthorizer(statePath, persistentProfileFingerprint(dataHome))
    const pending = authority.list()[0]
    if (pending === undefined) throw new Error('fixture approval request was not recorded')
    authority.approve(pending.key)
    const handle = runtime.spawnPersistent(spec, declaration)
    expect(() => runtime.spawnPersistent(spec, declaration)).toThrow('already running')
    await fiber.dispose()
    expect(await Promise.race([handle.done.then(() => false, () => false), delay(100, true)])).toBe(true)
    handle.terminate()
    expect(await handle.waitForExit(AbortSignal.timeout(5_000))).toBe(true)
  })

  it('rejects a declaration whose fingerprint does not match the actual launch', async () => {
    const ctx = new Context()
    const fiber = await ctx.plugin(LocalSubprocessRuntime)
    try {
      expect(() => (ctx.subprocess as LocalSubprocessRuntime).spawnPersistent({
        argv: [process.execPath, '-e', ''], cwd: process.cwd(),
        stdio: { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' }, graceMs: 100,
      }, {
        pluginName: '@fixture/background', pluginVersion: '1.0.0', serviceId: 'worker',
        purpose: 'Must not start.', specFingerprint: 'a'.repeat(64),
      })).toThrow('fingerprint does not match')
    } finally {
      await fiber.dispose()
    }
  })
})
