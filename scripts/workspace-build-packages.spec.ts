import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { workspaceBuildPackages } from './workspace-build-packages.ts'

const roots: string[] = []

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-workspace-build-packages-'))
  roots.push(root)
  return root
}

function write(path: string, content = ''): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('workspaceBuildPackages', () => {
  it('discovers live package manifests without admitting removed-package build residue', () => {
    const root = fixture()
    write(join(root, 'vendor/cordis/package.json'), '{}')
    write(join(root, 'packages/core/agent/package.json'), '{}')
    write(join(root, 'apps/cli/package.json'), '{}')
    write(join(root, 'packages/e2b/e2b/lib/types/index.js'), 'export {}\n')
    write(join(root, 'packages/e2b/e2b/node_modules/e2b/package.json'), '{}')

    expect(workspaceBuildPackages(root, ['vendor/*', 'packages/*/*', 'apps/cli'])).toEqual([
      'apps/cli',
      'packages/core/agent',
      'vendor/cordis',
    ])
  })
})
