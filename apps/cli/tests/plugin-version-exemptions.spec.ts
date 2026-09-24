import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { getDshRuntimeVersion, readProfileVersionExemptions } from '@deepseek-ai/dsh-app-boot'
import { runPlugin } from '../src/plugin.ts'

const homes: string[] = []

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
})

function fixture() {
  const home = mkdtempSync(join(tmpdir(), 'cli-version-exemptions-'))
  homes.push(home)
  vi.stubEnv('DSH_HOME', home)
  const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  return { dir: join(home, 'profiles', 'test'), stdout, stderr }
}

it('grants, lists and revokes only an exact compatibility pair', async () => {
  const { dir, stdout, stderr } = fixture()
  const runtime = getDshRuntimeVersion()
  expect(await runPlugin('test', ['allow-version', '@example/plugin@1.2.3', '--dsh-version', runtime, '--accept-risk'])).toBe(0)
  expect(stderr.mock.calls.map(call => call[0]).join('')).toContain('can break the application or corrupt data')
  expect(readProfileVersionExemptions(dir)).toEqual({ '@example/plugin@1.2.3': [runtime] })
  expect(JSON.parse(readFileSync(join(dir, 'compatibility.json'), 'utf8'))).toEqual({ '@example/plugin@1.2.3': [runtime] })
  expect(await runPlugin('test', ['version-exemptions'])).toBe(0)
  expect(stdout).toHaveBeenLastCalledWith(JSON.stringify({ '@example/plugin@1.2.3': [runtime] }, undefined, 2) + '\n')
  expect(await runPlugin('test', ['revoke-version', '@example/plugin@1.2.3', `--dsh-version=${runtime}`])).toBe(0)
  expect(readProfileVersionExemptions(dir)).toEqual({})
})

it.each([
  ['allow-version', 'plugin@1.2.3', '--dsh-version', 'CURRENT'],
  ['allow-version', 'plugin@1.2.3', '--accept-risk'],
  ['allow-version', 'plugin@^1.2.3', '--dsh-version', 'CURRENT', '--accept-risk'],
  ['allow-version', 'plugin@1.2.3', '--dsh-version', '999.0.0', '--accept-risk'],
  ['revoke-version', 'plugin@1.2.3'],
  ['version-exemptions', 'extra'],
])('rejects malformed exemption command %j', async (...arguments_) => {
  const { dir, stderr } = fixture()
  const args = arguments_.map(value => value === 'CURRENT' ? getDshRuntimeVersion() : value)
  expect(await runPlugin('test', args)).toBe(1)
  expect(stderr).toHaveBeenCalled()
  expect(readProfileVersionExemptions(dir)).toEqual({})
})
