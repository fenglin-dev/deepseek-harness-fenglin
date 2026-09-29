import assert from 'node:assert/strict'
import { test } from 'node:test'
import { affectedPlatforms, checkPlatformReuse } from './check-release-platform-reuse.mjs'

const OLD = 'a'.repeat(40)
const CURRENT = 'b'.repeat(40)

test('macOS package smoke changes affect macOS only', () => {
  assert.deepEqual(affectedPlatforms('apps/desktop/scripts/smoke-macos-package.mjs'), ['macos'])
  assert.deepEqual(affectedPlatforms('apps/desktop/scripts/smoke-macos-package.test.mjs'), ['macos'])
  assert.deepEqual(affectedPlatforms('apps/desktop/scripts/smoke-windows-package.ps1'), ['windows'])
  assert.deepEqual(affectedPlatforms('apps/desktop/scripts/runtime-deploy-config.test.mjs'), ['windows'])
  assert.deepEqual(affectedPlatforms('apps/desktop/scripts/prepare-unix-runtime.mjs'), ['macos', 'linux'])
  assert.deepEqual(affectedPlatforms('apps/desktop/electron-builder.linux.yml'), ['linux'])
  assert.deepEqual(affectedPlatforms('.agents/skills/open-dsh-desktop-release-packaging/SKILL.md'), [])
  assert.deepEqual(affectedPlatforms('apps/desktop/src/main.ts'), ['windows', 'macos', 'linux'])
  assert.deepEqual(affectedPlatforms('.github/workflows/desktop-packages.yml'), ['windows', 'macos', 'linux'])
})

test('older Windows/Linux runs survive a macOS-only fix; macOS must rebuild', () => {
  const calls = []
  const run = (_command, args) => {
    calls.push(args)
    return args[0] === 'diff' ? 'apps/desktop/scripts/smoke-macos-package.mjs\n' : ''
  }
  assert.equal(checkPlatformReuse('windows', OLD, CURRENT, run).changed.length, 1)
  assert.equal(checkPlatformReuse('linux', OLD, CURRENT, run).changed.length, 1)
  assert.throws(() => checkPlatformReuse('macos', OLD, CURRENT, run), /source changes affect it/u)
  assert.equal(calls.filter(args => args[0] === 'merge-base').length, 3)
})

test('shared changes and unavailable ancestry reject reuse', () => {
  const shared = (_command, args) => args[0] === 'diff' ? 'apps/desktop/src/main.ts\n' : ''
  assert.throws(() => checkPlatformReuse('linux', OLD, CURRENT, shared), /source changes affect it/u)
  assert.throws(() => checkPlatformReuse('windows', OLD, CURRENT, () => { throw new Error('missing commit') }), /not an available ancestor/u)
})
