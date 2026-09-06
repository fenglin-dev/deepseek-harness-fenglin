/** macOS launcher rejects invalid inputs before starting pnpm or creating reports. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const launcher = fileURLToPath(new URL('./run-macos.command', import.meta.url))
for (const [name, args, message] of [
  ['unknown option', ['--unexpected'], 'Unknown option'],
  ['missing value', ['--rounds'], 'requires a value'],
  ['missing runtime', ['--runtime', 'missing runtime 中文'], 'Runtime missing'],
  ['missing explicit app', ['--app', 'missing app 中文.app'], 'App not found'],
]) {
  test(`launcher rejects ${name} without writing reports`, { skip: process.platform !== 'darwin' }, (t) => {
    const cwd = mkdtempSync(join(tmpdir(), 'odsh-launcher-test-'))
    t.after(() => rmSync(cwd, { recursive: true, force: true }))
    const result = spawnSync('/bin/zsh', [launcher, '--no-open', '--no-pause', '--output', join(cwd, 'reports'), ...args],
      { cwd, encoding: 'utf8', timeout: 5000 })
    assert.equal(result.error, undefined)
    assert.equal(result.status, 1)
    assert.ok(result.stderr.includes(message), result.stderr)
    assert.deepEqual(readdirSync(cwd), [])
  })
}
