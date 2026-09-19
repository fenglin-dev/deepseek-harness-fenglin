// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import {
  createClientModuleSystem, parseBootManifest,
  type ClientBundleRegistration, type ClientModuleLoader, type ClientModuleLoaderTarget, type WebBootEntry, type WebBootGraph,
} from '@deepseek-ai/dsh-client-modules/client'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { assertEntriesActive, bootClient, type EntryStateLabel } from '../src/boot-client.ts'
import { FIBER_STATE } from '../src/loader-status.ts'

const BOOTSTRAP_ID = '@deepseek-ai/dsh-client-modules'

function graphOf(ids: readonly string[]): WebBootGraph {
  const entries: WebBootEntry[] = ids.map(id => ({ id, url: `/${id}.js`, rev: '1' }))
  return {
    rev: 'graph',
    entries,
    batches: [{ phase: 'application', url: '/application.js', rev: 'batch', entries: [...ids] }],
  }
}

/** Module system seeded with inline plugin modules; `loaded` records every transport call. */
function modulesOf(graph: WebBootGraph, staticModules: Record<string, unknown>): { modules: ClientModuleLoader; loaded: string[] } {
  const loaded: string[] = []
  const pendingQueue: ClientBundleRegistration[] = []
  const target: ClientModuleLoaderTarget = {
    mode: 'queue',
    pendingQueue,
    load: (registration) => { pendingQueue.push(registration) },
    create: options => createClientModuleSystem(target, { id: BOOTSTRAP_ID, exports: {} }, options),
  }
  const modules = target.create({
    boot: graph,
    staticModules,
    loadBundle: async (url) => { loaded.push(url) },
  })
  return { modules, loaded }
}

/** Recording progress sink. */
function stateSink(): { states: Map<string, EntryStateLabel[]>; onEntryState: (name: string, state: EntryStateLabel) => void } {
  const states = new Map<string, EntryStateLabel[]>()
  return {
    states,
    onEntryState: (name, state) => { states.set(name, [...(states.get(name) ?? []), state]) },
  }
}

describe('bootClient', () => {
  it('activates every seeded row without touching the bundle transport', async () => {
    const graph = graphOf(['provider', 'consumer'])
    const { modules, loaded } = modulesOf(graph, {
      provider: { apply: (ctx: Context) => { ctx.reflect.provide('x', { marker: 'x' }) } },
      consumer: { inject: ['x'], apply: () => {} },
    })
    const ctx = new Context()
    const sink = stateSink()

    await bootClient({ ctx, modules, manifest: modules.manifest, onEntryState: sink.onEntryState })

    expect(loaded).toEqual([])
    const consumer = sink.states.get('consumer') ?? []
    expect(consumer[0]).toBe('loading')
    expect(consumer.at(-1)).toBe('active')
    expect(sink.states.get('provider')?.at(-1)).toBe('active')
    await ctx.fiber.dispose()
  })

  it('reports a row waiting on a service the roster never provides', async () => {
    const graph = graphOf(['@deepseek-ai/orphan'])
    const { modules } = modulesOf(graph, { '@deepseek-ai/orphan': { inject: ['nothing'], apply: () => {} } })
    const ctx = new Context()

    await expect(bootClient({ ctx, modules, manifest: modules.manifest })).rejects.toThrow(
      '@deepseek-ai/orphan: pending (waiting for service: nothing)',
    )
    await ctx.fiber.dispose()
  })

  it('keeps the application bootable when an optional external plugin fails', async () => {
    const graph = graphOf(['@deepseek-ai/dsh-client-ui-renderer', '@fixture/broken'])
    const { modules } = modulesOf(graph, {
      '@deepseek-ai/dsh-client-ui-renderer': { apply: () => {} },
      '@fixture/broken': { apply: () => { throw new Error('fixture failed') } },
    })
    const ctx = new Context()
    const warn = vi.spyOn(ctx.logger, 'warn').mockImplementation(() => {})
    onTestFinished(() => { warn.mockRestore() })
    onTestFinished(() => ctx.fiber.dispose())

    await expect(bootClient({ ctx, modules, manifest: modules.manifest })).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('@fixture/broken: failed'))
  })

  it('reports and logs an import failure for a row that is neither seeded nor a graph row', async () => {
    const { modules } = modulesOf(graphOf(['seeded']), { seeded: { apply: () => {} } })
    const manifest = parseBootManifest(graphOf(['@deepseek-ai/ghost']))
    const ctx = new Context()
    onTestFinished(() => ctx.fiber.dispose())
    const error = vi.spyOn(ctx.logger, 'error').mockImplementation(() => {})
    onTestFinished(() => { error.mockRestore() })
    const sink = stateSink()

    await expect(bootClient({ ctx, modules, manifest, onEntryState: sink.onEntryState })).rejects.toThrow(
      'web boot: 1 entry did not activate\n@deepseek-ai/ghost: import failed (see console for the import error)',
    )
    expect(sink.states.get('@deepseek-ai/ghost')).toEqual(['loading', 'failed'])
    expect(error).toHaveBeenCalledOnce()
    expect(error.mock.calls[0]?.[0]).toHaveProperty('message', expect.stringContaining('client-modules: cannot resolve'))
  })
})

describe('assertEntriesActive', () => {
  interface FakeEntry { name: string; fiber?: { state: number; inject: Record<string, null> } }

  /** Loader-shaped double: entries with scripted fiber states, services by name. */
  function auditCtx(entries: readonly FakeEntry[], services: Record<string, unknown> = {}): Context {
    return {
      loader: {
        * entries() {
          for (const entry of entries) yield { options: { name: entry.name }, fiber: entry.fiber }
        },
      },
      get: (name: string) => services[name],
    } as unknown as Context
  }

  it('passes when every entry is active', () => {
    expect(() => { assertEntriesActive(auditCtx([{ name: 'a', fiber: { state: FIBER_STATE.ACTIVE, inject: {} } }])) }).not.toThrow()
  })

  it('names import failures, missing services, and other non-active states', () => {
    const ctx = auditCtx([
      { name: '@deepseek-ai/lost' },
      { name: '@deepseek-ai/waiting', fiber: { state: FIBER_STATE.PENDING, inject: { present: null, a: null, b: null } } },
      { name: '@deepseek-ai/opaque', fiber: { state: FIBER_STATE.PENDING, inject: {} } },
      { name: '@deepseek-ai/broken', fiber: { state: FIBER_STATE.FAILED, inject: {} } },
    ], { present: {} })

    expect(() => { assertEntriesActive(ctx) }).toThrow([
      'web boot: 4 entries did not activate',
      '@deepseek-ai/lost: import failed (see console for the import error)',
      '@deepseek-ai/waiting: pending (waiting for services: a, b)',
      '@deepseek-ai/opaque: pending (waiting for services: unknown)',
      '@deepseek-ai/broken: failed',
    ].join('\n'))
  })

  it('uses the singular form for one failing entry', () => {
    expect(() => { assertEntriesActive(auditCtx([{ name: '@deepseek-ai/lost' }])) }).toThrow('web boot: 1 entry did not activate\n')
  })

  it('reports optional external failures without rejecting required client entries', () => {
    const warn = vi.fn()
    const ctx = auditCtx([
      { name: '@deepseek-ai/dsh-client-ui-renderer', fiber: { state: FIBER_STATE.ACTIVE, inject: {} } },
      { name: '@fixture/broken', fiber: { state: FIBER_STATE.FAILED, inject: {} } },
    ])
    Object.assign(ctx, { logger: { warn } })

    expect(() => { assertEntriesActive(ctx) }).not.toThrow()
    expect(warn).toHaveBeenCalledWith('web boot: optional client plugin did not activate\n@fixture/broken: failed')
  })
})
