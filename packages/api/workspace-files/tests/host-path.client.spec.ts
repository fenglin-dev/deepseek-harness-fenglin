/** Host-resolved file identities across pending stats, retries, reloads, and disposal. */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { absoluteFileAddress, sessionFileAddress } from '@deepseek-ai/dsh-util-workspace-path'
import { describe, expect, it, onTestFinished } from 'vitest'
import { ChangeFeed } from '../src/client/change-feed.ts'
import { createFileResourceProvider, type SessionLookup } from '../src/client/provider.ts'
import { FakeRemote, settle } from './fake-remote.client.ts'

const SESSION = 'host-only' as SessionId
const RELATIVE = 'linked/a b.txt'
const ADDRESS = sessionFileAddress(SESSION, RELATIVE)
const CANONICAL = '/host/canonical/a b.txt'

function harness(sessions: SessionLookup = { current: () => SESSION }) {
  const remote = new FakeRemote()
  const changes = new ChangeFeed(remote)
  const provider = createFileResourceProvider(remote, changes, sessions)
  const open = (address = ADDRESS) => {
    const controller = new AbortController()
    const iterator = provider.open(address, { signal: controller.signal })[Symbol.asyncIterator]()
    onTestFinished(async () => {
      controller.abort()
      for (const request of remote.stats) {
        request.resolve({ ok: false, error: new RemoteError('gateway/internal', 'test ended', {}) })
      }
      await iterator.return?.()
      await changes.settle()
    })
    return { iterator, controller, reload: () => { provider.reload!(address) } }
  }
  return { remote, changes, open }
}

describe('Host-resolved file paths', () => {
  it('accepts Host ready before submitting the unmodified relative path without a Client Session summary', async () => {
    const { remote, open } = harness({ current: () => { throw new Error('session addresses do not read current') } })
    const { iterator } = open()
    const first = iterator.next()
    const request = await remote.waitForStat(0)
    expect(remote.calls).toEqual(['changes', 'accept', 'stat'])
    expect(request).toMatchObject({ sessionId: SESSION, path: RELATIVE })
    request.resolve({ ok: true, value: { absolutePath: CANONICAL, version: 'v0', bytes: 3 } })
    await expect(first).resolves.toEqual({ done: false, value: { ok: true, value: { absolutePath: CANONICAL, version: 'v0', bytes: 3, changed: false } } })
  })

  it('does not stat an opened changes stream until the Host acknowledges its subscription', async () => {
    const { remote, open } = harness()
    remote.autoReady = false
    const { iterator } = open()
    const first = iterator.next()
    const { source } = await remote.waitForChanges(0)
    await settle()
    expect(remote.calls).toEqual(['changes'])
    expect(remote.stats).toEqual([])

    await source.deliver({ kind: 'ready' })
    const request = await remote.waitForStat(0)
    expect(remote.calls).toEqual(['changes', 'accept', 'stat'])
    request.resolve({ ok: true, value: { absolutePath: CANONICAL, version: 'v0' } })
    await expect(first).resolves.toEqual({ done: false, value: { ok: true, value: { absolutePath: CANONICAL, version: 'v0', changed: false } } })
  })

  it.each(['abort', 'end', 'failure'] as const)('settles %s before Host ready without sending a stat or leaving a stream', async (ending) => {
    const { remote, changes, open } = harness()
    remote.autoReady = false
    const { iterator, controller } = open()
    const first = iterator.next()
    const { source } = await remote.waitForChanges(0)
    switch (ending) {
      case 'abort': controller.abort(); break
      case 'end': source.end(); break
      case 'failure': source.fail(new Error('workspace root unavailable')); break
      default: throw new Error(`Unexpected stream ending: ${ending satisfies never}`)
    }
    await expect(first).resolves.toEqual({ done: true, value: undefined })
    await changes.settle()
    expect(remote.calls).toEqual(['changes'])
    expect(remote.stats).toEqual([])
    expect(remote.disposed).toEqual([`workspace file changes of ${SESSION}`])
    expect(source.aborted).toBe(true)
  })

  it('accepts another generation ready without resetting metadata or re-statting existing files', async () => {
    const { remote, open } = harness()
    const { iterator } = open()
    const first = iterator.next()
    const request = await remote.waitForStat(0)
    request.resolve({ ok: true, value: { absolutePath: CANONICAL, version: 'v0', bytes: 3 } })
    await first
    const next = iterator.next()
    const source = remote.opened[0]!.source
    await source.deliver({ kind: 'ready' })
    await source.deliver({ kind: 'change', change: { absolutePath: CANONICAL, version: 'v1' } })
    expect(remote.stats).toHaveLength(1)
    expect(remote.calls).toEqual(['changes', 'accept', 'stat', 'accept'])
    await expect(next).resolves.toEqual({ done: false, value: { ok: true, value: { absolutePath: CANONICAL, version: 'v1', bytes: 3, changed: true } } })
  })

  it.each([
    ['session', ADDRESS, RELATIVE],
    ['absolute', absoluteFileAddress('/shortcut/a.txt'), '/shortcut/a.txt'],
  ])('filters queued and live %s changes using the Host canonical path, not the input path', async (_, address, path) => {
    const { remote, open } = harness()
    const { iterator } = open(address)
    const first = iterator.next()
    const request = await remote.waitForStat(0)
    expect(request).toMatchObject({ sessionId: SESSION, path })
    const source = remote.opened[0]!.source
    // Delivery is acknowledged while stat is still unresolved, before a key can be bound.
    await source.deliver({ kind: 'change', change: { absolutePath: '/other/file.txt', version: 'other-before-stat' } })
    await source.deliver({ kind: 'change', change: { absolutePath: CANONICAL, version: 'v1' } })
    request.resolve({ ok: true, value: { absolutePath: CANONICAL, version: 'v0', bytes: 3 } })
    await expect(first).resolves.toMatchObject({ value: { ok: true, value: { version: 'v0', changed: false } } })
    await expect(iterator.next()).resolves.toEqual({ done: false, value: { ok: true, value: { absolutePath: CANONICAL, version: 'v1', bytes: 3, changed: true } } })

    await source.deliver({ kind: 'change', change: { absolutePath: '/other/file.txt', version: 'other-after-stat' } })
    await source.deliver({ kind: 'change', change: { absolutePath: CANONICAL, version: 'v2' } })
    await expect(iterator.next()).resolves.toMatchObject({ value: { ok: true, value: { version: 'v2', changed: true } } })
    expect(remote.stats).toHaveLength(1)
  })

  it.each(['reload', 'write'] as const)('recovers an initial failed stat through %s and filters the retry backlog after binding', async (trigger) => {
    const { remote, open } = harness()
    const { iterator, reload } = open()
    const first = iterator.next()
    const request = await remote.waitForStat(0)
    const error = new RemoteError('workspace-file/not-found', 'missing', { path: RELATIVE })
    request.resolve({ ok: false, error })
    await expect(first).resolves.toEqual({ done: false, value: { ok: false, error } })
    const source = remote.opened[0]!.source
    const retried = iterator.next()
    if (trigger === 'reload') reload()
    else await source.deliver({ kind: 'change', change: { absolutePath: '/unknown-key-trigger.txt', version: 'trigger' } })
    const retry = await remote.waitForStat(1)
    expect(retry).toMatchObject({ sessionId: SESSION, path: RELATIVE })
    await source.deliver({ kind: 'change', change: { absolutePath: '/other/file.txt', version: 'other' } })
    await source.deliver({ kind: 'change', change: { absolutePath: CANONICAL, version: 'v3' } })
    retry.resolve({ ok: true, value: { absolutePath: CANONICAL, version: 'v2', bytes: 5 } })
    await expect(retried).resolves.toEqual({
      done: false, value: { ok: true, value: { absolutePath: CANONICAL, version: 'v2', bytes: 5, changed: trigger === 'write' } },
    })
    await expect(iterator.next()).resolves.toMatchObject({ value: { ok: true, value: { version: 'v3', changed: true } } })
    expect(remote.stats).toHaveLength(2)
  })

  it('reloads session and absolute addresses bound to the same Host key without re-statting other files', async () => {
    const { remote, open } = harness()
    const session = open()
    const absolute = open(absoluteFileAddress('/shortcut/a.txt'))
    const other = open(sessionFileAddress(SESSION, 'other.txt'))
    const firsts = Promise.all([session.iterator.next(), absolute.iterator.next(), other.iterator.next()])
    await remote.waitForStat(2)
    for (const request of remote.stats) {
      request.resolve({ ok: true, value: {
        absolutePath: request.path === 'other.txt' ? '/host/other.txt' : CANONICAL,
        version: 'v0', bytes: 3,
      } })
    }
    await firsts
    const reloaded = Promise.all([session.iterator.next(), absolute.iterator.next()])
    const otherChange = other.iterator.next()
    session.reload()
    await remote.waitForStat(4)
    expect(remote.stats.slice(3).map(request => request.path)).toEqual([RELATIVE, '/shortcut/a.txt'])
    for (const request of remote.stats.slice(3)) {
      request.resolve({ ok: true, value: { absolutePath: CANONICAL, version: 'v1', bytes: 4 } })
    }
    const value = { done: false, value: { ok: true, value: { absolutePath: CANONICAL, version: 'v1', bytes: 4, changed: false } } }
    await expect(reloaded).resolves.toEqual([value, value])
    await remote.opened[0]!.source.deliver({ kind: 'change', change: { absolutePath: '/host/other.txt', version: 'other-v1' } })
    await expect(otherChange).resolves.toMatchObject({ value: { ok: true, value: { version: 'other-v1', changed: true } } })
    expect(remote.stats).toHaveLength(5)
    expect(remote.opened).toHaveLength(1)
  })

  it('binds a changed canonical path on reload before filtering writes received during that stat', async () => {
    const { remote, open } = harness()
    const { iterator, reload } = open()
    const first = iterator.next()
    const request = await remote.waitForStat(0)
    request.resolve({ ok: true, value: { absolutePath: '/host/old-target.txt', version: 'v0' } })
    await first
    reload()
    const reloaded = iterator.next()
    const retry = await remote.waitForStat(1)
    const source = remote.opened[0]!.source
    await source.deliver({ kind: 'change', change: { absolutePath: '/host/old-target.txt', version: 'old-target-write' } })
    await source.deliver({ kind: 'change', change: { absolutePath: CANONICAL, version: 'v2' } })
    retry.resolve({ ok: true, value: { absolutePath: CANONICAL, version: 'v1' } })
    await expect(reloaded).resolves.toMatchObject({ value: { ok: true, value: { version: 'v1', changed: false } } })
    await expect(iterator.next()).resolves.toMatchObject({ value: { ok: true, value: { version: 'v2', changed: true } } })
    expect(remote.stats).toHaveLength(2)
  })

  it('drops a late stat after abort and waits for the session stream disposal', async () => {
    const { remote, changes, open } = harness()
    const { iterator, controller } = open()
    const first = iterator.next()
    const request = await remote.waitForStat(0)
    await remote.opened[0]!.source.deliver({ kind: 'change', change: { absolutePath: CANONICAL, version: 'v1' } })
    const gate = Promise.withResolvers<undefined>()
    remote.disposeGate = gate.promise
    try {
      controller.abort()
      request.resolve({ ok: true, value: { absolutePath: CANONICAL, version: 'v0' } })
      await expect(first).resolves.toEqual({ done: true, value: undefined })
      expect(remote.opened[0]!.source.aborted).toBe(true)
      let settled = false
      const closing = changes.settle().then(() => { settled = true })
      await settle()
      expect(settled).toBe(false)
      gate.resolve(undefined)
      await closing
      expect(settled).toBe(true)
      expect(remote.disposed).toEqual([`workspace file changes of ${SESSION}`])
    } finally {
      gate.resolve(undefined)
    }
  })

  it('aborts while waiting for a predecessor to close without sending a stat', async () => {
    const { remote, changes, open } = harness()
    const previous = open()
    const first = previous.iterator.next()
    const request = await remote.waitForStat(0)
    request.resolve({ ok: true, value: { absolutePath: CANONICAL, version: 'v0' } })
    await first
    const gate = Promise.withResolvers<undefined>()
    remote.disposeGate = gate.promise
    try {
      previous.controller.abort()
      const next = open()
      const pending = next.iterator.next()
      next.controller.abort()
      await expect(pending).resolves.toEqual({ done: true, value: undefined })
      expect(remote.stats).toHaveLength(1)
      gate.resolve(undefined)
      await changes.settle()
      expect(remote.disposed).toHaveLength(2)
    } finally {
      gate.resolve(undefined)
    }
  })

  it.each([true, false])('releases an unconsumed notification follower after the first stat (success: %s)', async (ok) => {
    const { remote, changes, open } = harness()
    const { iterator } = open()
    const first = iterator.next()
    const request = await remote.waitForStat(0)
    request.resolve(ok
      ? { ok: true, value: { absolutePath: CANONICAL, version: 'v0' } }
      : { ok: false, error: new RemoteError('workspace-file/not-found', 'missing', { path: RELATIVE }) })
    await first
    await iterator.return?.()
    await changes.settle()
    expect(remote.opened[0]!.source.aborted).toBe(true)
    expect(remote.disposed).toEqual([`workspace file changes of ${SESSION}`])
  })
})
