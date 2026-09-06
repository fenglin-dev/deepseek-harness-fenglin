/** Pure benchmark checks plus portable source-policy parity; no persistent user data. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { command, policyEnvironment, summarize } from './benchmark.mjs'
import { resolveSystemProxyEnvironment } from '../../src/system-proxy.ts'

test('after-policy agrees with the current desktop source resolver', async () => {
  for (const base of [{ PATH: '/fixture' }, { https_proxy: 'http://explicit.example' }, { no_proxy: 'internal.example' }]) {
    const actual = await resolveSystemProxyEnvironment(base, async () => 'PROXY system.example:8080')
    assert.deepEqual(policyEnvironment(base, 'after', 'http://system.example:8080/'), actual.environment)
  }
})

test('deadline kills the owned Node process and waits for close', async () => {
  const result = await command(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], process.cwd(), {}, new AbortController().signal, 50)
  assert.equal(result.timedOut, true)
  assert.equal(result.cancelled, false)
  assert.notEqual(result.exitCode, 0)
})

test('an already cancelled invocation cannot report success', async () => {
  const controller = new AbortController()
  controller.abort()
  const result = await command(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], process.cwd(), {}, controller.signal, 5000)
  assert.equal(result.cancelled, true)
  assert.equal(result.timedOut, false)
  assert.notEqual(result.exitCode, 0)
})

test('explicit proxy keys win; the parent is never mutated', () => {
  for (const key of ['HTTP_PROXY', 'https_proxy', 'All_Proxy']) {
    const base = { [key]: 'http://explicit.example', NO_PROXY: 'private.example' }
    assert.deepEqual(policyEnvironment(base, 'before', 'http://system.example'), base)
    assert.deepEqual(policyEnvironment(base, 'after', 'http://system.example'), base)
  }
  const base = { PATH: '/fixture' }
  assert.equal(policyEnvironment(base, 'before', 'http://system.example').HTTP_PROXY, 'http://system.example')
  assert.equal(policyEnvironment(base, 'after', 'http://system.example').HTTP_PROXY, undefined)
  assert.deepEqual(base, { PATH: '/fixture' })
  assert.deepEqual(policyEnvironment(base, 'before', 'DIRECT'), base)
})

test('failures never become a speed improvement', () => {
  const summary = summarize([
    { variant: 'before', cache: 'cold', round: 1, success: false, elapsedMs: 10000 },
    { variant: 'after', cache: 'cold', round: 1, success: true, elapsedMs: 100 },
  ])[0]
  assert.equal(summary.successRateGainPercentagePoints, 100)
  assert.equal(summary.pairedSuccesses, 0)
  assert.equal(summary.pairedMedianReductionPercent, null)
})

test('only matched rounds contribute timing; cold and warm stay separate', () => {
  const summary = summarize([
    { variant: 'before', cache: 'cold', round: 1, success: true, elapsedMs: 200 },
    { variant: 'after', cache: 'cold', round: 1, success: true, elapsedMs: 100 },
    { variant: 'after', cache: 'cold', round: 2, success: true, elapsedMs: 10000 },
    { variant: 'before', cache: 'warm', round: 1, success: true, elapsedMs: 50 },
  ])
  assert.equal(summary[0].pairedMedianReductionPercent, 50)
  assert.equal(summary[0].pairedSuccesses, 1)
  assert.equal(summary[1].successRateGainPercentagePoints, null)
})

test('runner cancellation preserves partial status and cleans its servers and temporary data', { skip: process.platform === 'win32' }, async () => {
  // Windows SIGTERM terminates a process rather than delivering POSIX cancellation; the wrapper needs native Ctrl+C validation.
  const outputRoot = await mkdtemp(join(tmpdir(), 'odsh-ab-cancel-report-'))
  const child = spawn(process.execPath, [fileURLToPath(new URL('./benchmark.mjs', import.meta.url)), '--rounds', '30', '--output', outputRoot],
    { stdio: ['ignore', 'pipe', 'pipe'] })
  const closed = new Promise((done, reject) => { child.once('error', reject); child.once('close', done) })
  let output = ''
  let cancelled = false
  child.stderr.resume()
  child.stdout.on('data', (data) => {
    output += data
    if (!cancelled && output.includes('cold 1/30 before:')) { cancelled = true; child.kill('SIGTERM') }
  })
  const deadline = setTimeout(() => { child.kill('SIGTERM') }, 15000)
  try {
    assert.equal(await closed, 130)
    assert.equal(cancelled, true)
    const report = JSON.parse(await readFile(/Report: (.+)/u.exec(output)[1], 'utf8'))
    assert.equal(report.cleanup, true)
    assert.equal(report.listenersClosed, true)
    assert.equal(report.cancelled, true)
    assert.equal(report.completed, false)
    assert.equal(report.fixtureVerified, null)
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM')
    await closed
    await rm(outputRoot, { recursive: true, force: true })
  }
})
