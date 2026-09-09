// @vitest-environment jsdom
/**
 * The way back into a hidden panel: the header's corner button exists exactly
 * while the panel is collapsed, asks for it to expand, and leaves a same-size
 * footprint while the panel is shown so the header row never moves.
 */
import { describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { ExpandButton } from '../src/client/shell/ExpandButton.tsx'
import type { ExpandButtonProps } from '../src/client/shell/ExpandButton.tsx'
import { createSidebarRightStore } from '../src/client/stores.ts'

const SESSION = 's-test' as SessionId

/** Test-local selector hook over a framework-neutral store instance. */
function hookOf<T>(inst: { subscribe: (fn: () => void) => () => void; getSnapshot: () => T }) {
  return function useSelector<S>(sel: (s: T) => S): S {
    return sel(useSyncExternalStore(inst.subscribe, inst.getSnapshot))
  }
}

/**
 * Mount the button over a real store instance. It reads four of its props; the
 * rest of the standard kit is framework-injected and never touched here, so one
 * documented cast keeps the harness to what is actually exercised.
 */
function mountButton() {
  const instance = createSidebarRightStore(() => 'Start').create()
  const props = {
    sessionId: SESSION,
    useStore: hookOf(instance),
    actions: instance.actions,
    // Copy is the dictionary's contract; the key stands in for the translation.
    t: (key: string) => key,
  } as unknown as ExpandButtonProps
  const view = render(<ExpandButton {...props} />)
  const control = (): HTMLElement | null => view.container.querySelector('[data-sidebar-right-expand]')
  const placeholder = (): HTMLElement | null => view.container.querySelector('[data-sidebar-right-expand-placeholder]')
  return { instance, view, control, placeholder }
}

describe('ExpandButton', () => {
  it('offers the way in while the session has no surface yet, and asks the panel to expand', () => {
    const { instance, control, placeholder } = mountButton()
    const button = control()
    if (button === null) throw new Error('expected the expand control')
    expect(button.getAttribute('aria-label')).toBe('chrome.expand')
    expect(placeholder()).toBeNull()
    fireEvent.click(button)
    expect(instance.getSnapshot().bySession[SESSION]?.layout.expanded).toBe(true)
    // Shown: the control gives way to its footprint, so the seat keeps its width.
    expect(control()).toBeNull()
    expect(placeholder()).not.toBeNull()
    cleanup()
  })

  it('comes back when the panel collapses again', () => {
    const { instance, control, placeholder } = mountButton()
    act(() => { instance.actions.setExpanded(SESSION, true) })
    expect(control()).toBeNull()
    act(() => { instance.actions.setExpanded(SESSION, false) })
    expect(control()).not.toBeNull()
    expect(placeholder()).toBeNull()
    cleanup()
  })
})
