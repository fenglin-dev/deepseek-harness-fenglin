import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  refreshBundledPluginSnapshot,
  verifyBundledPluginSnapshot,
  type LatestPluginMetadata,
} from '../scripts/refresh-bundled-plugins.ts'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

function integrity(bytes: Buffer): string {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`
}

async function fixture(): Promise<{ directory: string; registryBytes: Buffer }> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-bundled-plugin-refresh-'))
  roots.push(root)
  const directory = join(root, 'bundled-plugins')
  await mkdir(directory)
  const registryBytes = Buffer.from('old registry archive')
  const gitBytes = Buffer.from('fixed git archive')
  const diagnosticBytes = Buffer.from('fixed diagnostic archive')
  await Promise.all([
    writeFile(join(directory, 'registry-1.0.0.tgz'), registryBytes),
    writeFile(join(directory, 'git-2.0.0.tgz'), gitBytes),
    writeFile(join(directory, 'diagnostic-1.1.0.tgz'), diagnosticBytes),
  ])
  await writeFile(join(directory, 'manifest.json'), `${JSON.stringify({
    schema: 2,
    plugins: [
      {
        seedId: 'registry', packageName: 'registry', version: '1.0.0', profile: 'web',
        installPolicy: 'startup', registrySpec: 'registry@1.0.0',
        archive: 'registry-1.0.0.tgz', integrity: integrity(registryBytes),
      },
      {
        seedId: 'git', packageName: 'git', version: '2.0.0', profile: 'web',
        installPolicy: 'startup', registrySpec: 'github:example/git#commit',
        archive: 'git-2.0.0.tgz', integrity: integrity(gitBytes),
      },
      {
        seedId: 'diagnostic', packageName: 'diagnostic', version: '1.1.0', profile: 'web',
        installPolicy: 'diagnostic', archive: 'diagnostic-1.1.0.tgz', integrity: integrity(diagnosticBytes),
      },
    ],
  }, null, 2)}\n`)
  return { directory, registryBytes }
}

function metadata(bytes: Buffer, version = '1.4.0'): LatestPluginMetadata {
  return {
    name: 'registry',
    version,
    tarball: `https://registry.npmjs.org/registry/-/registry-${version}.tgz`,
    integrity: integrity(bytes),
  }
}

describe('bundled plugin refresh', () => {
  it('resolves registry entries from latest while retaining fixed Git archives', async () => {
    const { directory } = await fixture()
    const nextBytes = Buffer.from('latest stable archive')
    const queryLatest = vi.fn(async () => metadata(nextBytes))
    const manifest = await refreshBundledPluginSnapshot(directory, {
      queryLatest,
      download: vi.fn(async () => nextBytes),
    })

    expect(queryLatest).toHaveBeenCalledWith('registry')
    expect(manifest.plugins).toMatchObject([
      { packageName: 'registry', version: '1.4.0', registrySpec: 'registry@1.4.0', archive: 'registry-1.4.0.tgz' },
      { packageName: 'git', version: '2.0.0', registrySpec: 'github:example/git#commit', archive: 'git-2.0.0.tgz' },
      { packageName: 'diagnostic', version: '1.1.0', installPolicy: 'diagnostic', archive: 'diagnostic-1.1.0.tgz' },
    ])
    await expect(readFile(join(directory, 'registry-1.4.0.tgz'))).resolves.toEqual(nextBytes)
    await expect(readFile(join(directory, 'git-2.0.0.tgz'), 'utf8')).resolves.toBe('fixed git archive')
    await expect(readFile(join(directory, 'diagnostic-1.1.0.tgz'), 'utf8')).resolves.toBe('fixed diagnostic archive')
    await expect(readFile(join(directory, 'registry-1.0.0.tgz'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(verifyBundledPluginSnapshot(directory)).resolves.toEqual(manifest)
  })

  it('keeps a verified local archive when the registry lookup fails', async () => {
    const { directory, registryBytes } = await fixture()
    await writeFile(join(directory, 'manifest.json'), `${JSON.stringify({
      schema: 2,
      plugins: [
        {
          seedId: 'local', packageName: 'local', version: '1.0.0', profile: 'web',
          installPolicy: 'startup', registrySpec: 'local@1.0.0',
          archive: 'registry-1.0.0.tgz', integrity: integrity(registryBytes),
        },
      ],
    }, null, 2)}\n`)
    const manifest = await refreshBundledPluginSnapshot(directory, {
      queryLatest: async () => { throw new Error('pnpm view failed for local: 404') },
      download: async () => { throw new Error('unexpected download') },
    })
    expect(manifest.plugins).toMatchObject([{ packageName: 'local', version: '1.0.0', registrySpec: 'local@1.0.0' }])
    await expect(readFile(join(directory, 'registry-1.0.0.tgz'))).resolves.toEqual(registryBytes)
  })

  it('treats file: registry specs as fixed archives', async () => {
    const { directory } = await fixture()
    const gitBytes = Buffer.from('fixed git archive')
    const queryLatest = vi.fn(async () => metadata(Buffer.from('unused')))
    const manifest = await refreshBundledPluginSnapshot(directory, {
      queryLatest,
      download: vi.fn(async () => Buffer.from('unused')),
    })
    expect(queryLatest).toHaveBeenCalledWith('registry')
    expect(queryLatest).not.toHaveBeenCalledWith('git')
    expect(manifest.plugins).toMatchObject([
      { packageName: 'git', registrySpec: 'github:example/git#commit' },
    ])
  })

  it('rejects a prerelease behind latest without replacing the snapshot', async () => {
    const { directory, registryBytes } = await fixture()
    await expect(refreshBundledPluginSnapshot(directory, {
      queryLatest: async () => metadata(Buffer.from('prerelease'), '2.0.0-rc.1'),
      download: async () => Buffer.from('prerelease'),
    })).rejects.toThrow(/invalid stable metadata/)
    await expect(readFile(join(directory, 'registry-1.0.0.tgz'))).resolves.toEqual(registryBytes)
  })

  it('rejects a download that does not match registry integrity', async () => {
    const { directory, registryBytes } = await fixture()
    await expect(refreshBundledPluginSnapshot(directory, {
      queryLatest: async () => metadata(Buffer.from('expected')),
      download: async () => Buffer.from('modified'),
    })).rejects.toThrow(/downloaded integrity mismatch/)
    await expect(readFile(join(directory, 'registry-1.0.0.tgz'))).resolves.toEqual(registryBytes)
  })
})
