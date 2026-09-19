import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { collectWindowsSmokeEvidence } from './collect-windows-smoke-evidence.mjs'

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-windows-smoke-evidence-'))
  const runnerTemp = join(root, 'Runner Temp 中文')
  const destination = join(root, 'artifact')
  await mkdir(join(runnerTemp, 'DeepSeek Harness AppData', 'open-deepseek-harness-desktop', 'logs'), { recursive: true })
  await mkdir(join(runnerTemp, 'DeepSeek Harness Home', 'profiles', 'web'), { recursive: true })
  await writeFile(join(runnerTemp, 'DeepSeek Harness AppData', 'desktop-entry.log'), 'secret-entry-content')
  await writeFile(join(runnerTemp, 'DeepSeek Harness AppData', 'open-deepseek-harness-desktop', 'logs', 'harness.log'), 'token=secret-token')
  await writeFile(join(runnerTemp, 'DeepSeek Harness Home', 'profiles', 'web', 'package.json'), '{"private":"secret-value"}')
  return { root, runnerTemp, destination }
}

test('collects stable metadata without file contents or source paths', async () => {
  const { runnerTemp, destination } = await fixture()
  const now = () => new Date('2026-09-19T00:00:00.000Z')
  const first = await collectWindowsSmokeEvidence({
    runnerTemp, destination, platform: 'linux', runId: '42', runAttempt: '3', now,
  })
  const second = await collectWindowsSmokeEvidence({
    runnerTemp, destination, platform: 'linux', runId: '42', runAttempt: '3', now,
  })
  assert.deepEqual(second, first)
  assert.equal(first.schema, 'open-dsh/windows-smoke-evidence/v1')
  assert.equal(first.status, 'complete')
  assert.equal(first.files.find(entry => entry.label === 'desktop-entry')?.status, 'present')
  assert.equal(first.files.find(entry => entry.label === 'profile-lock')?.status, 'missing')
  const persisted = await readFile(join(destination, 'evidence.json'), 'utf8')
  assert.deepEqual(JSON.parse(persisted), first)
  for (const secret of ['secret-entry-content', 'secret-token', 'secret-value', runnerTemp]) {
    assert.equal(persisted.includes(secret), false, secret)
  }
  assert.deepEqual(first.processes, { status: 'unsupported', entries: [] })
})

test('records path probe failures as degraded evidence', async () => {
  const { destination } = await fixture()
  const evidence = await collectWindowsSmokeEvidence({
    runnerTemp: join(tmpdir(), 'x'.repeat(5000)), destination, platform: 'linux',
  })
  assert.equal(evidence.status, 'degraded')
  assert.ok(evidence.files.every(entry => entry.status === 'unavailable'))
  assert.ok(evidence.files.every(entry => entry.errorKind === 'path-too-long'))
  assert.doesNotMatch(JSON.stringify(evidence), /ENAMETOOLONG|no such file|permission denied/iu)
})

test('fails only when the evidence destination cannot be created', async () => {
  const { root, runnerTemp } = await fixture()
  const destination = join(root, 'not-a-directory')
  await writeFile(destination, 'occupied')
  await assert.rejects(
    collectWindowsSmokeEvidence({ runnerTemp, destination, platform: 'linux' }),
    /EEXIST|not a directory/iu,
  )
})
