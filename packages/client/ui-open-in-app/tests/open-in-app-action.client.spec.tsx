// @vitest-environment jsdom
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ConversationHeaderMenuContribution } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { OpenInAppAction, type OpenInAppActionProps } from '../src/client/OpenInAppAction.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const SESSION = 'session' as SessionId
const t: OpenInAppActionProps['t'] = makeTranslate(zh)

interface Bench {
  props: OpenInAppActionProps
  launch: ReturnType<typeof vi.fn>
  choose: ReturnType<typeof vi.fn>
  contribution: () => ConversationHeaderMenuContribution | undefined
}

function bench(over: {
  apps?: readonly string[] | null
  choice?: string
  cwd?: string
  launch?: (appId: string, path: string) => Promise<void>
} = {}): Bench {
  const state = {
    ids: [SESSION],
    byId: over.cwd === undefined ? {} : { [SESSION]: { cwd: over.cwd } },
    current: SESSION,
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  } as unknown as SessionListState
  const apps = createSnapshotStore<readonly string[] | null>(over.apps ?? null)
  const choice = createSnapshotStore<string>(over.choice ?? '')
  const launch = vi.fn(over.launch ?? (async () => {}))
  const choose = vi.fn()
  let contribution: ConversationHeaderMenuContribution | undefined
  function useSessions<T>(select: (snapshot: SessionListState) => T): T {
    return select(state)
  }
  function useSelector<T, R>(source: { getSnapshot(): T }): (select: (value: T) => R) => R {
    return select => select(source.getSnapshot())
  }
  const props = {
    sessionId: SESSION,
    useSessions,
    useOpenInAppApps: useSelector(apps),
    useOpenInAppChoice: useSelector(choice),
    launch,
    choose,
    iconUrl: (appId: string) => `/open-in-app/icon/${appId}`,
    registerMenuItem: (next: ConversationHeaderMenuContribution) => {
      contribution = next
      return () => {
        if (contribution === next) contribution = undefined
      }
    },
    t,
  } as unknown as OpenInAppActionProps
  return { props, launch, choose, contribution: () => contribution }
}

async function mount(over: Parameters<typeof bench>[0]): Promise<Bench> {
  const b = bench(over)
  render(<OpenInAppAction {...b.props} />)
  await waitFor(() => { expect(b.contribution()).toBeDefined() })
  return b
}

describe('OpenInAppAction visibility', () => {
  it('contributes nothing before availability, without a cwd, or for unknown apps', async () => {
    for (const over of [
      { apps: null, cwd: '/w' },
      { apps: [], cwd: '/w' },
      { apps: ['finder'] },
      { apps: ['finder'], cwd: '' },
      { apps: ['someday-an-app'], cwd: '/w' },
    ] as const) {
      const b = bench(over)
      render(<OpenInAppAction {...b.props} />)
      await act(async () => {})
      expect(b.contribution()).toBeUndefined()
      cleanup()
    }
  })

  it('uses the remembered app icon and lists every available app in a submenu', async () => {
    const b = await mount({ apps: ['finder', 'cursor'], choice: 'cursor', cwd: '/w' })
    const contribution = b.contribution()!
    expect(contribution.item.label).toBe(zh['menu.aria'])
    expect(contribution.item.submenu?.map(item => item.label)).toEqual([zh['app.finder'], 'Cursor'])
    expect((contribution.item.icon as ReactElement<{ url: string }>).props.url).toBe('/open-in-app/icon/cursor')
  })
})

describe('OpenInAppAction launching', () => {
  it('launches and persists an app selected from the official menu submenu', async () => {
    const b = await mount({ apps: ['finder', 'cursor'], cwd: '/w/dir' })
    act(() => { b.contribution()!.onSelect('open-in-app:cursor') })
    expect(b.choose).toHaveBeenCalledWith('cursor')
    expect(b.launch).toHaveBeenCalledWith('cursor', '/w/dir')
  })

  it('ignores duplicate and forged selections while a launch is in flight', async () => {
    let resolve: () => void = () => {}
    const b = await mount({
      apps: ['finder', 'cursor'],
      cwd: '/w/dir',
      launch: () => new Promise((done) => { resolve = done }),
    })
    act(() => {
      b.contribution()!.onSelect('open-in-app:finder')
      b.contribution()!.onSelect('open-in-app:cursor')
      b.contribution()!.onSelect('open-in-app:not-installed')
    })
    expect(b.launch).toHaveBeenCalledTimes(1)
    expect(b.choose).toHaveBeenCalledTimes(1)
    resolve()
    await act(async () => {})
  })

  it('disables the row for a slow launch and exposes a temporary failure label', async () => {
    let reject: (error: Error) => void = () => {}
    const b = await mount({
      apps: ['finder'],
      cwd: '/w/dir',
      launch: () => new Promise((_, fail) => { reject = fail }),
    })
    vi.useFakeTimers()
    act(() => { b.contribution()!.onSelect('open-in-app:finder') })
    act(() => { vi.advanceTimersByTime(300) })
    expect(b.contribution()?.item.disabled).toBe(true)
    act(() => { reject(new Error('launch failed')) })
    await act(async () => {})
    expect(b.contribution()?.item.label).toBe(zh['open.error'])
    act(() => { vi.advanceTimersByTime(2_100) })
    expect(b.contribution()?.item.label).toBe(zh['menu.aria'])
  })

  it('keeps real app icons and falls back to the generic glyph after an image error', async () => {
    const b = await mount({ apps: ['terminal'], cwd: '/w/dir' })
    const icon = b.contribution()!.item.submenu?.[0]?.icon
    const view = render(<>{icon}</>)
    const image = view.container.querySelector('img')
    expect(image?.getAttribute('src')).toBe('/open-in-app/icon/terminal')
    if (image !== null) fireEvent.error(image)
    await waitFor(() => {
      expect(view.container.querySelector('img')).toBeNull()
      expect(view.container.querySelector('svg rect')).not.toBeNull()
    })
  })
})
