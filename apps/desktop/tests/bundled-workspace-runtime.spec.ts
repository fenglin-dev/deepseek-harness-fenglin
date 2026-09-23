import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadBundledWorkspaceRuntimeManifest } from '../src/bundled-workspace-runtime.ts'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

describe('bundled workspace runtime metadata', () => {
  it('loads only the native installer artifact', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-bundled-workspace-runtime-'))
    roots.push(root)
    await writeFile(join(root, 'workspace-runtime-darwin-arm64.json'), JSON.stringify({
      target: 'darwin-arm64',
      fileName: 'DeepSeek-Harness-workspace-runtime-darwin-arm64.tar.gz',
      size: 42,
      sha256: 'a'.repeat(64),
      payloadDigest: 'b'.repeat(64),
      pythonVersion: '3.12.14',
      githubUrl: 'https://github.com/example/runtime.tar.gz',
      cnbUrl: 'https://cnb.cool/example/runtime.tar.gz',
      office: {
        source: 'npm',
        fileName: 'libreoffice-kit-darwin-arm64-0.0.1.tgz',
        size: 43,
        integrity: `sha512-${Buffer.alloc(64).toString('base64')}`,
        payloadDigest: 'c'.repeat(64),
        enginePackage: '@deepseek-ai/libreoffice-kit-darwin-arm64',
        engineVersion: '0.0.1',
        url: 'https://registry.npmjs.org/@deepseek-ai/libreoffice-kit-darwin-arm64/-/libreoffice-kit-darwin-arm64-0.0.1.tgz',
      },
    }))

    const manifest = await loadBundledWorkspaceRuntimeManifest(root, 'darwin-arm64', '0.1.6-alpha.2.2')
    expect(manifest.desktopVersion).toBe('0.1.6-alpha.2.2')
    expect(manifest.artifacts['darwin-arm64']).toMatchObject({ payloadDigest: 'b'.repeat(64) })
    expect(Object.keys(manifest.artifacts)).toEqual(['darwin-arm64'])
  })
})
