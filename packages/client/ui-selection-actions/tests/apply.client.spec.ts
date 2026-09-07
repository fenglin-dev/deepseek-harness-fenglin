import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { apply, inject } from '../src/client/index.ts'
import { SelectionActions, type SelectionActionsInjected } from '../src/client/SelectionActions.tsx'

function observable<T>(initial: T) {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => value,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    set: (next: T) => { value = next; for (const listener of listeners) listener() },
  }
}

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('en')
  ctx.provide('locale', locale)
  const list = observable({
    current: 'session-1',
    byId: { 'session-1': {} },
  })
  const pendingInteractions = observable(new Map())
  const session = observable({
    removed: false,
    openState: 'open',
    pendingSubmissions: [],
    subagent: null,
  })
  const input = observable({ draft: 'existing', phase: 'plain' })
  const block = observable(undefined)
  const actx = {} as Context
  const setDraft = vi.fn((text: string) => { input.set({ ...input.getSnapshot(), draft: text }) })
  const open = vi.fn()
  const connectWorkspace = vi.fn(async () => 'session-1')
  ctx.provide('sessions', {
    list,
    scope: () => actx,
    sessionOf: () => session,
    open,
  } as never)
  ctx.provide('uiSession', { pendingInteractions } as never)
  ctx.provide('uiWorkspace', { connectWorkspace } as never)
  ctx.provide('conversation', {
    input: { for: () => ({ state: input, setDraft }) },
    blocks: { storeFor: () => block },
  } as never)
  const slots = ctx.get('slots') as SlotRegistry
  slots.register({
    name: 'root',
    children: { 'shell.overlay': { kind: 'list', scope: 'root' } },
  } as never, () => null)
  await ctx.plugin({ inject: [...inject], apply }).await()
  const entry = slots.entries('shell.overlay')[0]!
  const injected = (entry.inject as unknown as () => SelectionActionsInjected)()
  return { ctx, slots, entry, injected, list, pendingInteractions, input, setDraft, open, connectWorkspace }
}

describe('ui-selection-actions apply', () => {
  it('declares and registers the root overlay contribution', async () => {
    expect(inject).toEqual(['slots', 'sessions', 'uiSession', 'uiWorkspace', 'conversation', 'locale'])
    const b = await bench()
    expect(b.entry.component).toBe(SelectionActions)
    expect(b.entry.options).toMatchObject({ id: 'selection-actions', order: 10 })
    expect(b.entry.locale).toBe('selectionActions')
    await b.ctx.fiber.dispose()
  })

  it('fills a new-conversation draft without sending and appends to the current draft', async () => {
    const b = await bench()
    await b.injected.askInNewConversation('workspace-1' as never, 'question draft')
    expect(b.connectWorkspace).toHaveBeenCalledWith('workspace-1')
    expect(b.setDraft).toHaveBeenCalledWith('question draft')
    expect(b.open).toHaveBeenCalledWith('session-1')

    b.injected.appendToCurrent('session-1' as never, 'line one\nline two')
    expect(b.input.getSnapshot().draft).toBe('question draft\n\n> line one\n> line two')
    await b.ctx.fiber.dispose()
  })

  it('removes append availability and rejects stale writes while an interaction is pending', async () => {
    const b = await bench()
    const notified = vi.fn()
    const stop = b.injected.hooks.appendAvailable.subscribe(notified)
    expect(b.injected.hooks.appendAvailable.getSnapshot()).toBe(true)
    b.pendingInteractions.set(new Map([['session-1', { kind: 'approval' }]]) as never)
    expect(b.injected.hooks.appendAvailable.getSnapshot()).toBe(false)
    expect(notified).toHaveBeenCalled()
    expect(() => { b.injected.appendToCurrent('session-1' as never, 'blocked') }).toThrow('not editable')
    stop()
    await b.ctx.fiber.dispose()
  })

  it('projects only the trusted desktop restart bridge', async () => {
    const root = globalThis as typeof globalThis & { deepSeekHarnessDesktop?: unknown }
    const previous = root.deepSeekHarnessDesktop
    const restart = vi.fn(async () => ({ restarting: true }))
    root.deepSeekHarnessDesktop = { shell: { restart } }
    try {
      const b = await bench()
      await expect(b.injected.restartDesktop?.()).resolves.toBeUndefined()
      expect(restart).toHaveBeenCalledOnce()
      await b.ctx.fiber.dispose()
    } finally {
      if (previous === undefined) delete root.deepSeekHarnessDesktop
      else root.deepSeekHarnessDesktop = previous
    }
  })

  it('does not project obsolete or incomplete desktop bridge shapes', async () => {
    const root = globalThis as typeof globalThis & { deepSeekHarnessDesktop?: unknown }
    const previous = root.deepSeekHarnessDesktop
    try {
      for (const desktop of [{ restart: vi.fn() }, { shell: {} }, { shell: null }]) {
        root.deepSeekHarnessDesktop = desktop
        const b = await bench()
        expect(b.injected.restartDesktop).toBeUndefined()
        await b.ctx.fiber.dispose()
      }
    } finally {
      if (previous === undefined) delete root.deepSeekHarnessDesktop
      else root.deepSeekHarnessDesktop = previous
    }
  })
})
