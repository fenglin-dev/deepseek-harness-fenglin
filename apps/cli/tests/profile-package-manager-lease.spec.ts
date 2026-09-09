import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { acquireProfilePluginMutationLock, beginProfilePluginMutationLease, endProfilePluginMutationLease } from '../../../packages/boot/app-boot/src/profile-plugin-snapshot.ts'
import { profilePackageManagerLeaseEnvironment } from '../src/profile-package-manager-lease.ts'

function fixture() {
  const home = mkdtempSync(join(tmpdir(), 'dsh-pnpm-owner-'))
  const profileDir = join(home, 'profiles', 'web')
  mkdirSync(profileDir, { recursive: true })
  const lock = join(home, 'plugin-snapshots', 'v1', '.profile-plugin-mutation.web.lock')
  return { home, profileDir, lock }
}

function ownerAt(path: string): { pid: number; token: string; workerPid?: number } {
  return JSON.parse(readFileSync(path, 'utf8')) as { pid: number; token: string; workerPid?: number }
}

describe('pnpm mutation worker ownership', () => {
  it('registers before package code and removes the capability from build environments', () => {
    const f = fixture()
    const release = acquireProfilePluginMutationLock({ home: f.home, profile: 'web' })
    try {
      const env = profilePackageManagerLeaseEnvironment(f.profileDir, { ...process.env, DSH_HOME: f.home })
      const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
        import { readFileSync } from 'node:fs';
        const owner = JSON.parse(readFileSync(${JSON.stringify(f.lock)}, 'utf8'));
        if (owner.workerPid !== process.pid) throw new Error('unowned write');
        if (process.env.DSH_PNPM_MUTATION_WORKER !== undefined) throw new Error('leaked capability');
        console.log('owned');
      `], { env, encoding: 'utf8', timeout: 10_000 })
      expect(child.stderr).toBe('')
      expect(child.status).toBe(0)
      expect(child.stdout.trim()).toBe('owned')
      expect(JSON.parse(readFileSync(f.lock, 'utf8'))).not.toHaveProperty('workerPid')
    } finally {
      release()
      rmSync(f.home, { recursive: true, force: true })
    }
  })

  it('keeps an orphan worker protected until it exits and never executes under a replaced token', async () => {
    const f = fixture()
    let child: ChildProcess | undefined
    const release = acquireProfilePluginMutationLock({ home: f.home, profile: 'web' })
    try {
      const env = profilePackageManagerLeaseEnvironment(f.profileDir, { ...process.env, DSH_HOME: f.home })
      child = spawn(process.execPath, ['-e', 'console.log("ready"); setInterval(() => {}, 1000)'], {
        env, stdio: ['ignore', 'pipe', 'pipe'],
      })
      await expect.poll(() => ownerAt(f.lock).workerPid).toBe(child.pid)
      const owner = ownerAt(f.lock)
      writeFileSync(f.lock, JSON.stringify({ ...owner, pid: 99999999 }))
      expect(() => acquireProfilePluginMutationLock({ home: f.home, profile: 'web', waitMs: 0 }))
        .toThrow('another process')
      release()
      expect(ownerAt(f.lock).workerPid).toBe(child.pid)
      const closed = once(child, 'close')
      child.kill('SIGKILL')
      await closed
      child = undefined
      const next = acquireProfilePluginMutationLock({ home: f.home, profile: 'web', waitMs: 0 })
      try {
        const rejected = spawnSync(process.execPath, ['-e', 'console.log("must not run")'], { env, encoding: 'utf8', timeout: 10_000 })
        expect(rejected.status).not.toBe(0)
        expect(rejected.stdout).toBe('')
      } finally { next() }
    } finally {
      if (child !== undefined) {
        const closed = once(child, 'close')
        child.kill('SIGKILL')
        await closed
      }
      release()
      rmSync(f.home, { recursive: true, force: true })
    }
  })

  it('does not release a desktop lease while a worker is still alive', () => {
    const f = fixture()
    const token = '00000000-0000-4000-8000-000000000001'
    try {
      beginProfilePluginMutationLease({ home: f.home, profile: 'web', token, ownerPid: process.pid })
      const owner = ownerAt(f.lock)
      writeFileSync(f.lock, JSON.stringify({ ...owner, workerPid: process.pid }))
      expect(() => { endProfilePluginMutationLease({ home: f.home, profile: 'web', token }) }).toThrow('worker is still running')
      writeFileSync(f.lock, JSON.stringify(owner))
      endProfilePluginMutationLease({ home: f.home, profile: 'web', token })
    } finally { rmSync(f.home, { recursive: true, force: true }) }
  })
})
