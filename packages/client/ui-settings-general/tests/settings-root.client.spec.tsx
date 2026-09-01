// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEffect, useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { SettingsRootComponentProps } from '../src/client/shell-contract.ts'
import type { SettingsNavigationRequest } from '@deepseek-ai/dsh-client-ui-settings/client'
import { SettingsRoot } from '../src/client/SettingsRoot.tsx'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

type Row = { id: string; order: number; label: string }
type Step = { id: string; order: number }

/** Slot-content stand-ins: the shell renders whatever the seats contribute. */
const SEAT_CONTENT: Record<string, string> = {
  'settings.trigger': 'Settings',
  'settings.header': 'Settings Title',
  'settings.action': 'Open configuration file',
  'settings.close': 'Close',
}

type AttentionSnapshot = Parameters<Parameters<SettingsRootComponentProps['useSessionPendingInteraction']>[0]>[0]
const noAttention: AttentionSnapshot = new Map()
const useSessionPendingInteraction: SettingsRootComponentProps['useSessionPendingInteraction'] = selector => selector(noAttention)

function mount({
  wide = true,
  onboardingActive = true,
  rows = [
    { id: 'general', order: 0, label: 'General' },
    { id: 'models', order: 10, label: 'Models' },
    { id: 'agent-presets', order: 20, label: 'Agent presets' },
  ],
  steps = [
    { id: 'welcome', order: -100 },
    { id: 'credential', order: 0 },
  ],
  sectionOrder = [],
  navigation,
}: {
  wide?: boolean
  onboardingActive?: boolean
  rows?: Row[]
  steps?: Step[]
  sectionOrder?: readonly string[]
  navigation?: SettingsNavigationRequest
} = {}) {
  // Mutable row source standing in for the bound useSections hook; bump()
  // plays a ledger change through the same observable contract.
  let current = rows
  const listeners = new Set<() => void>()
  const renderSlot = vi.fn(
    ((key: string, _owner: unknown, opts?: { only?: string }) => {
      if (key === 'settings.section') return <div data-testid={`section-${opts?.only ?? 'all'}`} />
      return SEAT_CONTENT[key]
    }) as SettingsRootComponentProps['renderSlot'],
  )
  const useSessions = ((select: (state: unknown) => unknown) => select(onboardingActive
    ? { phase: 'ready', current: undefined, byId: {} }
    : {
      phase: 'ready',
      current: 'active-session',
      byId: { 'active-session': { blank: false } },
    })) as never
  const unusedHook = (() => { throw new Error('unused by SettingsRoot') }) as never
  const setSectionOrder = vi.fn<(ids: readonly string[]) => Promise<void>>(() => Promise.resolve())
  const props: SettingsRootComponentProps = {
    useSessions,
    useSessionPendingInteraction,
    useWorkspaces: unusedHook,
    wide,
    useOnboardingSteps: select => select(steps),
    useNavigation: select => select(navigation),
    useSectionOrder: select => select(sectionOrder),
    setSectionOrder,
    useSections: (select) => {
      const [, force] = useState(0)
      useEffect(() => {
        const listener = () => { force(n => n + 1) }
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      }, [])
      return select(current)
    },
    t: key => key,
    renderSlot,
  }
  const view = render(<SettingsRoot {...props} />)
  const bump = (next: Row[]) => {
    act(() => {
      current = next
      for (const fn of [...listeners]) fn()
    })
  }
  return { view, renderSlot, bump, listeners, setSectionOrder }
}

function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
}

function installPointerGeometry() {
  const list = screen.getByRole('list')
  Object.defineProperty(list, 'scrollTop', { configurable: true, writable: true, value: 0 })
  vi.spyOn(list, 'getBoundingClientRect').mockReturnValue({
    top: 100, bottom: 232, left: 0, right: 188, width: 188, height: 132, x: 0, y: 100,
    toJSON: () => ({}),
  })
  const items = [...list.querySelectorAll<HTMLElement>('[role="listitem"]')]
  items.forEach((item, index) => {
    const top = 100 + index * 44
    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
      top, bottom: top + 40, left: 0, right: 164, width: 164, height: 40, x: 0, y: top,
      toJSON: () => ({}),
    })
  })
  let nextFrame = 0
  const frames = new Map<number, FrameRequestCallback>()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++nextFrame
    frames.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id) })
  return {
    list,
    items,
    flushFrame: () => {
      act(() => {
        const pending = [...frames.values()]
        frames.clear()
        pending.forEach((callback) => { callback(performance.now()) })
      })
    },
  }
}

describe('SettingsRoot trigger', () => {
  it('renders the trigger seat content as the accessible name (no aria-label of its own)', () => {
    const { renderSlot } = mount()
    const trigger = screen.getByRole('button', { name: 'Settings' })
    expect(trigger.hasAttribute('aria-label')).toBe(false)
    expect(renderSlot).toHaveBeenCalledWith('settings.trigger', { wide: true })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Settings', expanded: true })).toBeTruthy()
  })

  it('hands the rail state to the trigger seat', () => {
    const { renderSlot } = mount({ wide: false })
    expect(renderSlot).toHaveBeenCalledWith('settings.trigger', { wide: false })
  })
})

describe('SettingsPanel chrome seats', () => {
  it('names the dialog via aria-labelledby pointing at the header seat node', () => {
    mount()
    openPanel()
    const dialog = screen.getByRole('dialog')
    const titleId = dialog.getAttribute('aria-labelledby')!
    expect(titleId).toBeTruthy()
    const title = document.getElementById(titleId)!
    expect(title.textContent).toBe('Settings Title')
    expect(screen.getByRole('dialog', { name: 'Settings Title' })).toBeTruthy()
  })

  it('names the close button through the visually-hidden close seat text', () => {
    mount()
    openPanel()
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close.hasAttribute('aria-label')).toBe(false)
    expect(close.textContent).toContain('Close')
  })

  it('renders header actions before the shell-owned close control', () => {
    const { renderSlot } = mount()
    openPanel()
    expect(screen.getByText('Open configuration file')).toBeTruthy()
    expect(renderSlot).toHaveBeenCalledWith('settings.action', {})
  })
})

describe('SettingsPanel close paths', () => {
  it('closes via the header button', () => {
    mount()
    openPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes via a mask click', () => {
    mount()
    openPanel()
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog.parentElement!.firstElementChild!)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes via document-level Escape and unhooks the listener with the panel', () => {
    mount()
    openPanel()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    // Ignored while closed (listener removed with the panel) and non-Escape
    // keys are ignored while open.
    fireEvent.keyDown(document, { key: 'Escape' })
    openPanel()
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('lands focus on the close button when the dialog opens', () => {
    mount()
    openPanel()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
  })
})

describe('SettingsPanel navigation', () => {
  it('opens a requested section and forwards its subsection', () => {
    const { renderSlot } = mount({
      navigation: { sectionId: 'models', subsectionId: 'provider', revision: 1 },
    })
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByTestId('section-models')).toBeTruthy()
    expect(renderSlot).toHaveBeenCalledWith(
      'settings.section',
      expect.objectContaining({ preferredSubsectionId: 'provider' }),
      { only: 'models' },
    )
  })

  it('projects rows, marks the first active, and renders only that section', () => {
    mount()
    openPanel()
    expect(screen.getByRole('button', { name: 'General' }).getAttribute('aria-current')).toBe('true')
    expect(screen.getByRole('button', { name: 'Models' }).getAttribute('aria-current')).toBeNull()
    expect(screen.getByTestId('section-general')).toBeTruthy()
  })

  it('gives every section a nav glyph, distinct for the ids the shell knows', () => {
    mount({
      rows: [
        { id: 'general', order: 0, label: 'General' },
        { id: 'models', order: 10, label: 'Models' },
        { id: 'agent-presets', order: 20, label: 'Agent presets' },
        { id: 'plugins', order: 30, label: 'Plugins' },
        { id: 'contributed', order: 40, label: 'Contributed' },
      ],
    })
    openPanel()
    // Glyphs carry no id of their own, so the drawn paths are what tells them apart.
    const glyphs = ['General', 'Models', 'Agent presets', 'Plugins', 'Contributed']
      .map(name => screen.getByRole('button', { name }).querySelector('svg')?.innerHTML)

    expect(glyphs.every(glyph => glyph !== undefined && glyph !== '')).toBe(true)
    // The three ids the shell names get their own glyph; every other section —
    // including one this package never heard of — shares the gear.
    expect(new Set(glyphs.slice(0, 4)).size).toBe(4)
    expect(glyphs[4]).toBe(glyphs[0])
  })

  it('switches the rendered section on nav click', () => {
    mount()
    openPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Models' }))
    expect(screen.getByRole('button', { name: 'Models' }).getAttribute('aria-current')).toBe('true')
    expect(screen.getByTestId('section-models')).toBeTruthy()
    expect(screen.queryByTestId('section-general')).toBeNull()
  })

  it('follows the pointer, animates a full-row gap, then persists exactly once after settling', () => {
    vi.useFakeTimers()
    const { setSectionOrder } = mount({ sectionOrder: ['models', 'general', 'agent-presets'] })
    openPanel()
    const { list, items, flushFrame } = installPointerGeometry()
    expect([...list.querySelectorAll('[role="listitem"]')].map(item => item.textContent)).toEqual([
      expect.stringContaining('Models'),
      expect.stringContaining('General'),
      expect.stringContaining('Agent presets'),
    ])

    const modelsHandle = screen.getByRole('button', { name: 'nav.reorder: Models' })
    fireEvent.pointerDown(modelsHandle, {
      button: 0, isPrimary: true, pointerId: 7, clientX: 150, clientY: 120,
    })
    fireEvent.pointerMove(modelsHandle, { pointerId: 7, clientX: 150, clientY: 220 })
    flushFrame()

    expect(list.dataset.sorting).toBe('true')
    expect(items[0]?.dataset.placeholder).toBe('true')
    expect(items[1]?.style.transform).toBe('translateY(-44px)')
    expect(items[2]?.style.transform).toBe('translateY(-44px)')
    const ghost = document.querySelector<HTMLElement>('[data-phase="dragging"]')
    expect(ghost?.style.transform).toBe('translateY(100px)')
    expect(setSectionOrder).not.toHaveBeenCalled()

    fireEvent.pointerUp(modelsHandle, { pointerId: 7, clientX: 150, clientY: 220 })
    expect(setSectionOrder).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(180) })

    expect(setSectionOrder).toHaveBeenCalledOnce()
    expect(setSectionOrder).toHaveBeenCalledWith(['general', 'agent-presets', 'models'])
    expect(screen.getByRole('button', { name: 'Models' }).getAttribute('aria-current')).toBeNull()
    expect(screen.getByRole('button', { name: 'General' }).getAttribute('aria-current')).toBe('true')
  })

  it('moves the last contributed section into the first slot', () => {
    vi.useFakeTimers()
    const { setSectionOrder } = mount()
    openPanel()
    const { items, flushFrame } = installPointerGeometry()
    const handle = screen.getByRole('button', { name: 'nav.reorder: Agent presets' })
    fireEvent.pointerDown(handle, {
      button: 0, isPrimary: true, pointerId: 10, clientX: 150, clientY: 208,
    })
    fireEvent.pointerMove(handle, { pointerId: 10, clientX: 150, clientY: 105 })
    flushFrame()
    expect(items[0]?.style.transform).toBe('translateY(44px)')
    expect(items[1]?.style.transform).toBe('translateY(44px)')
    fireEvent.pointerUp(handle, { pointerId: 10, clientX: 150, clientY: 105 })
    act(() => { vi.advanceTimersByTime(180) })
    expect(setSectionOrder).toHaveBeenCalledWith(['agent-presets', 'general', 'models'])
  })

  it('auto-scrolls a long navigation rail near its bottom edge', () => {
    vi.useFakeTimers()
    mount()
    openPanel()
    const { list, flushFrame } = installPointerGeometry()
    const handle = screen.getByRole('button', { name: 'nav.reorder: Models' })
    fireEvent.pointerDown(handle, {
      button: 0, isPrimary: true, pointerId: 11, clientX: 150, clientY: 164,
    })
    fireEvent.pointerMove(handle, { pointerId: 11, clientX: 150, clientY: 229 })
    flushFrame()
    expect(list.scrollTop).toBeGreaterThan(0)
    fireEvent.keyDown(document, { key: 'Escape' })
    act(() => { vi.advanceTimersByTime(180) })
  })

  it('does not start sorting from the row or before the handle passes the four-pixel threshold', () => {
    const { setSectionOrder } = mount()
    openPanel()
    const { list, flushFrame } = installPointerGeometry()
    const models = screen.getByRole('button', { name: 'Models' })
    fireEvent.pointerDown(models, { pointerId: 3, clientX: 80, clientY: 164 })
    fireEvent.pointerMove(models, { pointerId: 3, clientX: 80, clientY: 220 })
    expect(list.dataset.sorting).toBeUndefined()

    const handle = screen.getByRole('button', { name: 'nav.reorder: Models' })
    fireEvent.pointerDown(handle, {
      button: 0, isPrimary: true, pointerId: 4, clientX: 150, clientY: 164,
    })
    fireEvent.pointerMove(handle, { pointerId: 4, clientX: 152, clientY: 166 })
    flushFrame()
    fireEvent.pointerUp(handle, { pointerId: 4, clientX: 152, clientY: 166 })
    expect(list.dataset.sorting).toBeUndefined()
    expect(setSectionOrder).not.toHaveBeenCalled()
  })

  it.each(['outside', 'cancel', 'escape'] as const)(
    'restores the original order without persisting on %s cancellation',
    (method) => {
      vi.useFakeTimers()
      const { setSectionOrder } = mount()
      openPanel()
      const { list, items, flushFrame } = installPointerGeometry()
      const handle = screen.getByRole('button', { name: 'nav.reorder: Models' })
      fireEvent.pointerDown(handle, {
        button: 0, isPrimary: true, pointerId: 8, clientX: 150, clientY: 164,
      })
      fireEvent.pointerMove(handle, { pointerId: 8, clientX: 150, clientY: 215 })
      flushFrame()
      expect(list.dataset.sorting).toBe('true')

      if (method === 'outside') {
        fireEvent.pointerUp(handle, { pointerId: 8, clientX: 240, clientY: 215 })
      } else if (method === 'cancel') {
        fireEvent.pointerCancel(handle, { pointerId: 8 })
      } else {
        fireEvent.keyDown(document, { key: 'Escape' })
      }
      expect(items.every(item => item.style.transform === 'translateY(0px)')).toBe(true)
      act(() => { vi.advanceTimersByTime(180) })
      expect(setSectionOrder).not.toHaveBeenCalled()
      expect(list.dataset.sorting).toBeUndefined()
      expect(screen.getByRole('dialog')).toBeTruthy()
    },
  )

  it('skips the settle delay when reduced motion is requested', () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    const { setSectionOrder } = mount()
    openPanel()
    const { flushFrame } = installPointerGeometry()
    const handle = screen.getByRole('button', { name: 'nav.reorder: Models' })
    fireEvent.pointerDown(handle, {
      button: 0, isPrimary: true, pointerId: 9, clientX: 150, clientY: 164,
    })
    fireEvent.pointerMove(handle, { pointerId: 9, clientX: 150, clientY: 215 })
    flushFrame()
    fireEvent.pointerUp(handle, { pointerId: 9, clientX: 150, clientY: 215 })
    expect(setSectionOrder).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(0) })
    expect(setSectionOrder).toHaveBeenCalledOnce()
  })

  it('supports keyboard reordering from the same drag handle', () => {
    const { setSectionOrder } = mount()
    openPanel()
    fireEvent.keyDown(screen.getByRole('button', { name: 'nav.reorder: Models' }), { key: 'ArrowUp' })
    expect(setSectionOrder).toHaveBeenCalledWith(['models', 'general', 'agent-presets'])
  })

  it('mounts onboarding steps in order and transfers ownership only on completion', () => {
    const { renderSlot } = mount()
    const first = renderSlot.mock.calls.find(call => call[0] === 'settings.onboarding')
    expect(first?.[1]).toMatchObject({ stepId: 'welcome' })
    expect(first?.[2]).toEqual({ only: 'welcome' })
    act(() => {
      (first?.[1] as { complete: () => void }).complete()
      ;(first?.[1] as { complete: () => void }).complete()
    })
    const onboardingCalls = renderSlot.mock.calls.filter(call => call[0] === 'settings.onboarding')
    const second = onboardingCalls.at(-1)
    expect(second?.[1]).toMatchObject({ stepId: 'credential' })
    expect(second?.[2]).toEqual({ only: 'credential' })

    const finishSection = vi.fn()
    act(() => {
      (second?.[1] as {
        openSection: (request: {
          sectionId: string
          subsectionId?: string
          step: 1 | 2 | 3 | 4
          complete: () => void
        }) => void
      }).openSection({
        sectionId: 'models',
        subsectionId: 'provider',
        step: 1,
        complete: finishSection,
      })
    })
    expect(screen.getByRole('dialog', { name: 'onboarding.start' })).toBeTruthy()
    expect(screen.getByRole('dialog', { name: 'onboarding.start' }).parentElement?.parentElement)
      .toBe(document.body)
    expect(screen.getByTestId('section-models')).toBeTruthy()
    expect(renderSlot).toHaveBeenCalledWith(
      'settings.section',
      expect.objectContaining({ preferredSubsectionId: 'provider' }),
      { only: 'models' },
    )
    expect(screen.queryByRole('button', { name: 'General' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'onboarding.done' }))
    expect(finishSection).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog', { name: 'onboarding.start' })).toBeNull()

    cleanup()
    const inactive = mount({ onboardingActive: false }).renderSlot.mock.calls
      .filter(call => call[0] === 'settings.onboarding')
    expect(inactive).toHaveLength(0)
  })

  it('paints no takeover chrome of its own around the mounted step', () => {
    // The chrome (mask, opaque stage, #root inert) belongs to the step via
    // the step-owned dialog surface — a mounted-but-deciding step that
    // renders null must show and block nothing (the reload white-flash fix;
    // onboarding-surface.spec.tsx pins the primitive's half).
    const appRoot = document.createElement('div')
    appRoot.id = 'root'
    document.body.append(appRoot)
    const { view } = mount()
    expect(view.container.querySelector('[class*="onboarding"]')).toBeNull()
    expect(document.body.querySelector('[class*="onboarding"]')).toBeNull()
    expect(appRoot.inert).not.toBe(true)
    view.unmount()
    appRoot.remove()
  })

  it('falls back to the first row when the active entry unregisters', () => {
    const { bump } = mount()
    openPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Models' }))
    bump([{ id: 'general', order: 0, label: 'General' }])
    expect(screen.queryByRole('button', { name: 'Models' })).toBeNull()
    expect(screen.getByTestId('section-general')).toBeTruthy()
  })

  it('renders an empty content column when the ledger is empty', () => {
    const { renderSlot } = mount({ rows: [] })
    openPanel()
    expect(screen.getByRole('dialog')).toBeTruthy()
    const sectionCalls = renderSlot.mock.calls.filter(c => c[0] === 'settings.section')
    expect(sectionCalls).toHaveLength(0)
  })

  it('drops the ledger subscription on unmount', () => {
    const { view, listeners } = mount()
    expect(listeners.size).toBe(1)
    view.unmount()
    expect(listeners.size).toBe(0)
  })
})
