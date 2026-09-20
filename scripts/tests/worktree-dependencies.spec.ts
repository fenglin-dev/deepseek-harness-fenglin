import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  formatWorktreeReport,
  inspectWorktree,
  nodeVersionSatisfies,
  parseLockfileImporters,
  parseWorkspacePatterns,
  pnpmInstallArgs,
  pnpmInstallEnvironment,
} from '../worktree-dependencies.mjs'

const roots: string[] = []

function write(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

function fixture({ withState = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-worktree-doctor-'))
  roots.push(root)
  write(join(root, '.git'), 'gitdir: /repo/.git/worktrees/example\n')
  write(join(root, 'package.json'), JSON.stringify({
    name: 'root',
    packageManager: 'pnpm@11.7.0',
    engines: { node: '^22.19.0 || >=24.0.0' },
    devDependencies: { a: 'workspace:*' },
  }))
  write(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\nverifyDepsBeforeRun: error\n')
  write(join(root, 'packages/a/package.json'), JSON.stringify({ name: 'a', dependencies: { b: 'workspace:*' } }))
  write(join(root, 'packages/b/package.json'), JSON.stringify({ name: 'b' }))
  write(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: \'9.0\'\n\nimporters:\n\n  .:\n    devDependencies: {}\n\n  packages/a:\n    dependencies: {}\n\npackages: {}\n')
  if (withState) {
    write(join(root, 'node_modules/.pnpm-workspace-state-v1.json'), JSON.stringify({
      projects: {
        [root]: { name: 'root' },
        [join(root, 'packages/a')]: { name: 'a' },
        [join(root, 'packages/b')]: { name: 'b' },
      },
      filteredInstall: false,
      settings: { dev: true, optional: true, production: true },
    }))
  }
  return root
}

function pnpmRunner(_command: string, args: string[]) {
  if (args[0] === '--version') return { status: 0, stdout: '11.7.0\n' }
  if (args[0] === 'store') return { status: 0, stdout: '/pnpm/store\n' }
  return { status: 1, stdout: '', stderr: 'unexpected command' }
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('worktree dependency tools', () => {
  it('parses workspace patterns and lockfile importers without installed packages', () => {
    expect(parseWorkspacePatterns('packages:\n  - packages/*/*\n  - apps/*\nverifyDepsBeforeRun: error\n')).toEqual([
      'packages/*/*',
      'apps/*',
    ])
    expect([...parseLockfileImporters('importers:\n\n  .:\n    dependencies: {}\n\n  apps/web:\n    dependencies: {}\n\npackages: {}\n')]).toEqual(['.', 'apps/web'])
  })

  it('uses separate cache-preferred and strict-offline pnpm modes', () => {
    expect(pnpmInstallArgs({ offline: false })).toEqual([
      'install', '--frozen-lockfile', '--ignore-scripts', '--prefer-offline',
    ])
    expect(pnpmInstallArgs({ offline: true })).toEqual([
      'install', '--frozen-lockfile', '--ignore-scripts', '--offline', '--config.trustLockfile=true',
    ])
    const online = pnpmInstallEnvironment({ offline: false }, { SENTINEL: 'yes' })
    expect(online.SENTINEL).toBe('yes')
    expect(online.HTTPS_PROXY).toBeUndefined()
    const offline = pnpmInstallEnvironment({ offline: true }, { SENTINEL: 'yes' })
    expect(offline.SENTINEL).toBe('yes')
    expect(offline.HTTPS_PROXY).toBe('http://127.0.0.1:9')
    expect(offline.PNPM_CONFIG_FETCH_RETRIES).toBe('0')
    expect(offline.COREPACK_ENABLE_NETWORK).toBe('0')
  })

  it('evaluates the Node engine declared by the fixture rather than a hard-coded release line', () => {
    expect(nodeVersionSatisfies('22.19.0', '^22.19.0 || >=24.0.0')).toBe(true)
    expect(nodeVersionSatisfies('23.0.0', '^22.19.0 || >=24.0.0')).toBe(false)
    expect(nodeVersionSatisfies('25.1.0', '^22.19.0 || >=24.0.0')).toBe(true)
    expect(nodeVersionSatisfies('26.0.0', '>=26.0.0 <27.0.0')).toBe(true)
  })

  it('reports a fully linked worktree as ready', () => {
    const result = inspectWorktree(fixture(), { runner: pnpmRunner })
    expect(result.issues).toEqual([])
    expect(result.facts.linkedWorktree).toBe(true)
    expect(formatWorktreeReport(result)).toMatch(/Status: ready/u)
  })

  it('reports missing checkout-local dependency state with repair commands', () => {
    const result = inspectWorktree(fixture({ withState: false }), { runner: pnpmRunner })
    expect(result.issues.map(issue => issue.code)).toEqual([
      'node-modules-missing',
      'workspace-state-missing',
    ])
    const report = formatWorktreeReport(result)
    expect(report).toMatch(/node scripts\/setup-worktree\.mjs/u)
    expect(report).toMatch(/node scripts\/setup-worktree\.mjs --offline/u)
  })

  it('reports workspace state left in production-only mode', () => {
    const root = fixture()
    write(join(root, 'node_modules/.pnpm-workspace-state-v1.json'), JSON.stringify({
      projects: {
        [root]: { name: 'root' },
        [join(root, 'packages/a')]: { name: 'a' },
        [join(root, 'packages/b')]: { name: 'b' },
      },
      filteredInstall: true,
      settings: { dev: false, optional: true, production: true },
    }))
    const result = inspectWorktree(root, { runner: pnpmRunner })
    expect(result.issues.at(-1)?.code).toBe('workspace-selection-filtered')
    expect(result.issues.at(-1)?.detail ?? '').toMatch(/without dev/u)
  })

  it('executes both CLI entry points without modifying the checkout', () => {
    const repositoryRoot = resolve(import.meta.dirname, '../..')
    expect(execFileSync(process.execPath, ['scripts/setup-worktree.mjs', '--help'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
    })).toContain('Usage:')
    expect(execFileSync(process.execPath, ['scripts/worktree-doctor.mjs'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
    })).toContain('DeepSeek Harness worktree dependency doctor')
  })
})
