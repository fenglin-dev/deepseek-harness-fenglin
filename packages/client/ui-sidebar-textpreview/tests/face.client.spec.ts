/**
 * The face's contract with the store: a read in flight is visible, its outcome
 * lands as a page or a failure, a read outlived by its tab writes nothing, a
 * reload starts over from the first line and retires the reads still out, and
 * a newer file version arriving past the first line restarts the walk. The read
 * runs under the session the file names, not the one the face was injected for.
 */
import { describe, expect, it, vi } from 'vitest'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceFileText } from '@deepseek-ai/dsh-api-workspace-files/types'
import { textFace } from '../src/client/face.ts'
import type { ReadWorkspaceFilePage } from '../src/client/rpc.ts'
import { createTextStore } from '../src/client/store.ts'
import { FILE, PATH, SESSION, failure, page } from './fixtures.client.ts'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'

const TAB_1 = 'tab-1' as TabId

/** One read awaiting the spec's answer. */
interface PendingRead {
  readonly offset: number
  resolve(result: RemoteResult<WorkspaceFileText>): void
}

function bench() {
  const instance = createTextStore().create()
  const pending: PendingRead[] = []
  const read = vi.fn<ReadWorkspaceFilePage>((_session, _path, offset) =>
    new Promise((resolve) => { pending.push({ offset, resolve }) }))
  // The store's own `forget`, counted: the record's end must forget a tab exactly once.
  const forget = vi.fn(instance.actions.forget)
  // Injected for another session on purpose: the address's session must win.
  const face = textFace(read)('other-session' as SessionId, { ...instance.actions, forget })
  /** Settle the oldest outstanding read, or the oldest one for `offset`. */
  const settle = (result: RemoteResult<WorkspaceFileText>, offset?: number): void => {
    const at = offset === undefined ? 0 : pending.findIndex(call => call.offset === offset)
    const [call] = pending.splice(at, 1)
    if (call === undefined) throw new Error('no outstanding read to settle')
    call.resolve(result)
  }
  return {
    instance, read, face, forget, settle,
    outstanding: () => pending.map(call => call.offset),
    tab: () => instance.getSnapshot().byTab[TAB_1],
  }
}

const flush = (): Promise<void> => new Promise((resolve) => { setTimeout(resolve, 0) })

describe('textFace', () => {
  it('marks the read in flight, then keeps the page', async () => {
    const { read, face, settle, tab } = bench()
    const controller = new AbortController()
    face.loadPage(TAB_1, FILE, 1, controller.signal)
    expect(read).toHaveBeenCalledWith(SESSION, PATH, 1, controller.signal)
    expect(tab()?.loading).toBe(true)
    settle(page(1, ['a', 'b'], false))
    await flush()
    expect(tab()).toMatchObject({ loading: false, pages: { 1: { text: 'a\nb', lines: 2 } }, eof: false })
  })

  it('records a failed read', async () => {
    const { face, settle, tab } = bench()
    face.loadPage(TAB_1, FILE, 1, new AbortController().signal)
    settle(failure('workspace-file/outside-workspace', { path: PATH }))
    await flush()
    expect(tab()?.failure?.code).toBe('workspace-file/outside-workspace')
    expect(tab()?.loading).toBe(false)
  })

  it('forgets the tab when its record ends, once, however many reads armed it, and writes nothing afterwards', async () => {
    const { read, face, forget, settle, tab } = bench()
    const controller = new AbortController()
    const armed = vi.spyOn(controller.signal, 'addEventListener')
    face.loadPage(TAB_1, FILE, 1, controller.signal)
    settle(page(1, ['a'], false))
    await flush()
    face.loadPage(TAB_1, FILE, 2, controller.signal)
    face.reloadPages(TAB_1, FILE, controller.signal)
    expect(armed.mock.calls.filter(([type]) => type === 'abort')).toHaveLength(1)
    expect(tab()).toBeDefined()
    controller.abort()
    expect(forget).toHaveBeenCalledExactlyOnceWith(TAB_1)
    expect(tab()).toBeUndefined()
    // The reads still out settle into nothing, and no request is made for the ended record.
    settle(page(1, ['A'], true))
    await flush()
    expect(tab()).toBeUndefined()
    face.loadPage(TAB_1, FILE, 1, controller.signal)
    face.reloadPages(TAB_1, FILE, controller.signal)
    expect(read).toHaveBeenCalledTimes(3)
    expect(tab()).toBeUndefined()
  })

  it('reloads from the first line, dropping the pages and keeping the view', async () => {
    const { instance, read, face, settle, tab } = bench()
    const controller = new AbortController()
    face.loadPage(TAB_1, FILE, 1, controller.signal)
    settle(page(1, ['a'], false))
    await flush()
    instance.actions.scrolled(TAB_1, 77)
    face.reloadPages(TAB_1, FILE, controller.signal)
    expect(tab()).toMatchObject({ pages: {}, eof: false, version: undefined, loading: true, scrollTop: 77 })
    expect(read).toHaveBeenLastCalledWith(SESSION, PATH, 1, controller.signal)
  })

  it('drops a page that settles after a reload retired it, whichever lands first', async () => {
    const { face, settle, outstanding, tab } = bench()
    const signal = new AbortController().signal
    face.loadPage(TAB_1, FILE, 1, signal)
    settle(page(1, ['a', 'b', 'c'], false))
    await flush()
    // Load-more is out when the reader reloads: the new first page lands first.
    face.loadPage(TAB_1, FILE, 4, signal)
    face.reloadPages(TAB_1, FILE, signal)
    expect(outstanding()).toEqual([4, 1])
    settle(page(1, ['A'], false, 'v2'), 1)
    await flush()
    expect(tab()).toMatchObject({ pages: { 1: { text: 'A', lines: 1 } }, version: 'v2', eof: false, loading: false })
    // The retired page lands afterwards and changes nothing, not even the end flag.
    settle(page(4, ['d'], true), 4)
    await flush()
    expect(tab()).toMatchObject({ pages: { 1: { text: 'A', lines: 1 } }, version: 'v2', eof: false, loading: false })
  })

  it('starts the walk over when a page of a newer version arrives past the first line', async () => {
    const { read, face, settle, outstanding, tab } = bench()
    const signal = new AbortController().signal
    face.loadPage(TAB_1, FILE, 1, signal)
    settle(page(1, ['a', 'b', 'c'], false))
    await flush()
    face.loadPage(TAB_1, FILE, 4, signal)
    // The file changed between the two reads: the page is not kept beside the older ones.
    settle(page(4, ['D'], true, 'v2'))
    await flush()
    expect(tab()).toMatchObject({ pages: {}, version: undefined, eof: false, loading: true })
    expect(read).toHaveBeenCalledTimes(3)
    expect(outstanding()).toEqual([1])
    settle(page(1, ['A', 'B'], true, 'v2'))
    await flush()
    expect(tab()).toMatchObject({ pages: { 1: { text: 'A\nB', lines: 2 } }, version: 'v2', eof: true, loading: false })
  })

  it('keeps a first page of a newer version, since the store drops the older pages for it', async () => {
    const { face, settle, tab } = bench()
    const signal = new AbortController().signal
    face.loadPage(TAB_1, FILE, 1, signal)
    settle(page(1, ['a'], false))
    await flush()
    // A retry of the first page after the file changed lands as the new version.
    face.loadPage(TAB_1, FILE, 1, signal)
    settle(page(1, ['A'], true, 'v2'))
    await flush()
    expect(tab()).toMatchObject({ pages: { 1: { text: 'A', lines: 1 } }, version: 'v2', eof: true })
  })
})
