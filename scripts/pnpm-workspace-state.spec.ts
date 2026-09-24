import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { preservePnpmWorkspaceState } from './preserve-pnpm-workspace-state.mjs'

const roots: string[] = []

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-pnpm-workspace-state-'))
  roots.push(root)
  return root
}

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('pnpm workspace state safety', () => {
  it('fails before running scripts instead of silently reinstalling dependencies', () => {
    const workspace = readFileSync(resolve(import.meta.dirname, '../pnpm-workspace.yaml'), 'utf8')
    expect(workspace).toMatch(/^verifyDepsBeforeRun: error$/mu)
  })

  it('restores the workspace state after a production deploy succeeds', async () => {
    const root = fixture()
    const state = join(root, 'node_modules/.pnpm-workspace-state-v1.json')
    const development = '{"settings":{"dev":true,"production":true}}\n'
    write(state, development)

    await preservePnpmWorkspaceState(root, async () => {
      writeFileSync(state, '{"settings":{"dev":false,"production":true}}\n')
    })

    expect(readFileSync(state, 'utf8')).toBe(development)
  })

  it('restores the workspace state when a production deploy fails', async () => {
    const root = fixture()
    const state = join(root, 'node_modules/.pnpm-workspace-state-v1.json')
    const development = '{"settings":{"dev":true,"production":true}}\n'
    write(state, development)

    await expect(preservePnpmWorkspaceState(root, async () => {
      writeFileSync(state, '{"settings":{"dev":false,"production":true}}\n')
      throw new Error('deploy failed')
    })).rejects.toThrow('deploy failed')

    expect(readFileSync(state, 'utf8')).toBe(development)
  })

  it('removes workspace state created by a production deploy when none existed before', async () => {
    const root = fixture()
    const state = join(root, 'node_modules/.pnpm-workspace-state-v1.json')

    await preservePnpmWorkspaceState(root, async () => {
      write(state, '{"settings":{"dev":false,"production":true}}\n')
    })

    expect(() => readFileSync(state)).toThrow(/ENOENT/u)
  })
})
