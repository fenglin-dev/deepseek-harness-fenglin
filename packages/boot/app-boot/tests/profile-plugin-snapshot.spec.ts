import { randomUUID } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createProfilePluginSnapshot,
  acquireProfilePluginMutationLock,
  beginProfilePluginMutationLease,
  endProfilePluginMutationLease,
  finalizeProfilePluginSnapshot,
  listProfilePluginSnapshots,
  removeProfilePluginSnapshot,
  restoreProfilePluginSnapshotFiles,
  settleProfilePluginSafetySnapshot,
} from '../src/profile-plugin-snapshot.ts'

function fixture() {
  const home = mkdtempSync(join(tmpdir(), 'dsh-plugin-snapshot-'))
  const profileDir = join(home, 'profiles', 'web')
  mkdirSync(profileDir, { recursive: true })
  writeFileSync(join(profileDir, 'package.json'), JSON.stringify({
    name: 'fixture',
    dependencies: { alpha: '1.0.0' },
    dsh: { profile: { bundles: ['dsh-base', 'alpha'] } },
  }))
  writeFileSync(join(profileDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
  writeFileSync(join(profileDir, 'pnpm-workspace.yaml'), 'packages:\n  - .\nallowBuilds:\n  alpha: false\n')
  return { home, profileDir }
}

describe('Profile plugin snapshots', () => {
  it('captures, compares, and restores only managed plugin-stack files', () => {
    const { home, profileDir } = fixture()
    try {
      const record = createProfilePluginSnapshot({
        home,
        profile: 'web',
        kind: 'manual',
        trigger: 'manual',
        label: 'Known good',
      })
      writeFileSync(join(profileDir, 'package.json'), JSON.stringify({
        name: 'fixture',
        dependencies: { alpha: '2.0.0', beta: '1.0.0' },
        dsh: { profile: { bundles: ['dsh-base', 'alpha', 'beta'] } },
      }))
      expect(listProfilePluginSnapshots({ home, profile: 'web' })[0]?.difference).toEqual({
        added: ['beta'],
        removed: [],
        changed: ['alpha'],
        versionChanges: [{
          name: 'alpha',
          currentVersion: '2.0.0',
          snapshotVersion: '1.0.0',
          direction: 'downgrade',
        }],
      })
      restoreProfilePluginSnapshotFiles({ home, profile: 'web', snapshotId: record.snapshotId })
      expect(JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))).toMatchObject({
        dependencies: { alpha: '1.0.0' },
        dsh: { profile: { bundles: ['dsh-base', 'alpha'] } },
      })
      expect(readFileSync(join(profileDir, 'pnpm-workspace.yaml'), 'utf8')).toContain('alpha: false')
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('drops unchanged automatic snapshots and retains changed ones', () => {
    const { home, profileDir } = fixture()
    try {
      const unchanged = createProfilePluginSnapshot({
        home, profile: 'web', kind: 'automatic', trigger: 'plugin-update',
      })
      expect(finalizeProfilePluginSnapshot({
        home, profile: 'web', snapshotId: unchanged.snapshotId,
      })).toBeUndefined()

      const changed = createProfilePluginSnapshot({
        home, profile: 'web', kind: 'automatic', trigger: 'plugin-remove',
      })
      writeFileSync(join(profileDir, 'package.json'), JSON.stringify({
        name: 'fixture', dependencies: {}, dsh: { profile: { bundles: ['dsh-base'] } },
      }))
      expect(finalizeProfilePluginSnapshot({
        home, profile: 'web', snapshotId: changed.snapshotId,
      })?.snapshotId).toBe(changed.snapshotId)
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('reuses an identical retained snapshot before writing another automatic payload', () => {
    const { home } = fixture()
    try {
      const retained = createProfilePluginSnapshot({
        home, profile: 'web', kind: 'automatic', trigger: 'plugin-update',
      })
      const duplicate = createProfilePluginSnapshot({
        home, profile: 'web', kind: 'automatic', trigger: 'diagnostic-repair',
      })

      expect(duplicate.snapshotId).toBe(retained.snapshotId)
      expect(duplicate.deduplicated).toBe(true)
      expect(listProfilePluginSnapshots({ home, profile: 'web' })).toHaveLength(1)
      expect(finalizeProfilePluginSnapshot({
        home,
        profile: 'web',
        snapshotId: duplicate.snapshotId,
        preserveIfUnchanged: duplicate.deduplicated === true,
      })?.snapshotId).toBe(retained.snapshotId)
      expect(listProfilePluginSnapshots({ home, profile: 'web' })).toHaveLength(1)
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('does not deduplicate against an identical snapshot with a damaged payload', () => {
    const { home } = fixture()
    try {
      const damaged = createProfilePluginSnapshot({
        home, profile: 'web', kind: 'automatic', trigger: 'plugin-update',
      })
      writeFileSync(join(
        home,
        'plugin-snapshots',
        'v1',
        damaged.snapshotId,
        'files',
        'profiles',
        'web',
        'package.json',
      ), 'damaged')

      const replacement = createProfilePluginSnapshot({
        home, profile: 'web', kind: 'automatic', trigger: 'diagnostic-repair',
      })
      expect(replacement.snapshotId).not.toBe(damaged.snapshotId)
      expect(replacement.deduplicated).toBeUndefined()
      expect(listProfilePluginSnapshots({ home, profile: 'web' })).toHaveLength(2)
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('protects restore safety points until the journal settles', () => {
    const { home } = fixture()
    try {
      const safety = createProfilePluginSnapshot({
        home, profile: 'web', kind: 'safety', trigger: 'restore-safety',
      })
      expect(() => removeProfilePluginSnapshot({
        home, profile: 'web', snapshotId: safety.snapshotId,
      })).toThrow('cannot be removed')
      expect(settleProfilePluginSafetySnapshot({
        home, profile: 'web', snapshotId: safety.snapshotId,
      })).toBe(true)
      expect(listProfilePluginSnapshots({ home, profile: 'web' })).toEqual([])
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('protects the last successful startup point from manual deletion', () => {
    const { home } = fixture()
    try {
      const bootable = createProfilePluginSnapshot({
        home, profile: 'web', kind: 'bootable', trigger: 'successful-startup',
      })
      expect(() => removeProfilePluginSnapshot({
        home, profile: 'web', snapshotId: bootable.snapshotId,
      })).toThrow('last successful startup')
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('verifies every payload before changing active files', () => {
    const { home, profileDir } = fixture()
    try {
      const record = createProfilePluginSnapshot({
        home, profile: 'web', kind: 'manual', trigger: 'manual',
      })
      const snapshotPackage = join(
        home, 'plugin-snapshots', 'v1', record.snapshotId, 'files', 'profiles', 'web', 'package.json',
      )
      writeFileSync(snapshotPackage, 'tampered')
      const active = readFileSync(join(profileDir, 'package.json'), 'utf8')
      expect(() => restoreProfilePluginSnapshotFiles({
        home, profile: 'web', snapshotId: record.snapshotId,
      })).toThrow('checksum mismatch')
      expect(readFileSync(join(profileDir, 'package.json'), 'utf8')).toBe(active)
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('holds a startup batch lock across short-lived plugin commands', () => {
    const { home } = fixture()
    const token = randomUUID()
    try {
      beginProfilePluginMutationLease({ home, profile: 'web', ownerPid: process.pid, token })
      expect(() => acquireProfilePluginMutationLock({ home, profile: 'web', waitMs: 0 }))
        .toThrow('another process is changing Profile web')
      endProfilePluginMutationLease({ home, profile: 'web', token })
      const release = acquireProfilePluginMutationLock({ home, profile: 'web', waitMs: 0 })
      release()
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('promotes an acquired CLI lock to a desktop-owned lease without an unlocked gap', () => {
    const { home } = fixture()
    const token = randomUUID()
    try {
      acquireProfilePluginMutationLock({ home, profile: 'web', waitMs: 0 })
      beginProfilePluginMutationLease({ home, profile: 'web', ownerPid: process.pid, token })
      expect(() => acquireProfilePluginMutationLock({ home, profile: 'web', waitMs: 0 }))
        .toThrow('another process is changing Profile web')
      endProfilePluginMutationLease({ home, profile: 'web', token })
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })
})
