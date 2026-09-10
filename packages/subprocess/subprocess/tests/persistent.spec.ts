import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import {
  FilePersistentServiceAuthorizer,
  FilePersistentServiceRuntimeRegistry,
  normalizePersistentServiceDeclaration,
  persistentProfileFingerprint,
  persistentServiceKey,
  persistentSpawnSpecFingerprint,
} from '../src/persistent.ts'

const directories: string[] = []
const declaration = {
  pluginName: '@example/background-plugin',
  pluginVersion: '1.2.3',
  serviceId: 'indexer',
  purpose: 'Index the selected workspace while Desktop is closed.',
  specFingerprint: 'a'.repeat(64),
}

function fixture(now = 1_700_000_000_000) {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-persistent-authority-'))
  directories.push(directory)
  const path = join(directory, 'state.json')
  const profile = persistentProfileFingerprint('/profiles/example')
  return { path, profile, authority: new FilePersistentServiceAuthorizer(path, profile, () => now) }
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

describe('persistent service authority', () => {
  it('records a first request as pending and grants only the exact approved declaration', () => {
    const { authority, profile } = fixture()
    const first = authority.request(declaration)
    expect(first).toEqual({ key: persistentServiceKey(profile, declaration), granted: false, status: 'pending' })
    expect(authority.list()).toMatchObject([{ ...declaration, status: 'pending' }])

    authority.approve(first.key)
    expect(authority.request(declaration)).toEqual({ key: first.key, granted: true, status: 'approved' })
    expect(authority.request({ ...declaration, pluginVersion: '1.2.4' }).granted).toBe(false)
    expect(authority.request({ ...declaration, specFingerprint: 'b'.repeat(64) }).granted).toBe(false)
  })

  it('separates approvals by Profile and removes revoked declarations', () => {
    const shared = fixture()
    const request = shared.authority.request(declaration)
    shared.authority.approve(request.key)
    const other = new FilePersistentServiceAuthorizer(shared.path, persistentProfileFingerprint('/profiles/other'))
    expect(other.request(declaration).granted).toBe(false)
    expect(shared.authority.revoke(request.key).some(record => record.key === request.key)).toBe(false)
  })

  it('fails closed for malformed state and rejects unbounded declarations', () => {
    const { path, profile } = fixture()
    writeFileSync(path, '{"schema":"wrong","records":[]}', 'utf8')
    expect(() => new FilePersistentServiceAuthorizer(path, profile).list()).toThrow('unreadable')
    expect(() => normalizePersistentServiceDeclaration({ ...declaration, purpose: '' })).toThrow('invalid')
    expect(() => normalizePersistentServiceDeclaration({ ...declaration, specFingerprint: 'not-a-digest' })).toThrow('invalid')
    expect(readFileSync(path, 'utf8')).toContain('wrong')
  })

  it('keeps runtime identities separate and clears them only on confirmation', () => {
    const { path, profile } = fixture()
    const key = persistentServiceKey(profile, declaration)
    const registry = new FilePersistentServiceRuntimeRegistry(path, profile)
    registry.track(key, declaration, [{ pid: 42, started: '1700000000' }])
    expect(registry.identities(key)).toEqual([{ pid: 42, started: '1700000000' }])
    expect(() => registry.identities('bad-key')).toThrow('invalid persistent service key')
    registry.clear(key)
    expect(registry.identities(key)).toEqual([])
  })

  it('binds approval to the actual launch while ignoring rotated secret values', () => {
    const base = {
      argv: ['/fixture/service', '--serve'], cwd: '/fixture', graceMs: 1_000,
      env: { API_TOKEN: 'first', MODE: 'safe' },
      stdio: { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' } as const,
    }
    expect(persistentSpawnSpecFingerprint(base)).toBe(
      persistentSpawnSpecFingerprint({ ...base, env: { ...base.env, API_TOKEN: 'second' } }),
    )
    expect(persistentSpawnSpecFingerprint(base)).not.toBe(
      persistentSpawnSpecFingerprint({ ...base, argv: ['/fixture/other', '--serve'] }),
    )
    expect(persistentSpawnSpecFingerprint(base)).not.toBe(
      persistentSpawnSpecFingerprint({ ...base, env: { ...base.env, MODE: 'unsafe' } }),
    )
  })
})
