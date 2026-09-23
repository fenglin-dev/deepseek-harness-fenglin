import { createHash } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceRuntimeCatalog } from '../src/workspace-runtime-catalog.ts'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

const version = '0.1.6-alpha.2.1'
const documentName = `workspace-runtimes-${version}.v2.json`
function artifact(target: 'win32-x64' | 'darwin-arm64' | 'darwin-x64' | 'linux-x64') {
  return {
    target, fileName: `DeepSeek-Harness-workspace-runtime-${target}.tar.gz`,
    size: 1024, sha256: 'a'.repeat(64), payloadDigest: 'b'.repeat(64), pythonVersion: '3.12.14',
    githubUrl: `https://github.com/example/${target}.tar.gz`, cnbUrl: `https://cnb.cool/example/${target}.tar.gz`,
    office: {
      source: 'npm', fileName: `libreoffice-kit-${target.startsWith('linux-') ? 'wasm' : target}-0.0.1.tgz`,
      size: 1024, payloadDigest: 'd'.repeat(64),
      enginePackage: target.startsWith('linux-')
        ? '@deepseek-ai/libreoffice-kit-wasm'
        : `@deepseek-ai/libreoffice-kit-${target}`,
      engineVersion: '0.0.1',
      integrity: `sha512-${Buffer.alloc(64).toString('base64')}`,
      url: `https://registry.npmjs.org/@deepseek-ai/libreoffice-kit-${target}/-/office-${target}.tgz`,
    },
  }
}
const manifest = {
  schema: 'dsh/desktop-workspace-runtimes/v2', desktopVersion: version,
  issuedAt: '2026-09-19T00:00:00.000Z', expiresAt: '2026-09-20T00:00:00.000Z',
  artifacts: {
    'win32-x64': artifact('win32-x64'), 'darwin-arm64': artifact('darwin-arm64'),
    'darwin-x64': artifact('darwin-x64'), 'linux-x64': artifact('linux-x64'),
  },
}

function encoded(value: unknown): Uint8Array { return Buffer.from(JSON.stringify(value)) }

function bundle(bytes: Uint8Array, digest = createHash('sha256').update(bytes).digest('hex')): Uint8Array {
  const statement = {
    _type: 'https://in-toto.io/Statement/v1',
    subject: [{ name: documentName, digest: { sha256: digest } }],
  }
  return encoded({
    dsseEnvelope: {
      payloadType: 'application/vnd.in-toto+json',
      payload: Buffer.from(JSON.stringify(statement)).toString('base64'),
      signatures: [{}],
    },
  })
}

function response(bytes: Uint8Array): Response {
  return new Response(new Uint8Array(bytes), { status: 200, headers: { 'content-length': String(bytes.byteLength) } })
}

async function cacheDirectory(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-workspace-runtime-catalog-'))
  roots.push(root)
  return root
}

describe('WorkspaceRuntimeCatalog', () => {
  it('accepts only a Sigstore-verified attestation for the exact catalog bytes', async () => {
    const bytes = encoded(manifest)
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response(bytes))
      .mockResolvedValueOnce(response(bundle(bytes)))
    const verifyBundle = vi.fn(async () => {})
    const catalog = new WorkspaceRuntimeCatalog({
      cacheDirectory: await cacheDirectory(), desktopVersion: version, fetch,
      now: () => new Date('2026-09-19T12:00:00.000Z'), metadataBaseUrls: () => ['https://downloads.example.test'],
      verifyBundle,
    })
    await expect(catalog.load()).resolves.toMatchObject({ desktopVersion: version })
    expect(verifyBundle).toHaveBeenCalledOnce()
  })

  it('rejects a verified bundle whose attested digest does not cover the catalog', async () => {
    const bytes = encoded(manifest)
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response(bytes))
      .mockResolvedValueOnce(response(bundle(bytes, 'c'.repeat(64))))
    const catalog = new WorkspaceRuntimeCatalog({
      cacheDirectory: await cacheDirectory(), desktopVersion: version, fetch,
      now: () => new Date('2026-09-19T12:00:00.000Z'), metadataBaseUrls: () => ['https://downloads.example.test'],
      verifyBundle: async () => {},
    })
    await expect(catalog.load()).rejects.toThrow(/does not cover/u)
  })

  it('falls back across configured release channels and forbids production URL overrides', async () => {
    const bytes = encoded(manifest)
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new Error('CNB unavailable'))
      .mockRejectedValueOnce(new Error('CNB unavailable'))
      .mockResolvedValueOnce(response(bytes))
      .mockResolvedValueOnce(response(bundle(bytes)))
    const catalog = new WorkspaceRuntimeCatalog({
      cacheDirectory: await cacheDirectory(), desktopVersion: version, fetch,
      now: () => new Date('2026-09-19T12:00:00.000Z'),
      metadataBaseUrls: () => ['https://cnb.example.test', 'https://github.example.test'], verifyBundle: async () => {},
    })
    await expect(catalog.load()).resolves.toMatchObject({ desktopVersion: version })
    expect(fetch).toHaveBeenCalledTimes(4)

    const productionOverride = new WorkspaceRuntimeCatalog({
      cacheDirectory: await cacheDirectory(), desktopVersion: version, fetch,
      metadataBaseUrl: 'https://test.example.test', development: false, verifyBundle: async () => {},
    })
    await expect(productionOverride.load()).rejects.toThrow(/only in development/u)
  })
})
