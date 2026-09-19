import { describe, expect, it } from 'vitest'
import { parseWorkspaceRuntimeManifest, WORKSPACE_RUNTIME_TARGETS, workspaceRuntimeTarget } from '../src/workspace-runtime-manifest.ts'

interface MutableArtifact {
  target: string
  fileName: string
  size: number
  sha256: string
  payloadDigest: string
  pythonVersion: string
  githubUrl: string
  cnbUrl: string
}

interface MutableManifest {
  schema: string
  desktopVersion: string
  issuedAt: string
  expiresAt: string
  artifacts: Record<string, MutableArtifact>
}

function manifest(): MutableManifest {
  return {
    schema: 'dsh/desktop-workspace-runtimes/v1', desktopVersion: '0.1.6-alpha.2',
    issuedAt: '2026-09-19T00:00:00.000Z', expiresAt: '2027-03-18T00:00:00.000Z',
    artifacts: Object.fromEntries(WORKSPACE_RUNTIME_TARGETS.map(target => [target, {
      target,
      fileName: `DeepSeek-Harness-workspace-runtime-${target}.tar.gz`,
      size: 100,
      sha256: 'a'.repeat(64), payloadDigest: 'b'.repeat(64), pythonVersion: '3.12.14',
      githubUrl: `https://github.com/example/release/${target}.tar.gz`,
      cnbUrl: `https://cnb.cool/example/release/${target}.tar.gz`,
    }])),
  }
}

describe('workspace runtime manifest', () => {
  it('accepts the exact four-target signed-document shape', () => {
    expect(parseWorkspaceRuntimeManifest(manifest()).artifacts['linux-x64'].pythonVersion).toBe('3.12.14')
    expect(workspaceRuntimeTarget('win32', 'x64')).toBe('win32-x64')
    expect(workspaceRuntimeTarget('win32', 'arm64')).toBeUndefined()
  })

  it.each([
    ['wrong schema', (value: MutableManifest) => { value.schema = 'wrong' }],
    ['unknown target', (value: MutableManifest) => { value.artifacts['freebsd-x64'] = value.artifacts['linux-x64']! }],
    ['oversize payload', (value: MutableManifest) => { value.artifacts['linux-x64']!.size = 3 * 1024 * 1024 * 1024 }],
    ['bad digest', (value: MutableManifest) => { value.artifacts['linux-x64']!.sha256 = '../archive' }],
    ['insecure URL', (value: MutableManifest) => { value.artifacts['linux-x64']!.githubUrl = 'http://example.test/archive' }],
  ])('rejects %s', (_name, mutate) => {
    const value = manifest()
    mutate(value)
    expect(() => parseWorkspaceRuntimeManifest(value)).toThrow()
  })
})
