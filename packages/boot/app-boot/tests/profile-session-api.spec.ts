import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { classifyProfileDiagnostic, inspectProfileLegacySessionApi } from '../src/index.ts'

const homes: string[] = []
afterEach(() => { for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true }) })

function fixture(source: string, active = true, peer = true) {
  const home = mkdtempSync(join(tmpdir(), 'dsh-session-api-'))
  homes.push(home)
  const profile = join(home, 'profiles', 'web')
  const root = join(profile, 'node_modules', '@fixture', 'arbitrary-plugin')
  mkdirSync(root, { recursive: true })
  writeFileSync(join(profile, 'package.json'), JSON.stringify({
    name: 'fixture', dependencies: { '@fixture/arbitrary-plugin': '1.0.0' },
    dsh: { profile: { bundles: active ? ['@fixture/arbitrary-plugin'] : [] } },
  }))
  writeFileSync(join(root, 'package.json'), JSON.stringify({
    name: '@fixture/arbitrary-plugin', version: '1.0.0',
    peerDependencies: peer ? { '@deepseek-ai/dsh-session': '*' } : {},
  }))
  writeFileSync(join(root, 'index.js'), source)
  return { home, root, profile }
}

it('attributes an advisory warning to an enabled external bundle without executing or changing it', () => {
  const { home, profile, root } = fixture('throw new Error("must not execute"); for (const event of session.events) {}')
  const before = readFileSync(join(profile, 'package.json'), 'utf8')
  const issues = inspectProfileLegacySessionApi({ binName: 'dsh', profile: 'web', home })
  expect(issues).toHaveLength(1)
  expect(issues[0]).toMatchObject({ code: 'profile.session-api-incompatible', severity: 'warning', attribution: { rootPackage: '@fixture/arbitrary-plugin' } })
  expect(issues[0]?.actions).not.toContain('isolate')
  expect(JSON.stringify(issues)).not.toContain(root)
  expect(readFileSync(join(profile, 'package.json'), 'utf8')).toBe(before)
})

it.each([
  ['for (const event of session.snapshotEvents()) {}', true, true],
  ['for (const event of session.events) {}', false, true],
  ['for (const event of session.events) {}', true, false],
] as const)('ignores modern APIs or unrelated/inactive packages: %s %s %s', (source, active, peer) => {
  const { home } = fixture(source, active, peer)
  expect(inspectProfileLegacySessionApi({ binName: 'dsh', profile: 'web', home })).toEqual([])
})

it('does not follow source symlinks outside the installed package', () => {
  const { home, root } = fixture('')
  writeFileSync(join(home, 'external.js'), 'for (const event of session.events) {}')
  symlinkSync(join(home, 'external.js'), join(root, 'linked.js'))
  expect(inspectProfileLegacySessionApi({ binName: 'dsh', profile: 'web', home })).toEqual([])
})

it('classifies the reproduced callback error without authorizing automatic isolation', () => {
  const issue = classifyProfileDiagnostic({ source: 'profile', phase: 'runtime', value: new TypeError('session.events is not iterable') })
  expect(issue.code).toBe('profile.session-api-incompatible')
  expect(issue.actions).toEqual(['open-config', 'export'])
})

it('removes the warning after a compatible source update and tolerates damaged metadata', () => {
  const { home, root } = fixture('for (const event of agent.session.events) {}')
  const inspect = () => inspectProfileLegacySessionApi({ binName: 'dsh', profile: 'web', home })
  expect(inspect()).toHaveLength(1)
  writeFileSync(join(root, 'index.js'), 'for (const event of agent.session.snapshotEvents()) {}')
  expect(inspect()).toEqual([])
  writeFileSync(join(root, 'package.json'), '{')
  expect(inspect()).toEqual([])
})

it('skips dependency source and over-budget files', () => {
  const { home, root } = fixture(' '.repeat(256 * 1024) + 'for (const event of session.events) {}')
  mkdirSync(join(root, 'node_modules'), { recursive: true })
  writeFileSync(join(root, 'node_modules', 'unrelated.js'), 'for (const event of session.events) {}')
  expect(inspectProfileLegacySessionApi({ binName: 'dsh', profile: 'web', home })).toEqual([])
})
