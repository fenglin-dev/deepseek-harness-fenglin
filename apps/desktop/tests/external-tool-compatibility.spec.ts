import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import manifestJson from '../external-tools/compatibility.v1.json'
import { ExternalToolCompatibilityManager } from '../src/external-tool-compatibility.ts'
import {
  parseExternalToolCompatibilityManifest,
  resolveExternalToolCoordinate,
} from '../src/external-tool-compatibility-manifest.ts'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

async function temporaryDirectory(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'dsh-external-tools-'))
  temporaryDirectories.push(path)
  return path
}

function manifestBytes(value: unknown = manifestJson): Uint8Array {
  return Buffer.from(JSON.stringify(value))
}

function bundleBytes(bytes: Uint8Array, digest = createHash('sha256').update(bytes).digest('hex')): Uint8Array {
  const statement = {
    _type: 'https://in-toto.io/Statement/v1',
    subject: [{ name: 'external-tools-compatibility.v1.json', digest: { sha256: digest } }],
    predicateType: 'https://slsa.dev/provenance/v1',
    predicate: {},
  }
  return Buffer.from(JSON.stringify({
    dsseEnvelope: {
      payloadType: 'application/vnd.in-toto+json',
      payload: Buffer.from(JSON.stringify(statement)).toString('base64'),
      signatures: [{}],
    },
  }))
}

function response(bytes: Uint8Array): Response {
  return new Response(bytes, { status: 200, headers: { 'content-length': String(bytes.byteLength) } })
}

describe('external tool compatibility', () => {
  it('keeps reviewed providers and runtimes aligned with the source baseline', async () => {
    for (const toolId of ['codex', 'claude-code'] as const) {
      const provider = JSON.parse(await readFile(new URL(
        `../../../packages/subagent/subagent-${toolId}/package.json`, import.meta.url,
      ), 'utf8')) as { name: string; version: string; dependencies: Record<string, string> }
      const coordinate = manifestJson.tools[toolId]
      expect(coordinate.packageName).toBe(provider.name)
      expect(manifestJson.reviewedSourceVersion).toBe(provider.version)
      expect(coordinate.runtimePackage.version).toBe(provider.dependencies[coordinate.runtimePackage.packageName])
    }
  })

  it('retries online lookup after an earlier offline install request', async () => {
    const manifest = manifestBytes()
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'))
    const manager = new ExternalToolCompatibilityManager({
      cacheDirectory: await temporaryDirectory(),
      desktopVersion: '0.1.2-alpha.5',
      now: () => new Date('2026-09-03T00:00:00.000Z'),
      fetch: fetchMock,
      verifyBundle: async () => {},
    })
    await expect(manager.resolve('codex')).resolves.toMatchObject({ source: 'embedded' })
    fetchMock.mockReset()
      .mockResolvedValueOnce(response(manifest))
      .mockResolvedValueOnce(response(bundleBytes(manifest)))
    await expect(manager.resolve('codex')).resolves.toMatchObject({ source: 'remote' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('picks up newer signed coordinates without restarting the application', async () => {
    const first = manifestBytes()
    const newer = manifestBytes({
      ...manifestJson,
      revision: manifestJson.revision + 1,
      tools: {
        ...manifestJson.tools,
        codex: { ...manifestJson.tools.codex, version: '0.1.2-alpha.6' },
      },
    })
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response(first))
      .mockResolvedValueOnce(response(bundleBytes(first)))
      .mockResolvedValueOnce(response(newer))
      .mockResolvedValueOnce(response(bundleBytes(newer)))
    const manager = new ExternalToolCompatibilityManager({
      cacheDirectory: await temporaryDirectory(),
      desktopVersion: '0.1.2-alpha.5',
      now: () => new Date('2026-09-03T00:00:00.000Z'),
      fetch: fetchMock,
      verifyBundle: async () => {},
    })
    await expect(manager.resolve('codex')).resolves.toMatchObject({ version: '0.1.2-alpha.5' })
    await expect(manager.resolve('codex')).resolves.toMatchObject({
      version: '0.1.2-alpha.6', revision: manifestJson.revision + 1, source: 'remote',
    })
  })

  it('shares an in-flight refresh across concurrent tool requests', async () => {
    const manifest = manifestBytes()
    let releaseBarrier: (() => void) | undefined
    let notifyStarted: (() => void) | undefined
    const barrier = new Promise<void>((resolve) => { releaseBarrier = resolve })
    const started = new Promise<void>((resolve) => { notifyStarted = resolve })
    let arrivals = 0
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      if (++arrivals === 2) notifyStarted?.()
      await barrier
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      return response(url.endsWith('.sigstore.json') ? bundleBytes(manifest) : manifest)
    })
    const manager = new ExternalToolCompatibilityManager({
      cacheDirectory: await temporaryDirectory(),
      desktopVersion: '0.1.2-alpha.5',
      now: () => new Date('2026-09-03T00:00:00.000Z'),
      fetch: fetchMock,
      verifyBundle: async () => {},
    })
    const codex = manager.resolve('codex')
    const claude = manager.resolve('claude-code')
    try {
      await started
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
      releaseBarrier?.()
      await Promise.all([codex, claude])
    }
    await expect(codex).resolves.toMatchObject({ source: 'remote', toolId: 'codex' })
    await expect(claude).resolves.toMatchObject({ source: 'remote', toolId: 'claude-code' })
  })

  it('parses exact pins and never creates a floating package spec', () => {
    const manifest = parseExternalToolCompatibilityManifest(manifestJson)
    expect(resolveExternalToolCoordinate(manifest, 'codex', 'embedded')).toMatchObject({
      packageSpec: '@deepseek-ai/dsh-subagent-codex@0.1.2-alpha.5',
      source: 'embedded',
    })
  })

  it('accepts a signed remote manifest whose attested digest matches', async () => {
    const cacheDirectory = await temporaryDirectory()
    const manifest = manifestBytes()
    const bundle = bundleBytes(manifest)
    const verifyBundle = vi.fn(async () => {})
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(manifest))
      .mockResolvedValueOnce(response(bundle))
    const manager = new ExternalToolCompatibilityManager({
      cacheDirectory,
      desktopVersion: '0.1.2-alpha.5',
      now: () => new Date('2026-09-03T00:00:00.000Z'),
      fetch: fetchMock,
      verifyBundle,
    })

    await expect(manager.resolve('claude-code')).resolves.toMatchObject({
      packageSpec: '@deepseek-ai/dsh-subagent-claude-code@0.1.2-alpha.5',
      source: 'remote',
    })
    expect(verifyBundle).toHaveBeenCalledOnce()
    expect(await readFile(join(cacheDirectory, 'external-tools-compatibility.v1.json'))).toEqual(Buffer.from(manifest))
  })

  it('rejects a mismatched attestation and falls back to embedded pins', async () => {
    const cacheDirectory = await temporaryDirectory()
    const manifest = manifestBytes()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(manifest))
      .mockResolvedValueOnce(response(bundleBytes(manifest, '0'.repeat(64))))
    const manager = new ExternalToolCompatibilityManager({
      cacheDirectory,
      desktopVersion: '0.1.2-alpha.5',
      now: () => new Date('2026-09-03T00:00:00.000Z'),
      fetch: fetchMock,
      verifyBundle: async () => {},
    })

    await expect(manager.resolve('codex')).resolves.toMatchObject({ source: 'embedded' })
  })

  it('uses a verified cache when refresh is offline and refuses a signed revision rollback', async () => {
    const cacheDirectory = await temporaryDirectory()
    const cachedRevision = manifestJson.revision + 1
    const revisionThree = manifestBytes({ ...manifestJson, revision: cachedRevision })
    const first = new ExternalToolCompatibilityManager({
      cacheDirectory,
      desktopVersion: '0.1.2-alpha.5',
      now: () => new Date('2026-09-03T00:00:00.000Z'),
      fetch: vi.fn()
        .mockResolvedValueOnce(response(revisionThree))
        .mockResolvedValueOnce(response(bundleBytes(revisionThree))),
      verifyBundle: async () => {},
    })
    await expect(first.resolve('codex')).resolves.toMatchObject({ source: 'remote', revision: cachedRevision })

    const revisionTwo = manifestBytes()
    const second = new ExternalToolCompatibilityManager({
      cacheDirectory,
      desktopVersion: '0.1.2-alpha.5',
      now: () => new Date('2026-09-03T00:00:00.000Z'),
      fetch: vi.fn()
        .mockResolvedValueOnce(response(revisionTwo))
        .mockResolvedValueOnce(response(bundleBytes(revisionTwo))),
      verifyBundle: async () => {},
    })
    await expect(second.resolve('codex')).resolves.toMatchObject({ source: 'cache', revision: cachedRevision })

    const offline = new ExternalToolCompatibilityManager({
      cacheDirectory,
      desktopVersion: '0.1.2-alpha.5',
      now: () => new Date('2026-09-03T00:00:00.000Z'),
      fetch: vi.fn(async () => { throw new Error('offline') }),
      verifyBundle: async () => {},
    })
    await expect(offline.resolve('claude-code')).resolves.toMatchObject({ source: 'cache', revision: cachedRevision })
  })

  it('rejects expired or cross-version-line signed manifests', async () => {
    const cacheDirectory = await temporaryDirectory()
    const expired = manifestBytes({ ...manifestJson, expiresAt: '2026-09-02T00:00:00.000Z' })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(expired))
      .mockResolvedValueOnce(response(bundleBytes(expired)))
    const manager = new ExternalToolCompatibilityManager({
      cacheDirectory,
      desktopVersion: '0.1.3-alpha.1',
      now: () => new Date('2026-09-03T00:00:00.000Z'),
      fetch: fetchMock,
      verifyBundle: async () => {},
    })

    await expect(manager.resolve('codex')).resolves.toMatchObject({ source: 'embedded' })
  })
})
