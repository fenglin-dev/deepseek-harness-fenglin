// @vitest-environment jsdom
/**
 * What the body draws from its pages and the file's metadata, and what it does
 * with a navigation: load until the asked line is held, jump to it once, then
 * keep the reader's place.
 *
 * jsdom lays nothing out, so two geometry facts are supplied here: a line's
 * offset is its number times one line height, and `scrollTop` holds what it is
 * set to. Both are the browser's job; the specs assert the body's arithmetic
 * over them.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { RemoteError } from '@deepseek-ai/dsh-client-test-runtime'
import { TextPreview } from '../src/client/TextPreview.tsx'
import { ABSOLUTE_PATH, ADDRESS, PATH, SESSION, TAB_ID, failure, harness, page, settle } from './fixtures.client.ts'

const LINE_HEIGHT = 20

const originals = {
  offsetTop: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop'),
  scrollTop: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTop'),
}

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
    configurable: true,
    get(this: HTMLElement) {
      const line = this.getAttribute('data-textpreview-line')
      return line === null ? 0 : (Number(line) - 1) * LINE_HEIGHT
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
    configurable: true,
    get(this: HTMLElement & { __scrollTop?: number }) { return this.__scrollTop ?? 0 },
    set(this: HTMLElement & { __scrollTop?: number }, value: number) { this.__scrollTop = value },
  })
})

afterAll(() => {
  for (const [name, descriptor] of Object.entries(originals)) {
    if (descriptor === undefined) Reflect.deleteProperty(HTMLElement.prototype, name)
    else Object.defineProperty(HTMLElement.prototype, name, descriptor)
  }
})

afterEach(cleanup)

function body(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>('[data-textpreview-body]')
  if (element === null) throw new Error('expected the file body')
  return element
}

function lines(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-textpreview-line]'), row => row.textContent ?? '')
}

function target(container: HTMLElement): string | null {
  return container.querySelector('[data-textpreview-target]')?.getAttribute('data-textpreview-target') ?? null
}

function click(container: HTMLElement, selector: string): void {
  const button = container.querySelector<HTMLButtonElement>(selector)
  if (button === null) throw new Error(`expected ${selector}`)
  fireEvent.click(button)
}

describe('TextPreview — pages', () => {
  it.each([ABSOLUTE_PATH, 'C:\\work\\project\\notes.md', '\\\\host\\share\\notes.md'])(
    'shows the Host path %s in the header and tooltip even when text cannot be read',
    async (absolutePath) => {
      const h = harness({ 1: failure('workspace-file/not-text', { path: PATH }) })
      h.useResource.mockReturnValue({
        status: 'live', value: { absolutePath, version: 'v1', changed: false }, failure: undefined, reload: h.reload,
      })
      const view = render(<TextPreview {...h.props()} />)
      await settle()
      const path = view.container.querySelector('[data-textpreview-path]')
      expect(path?.textContent).toBe(absolutePath)
      expect(path?.getAttribute('title')).toBe(absolutePath)
      expect(h.read).toHaveBeenCalledWith(SESSION, PATH, 1, h.controller.signal)
    },
  )

  it('shows the requested path until Host metadata supplies its absolute path', async () => {
    const h = harness({ 1: page(1, ['one'], true) })
    const metadata = h.useResource()
    h.useResource.mockReturnValue({ status: 'loading', value: undefined, failure: undefined, reload: h.reload })
    const view = render(<TextPreview {...h.props()} />)
    await settle()
    expect(view.container.querySelector('[data-textpreview-path]')?.textContent).toBe(PATH)
    h.useResource.mockReturnValue(metadata)
    view.rerender(<TextPreview {...h.props()} />)
    expect(view.container.querySelector('[data-textpreview-path]')?.textContent).toBe(ABSOLUTE_PATH)
    expect(view.container.querySelector('[data-textpreview-path]')?.getAttribute('title')).toBe(ABSOLUTE_PATH)
  })

  it('reads the first page on first mount and draws its lines, offering the next', async () => {
    const h = harness({ 1: page(1, ['one', 'two', 'three'], false) })
    const view = render(<TextPreview {...h.props()} />)
    // The read is in flight from the mount effect on: the body is up with no
    // lines yet, and its next-page control reports the progress.
    const pending = view.container.querySelector<HTMLButtonElement>('[data-textpreview-more]')
    expect(pending?.disabled).toBe(true)
    expect(pending?.textContent).toBe('loading')
    expect(lines(view.container)).toEqual([])
    await settle()
    expect(h.read).toHaveBeenCalledTimes(1)
    expect(h.read).toHaveBeenCalledWith(SESSION, PATH, 1, h.controller.signal)
    expect(lines(view.container)).toEqual(['one\n', 'two\n', 'three\n'])
    expect(view.container.querySelector('[data-textpreview-url]')?.getAttribute('data-textpreview-url')).toBe(ADDRESS)
    expect(view.container.textContent).toContain(PATH)
    expect(view.container.querySelector('[data-textpreview-more]')).not.toBeNull()
    expect(view.container.querySelector('[data-textpreview-changed]')).toBeNull()
  })

  it('reads nothing on a remount while the store holds the pages', async () => {
    const h = harness({ 1: page(1, ['one'], true) })
    const first = render(<TextPreview {...h.props()} />)
    await settle()
    first.unmount()
    const second = render(<TextPreview {...h.props()} />)
    await settle()
    expect(h.read).toHaveBeenCalledTimes(1)
    expect(lines(second.container)).toEqual(['one\n'])
  })

  it('loads the next page where the loaded text ends, until the file ends', async () => {
    const h = harness({ 1: page(1, ['a', 'b', 'c'], false), 4: page(4, ['d', 'e'], true) })
    const view = render(<TextPreview {...h.props()} />)
    await settle()
    click(view.container, '[data-textpreview-more]')
    await settle()
    expect(h.read).toHaveBeenLastCalledWith(SESSION, PATH, 4, h.controller.signal)
    expect(lines(view.container)).toEqual(['a\n', 'b\n', 'c\n', 'd\n', 'e\n'])
    expect(view.container.querySelectorAll('[data-textpreview-page]').length).toBe(2)
    expect(view.container.querySelector('[data-textpreview-more]')).toBeNull()
  })

  it('says why a page failed and retries the same page', async () => {
    const h = harness({ 1: failure('workspace-file/not-text', { path: PATH }) })
    const view = render(<TextPreview {...h.props()} />)
    await settle()
    expect(view.container.querySelector('[data-textpreview-failed]')?.getAttribute('data-textpreview-failed')).toBe('workspace-file/not-text')
    expect(view.container.textContent).toContain('error.notText')
    expect(view.container.querySelector('[data-textpreview-more]')).toBeNull()
    h.script(1, page(1, ['one'], true))
    click(view.container, '[data-textpreview-retry]')
    await settle()
    expect(h.read).toHaveBeenLastCalledWith(SESSION, PATH, 1, h.controller.signal)
    expect(lines(view.container)).toEqual(['one\n'])
    expect(view.container.querySelector('[data-textpreview-failed]')).toBeNull()
  })

  it('announces a change and, on request, re-reads the pages keeping the reader\'s place', async () => {
    const h = harness({ 1: page(1, ['a', 'b'], true) })
    const view = render(<TextPreview {...h.props()} />)
    await settle()
    fireEvent.scroll(body(view.container), { target: { scrollTop: 50 } })
    h.setChanged(true)
    view.rerender(<TextPreview {...h.props()} />)
    expect(view.container.querySelector('[data-textpreview-changed]')?.textContent).toContain('changed')
    expect(lines(view.container)).toEqual(['a\n', 'b\n'])
    h.script(1, page(1, ['A', 'B', 'C'], true, 'v2'))
    click(view.container, '[data-textpreview-reload-now]')
    expect(h.reload).toHaveBeenCalledTimes(1)
    await settle()
    expect(h.read).toHaveBeenLastCalledWith(SESSION, PATH, 1, h.controller.signal)
    expect(lines(view.container)).toEqual(['A\n', 'B\n', 'C\n'])
    expect(body(view.container).scrollTop).toBe(50)
  })
})

describe('TextPreview — the file\'s metadata', () => {
  it('announces a failed metadata frame over the pages already loaded, ahead of a pending change, until a reload stats it live again', async () => {
    const h = harness({ 1: page(1, ['a', 'b'], true) })
    const view = render(<TextPreview {...h.props()} />)
    await settle()
    h.setChanged(true)
    h.setFailure(new RemoteError('workspace-file/not-found', 'gone', { path: PATH }))
    view.rerender(<TextPreview {...h.props()} />)
    const bar = view.container.querySelector('[data-textpreview-meta-failed]')
    expect(bar?.getAttribute('data-textpreview-meta-failed')).toBe('workspace-file/not-found')
    expect(bar?.textContent).toContain('error.notFound')
    expect(view.container.querySelector('[data-textpreview-changed]')).toBeNull()
    expect(lines(view.container)).toEqual(['a\n', 'b\n'])
    // The bar's reload is the same gesture: stat again through the resource and re-read the pages.
    h.script(1, page(1, ['A'], true, 'v2'))
    click(view.container, '[data-textpreview-reload-now]')
    expect(h.reload).toHaveBeenCalledTimes(1)
    await settle()
    expect(lines(view.container)).toEqual(['A\n'])
    // The stat succeeds: the next frame is live and the bar is gone.
    h.setChanged(false)
    h.setFailure(undefined)
    view.rerender(<TextPreview {...h.props()} />)
    expect(view.container.querySelector('[data-textpreview-meta-failed]')).toBeNull()
    expect(view.container.querySelector('[data-textpreview-changed]')).toBeNull()
  })

  it('draws a page holding one empty line as one line, and nothing for a page past the end', async () => {
    const h = harness({ 1: page(1, [''], false), 2: page(2, [], true) })
    const view = render(<TextPreview {...h.props()} />)
    await settle()
    expect(lines(view.container)).toEqual(['\n'])
    click(view.container, '[data-textpreview-more]')
    await settle()
    expect(h.read).toHaveBeenLastCalledWith(SESSION, PATH, 2, h.controller.signal)
    expect(lines(view.container)).toEqual(['\n'])
    expect(view.container.querySelector('[data-textpreview-more]')).toBeNull()
  })
})

describe('TextPreview — navigation and view', () => {
  it('loads until the navigated line is held, then jumps to it once and marks it', async () => {
    const h = harness({ 1: page(1, ['a', 'b', 'c'], false), 4: page(4, ['d', 'e', 'f'], true) })
    const view = render(<TextPreview {...h.props({ params: { line: 5 }, revision: 1 })} />)
    await settle()
    // The first page does not reach line 5, so the body asks for the next on its own.
    await settle()
    expect(h.read).toHaveBeenCalledTimes(2)
    expect(h.read).toHaveBeenLastCalledWith(SESSION, PATH, 4, h.controller.signal)
    expect(body(view.container).scrollTop).toBe(4 * LINE_HEIGHT)
    expect(target(view.container)).toBe('5')
    expect(h.instance.getSnapshot().byTab[TAB_ID]?.revision).toBe(1)
    expect(h.instance.getSnapshot().byTab[TAB_ID]?.scrollTop).toBe(4 * LINE_HEIGHT)
  })

  it('comes back where the reader was on a remount, instead of jumping again', async () => {
    const h = harness({ 1: page(1, ['a', 'b', 'c'], true) })
    const first = render(<TextPreview {...h.props({ params: { line: 3 }, revision: 1 })} />)
    await settle()
    expect(body(first.container).scrollTop).toBe(2 * LINE_HEIGHT)
    fireEvent.scroll(body(first.container), { target: { scrollTop: 300 } })
    first.unmount()
    const second = render(<TextPreview {...h.props({ params: { line: 3 }, revision: 1 })} />)
    await settle()
    expect(body(second.container).scrollTop).toBe(300)
  })

  it('jumps again for a new navigation to the same tab', async () => {
    const h = harness({ 1: page(1, ['a', 'b', 'c'], true) })
    const view = render(<TextPreview {...h.props({ params: { line: 3 }, revision: 1 })} />)
    await settle()
    fireEvent.scroll(body(view.container), { target: { scrollTop: 300 } })
    view.rerender(<TextPreview {...h.props({ params: { line: 2 }, revision: 2 })} />)
    expect(body(view.container).scrollTop).toBe(1 * LINE_HEIGHT)
    expect(target(view.container)).toBe('2')
    expect(h.instance.getSnapshot().byTab[TAB_ID]?.revision).toBe(2)
  })

  it('stops at the end of the file for a line past it, and answers a navigation without a line', async () => {
    const h = harness({ 1: page(1, ['a', 'b'], true) })
    const view = render(<TextPreview {...h.props({ params: { line: 99 }, revision: 1 })} />)
    await settle()
    expect(h.read).toHaveBeenCalledTimes(1)
    expect(target(view.container)).toBeNull()
    expect(body(view.container).scrollTop).toBe(0)
    expect(h.instance.getSnapshot().byTab[TAB_ID]?.revision).toBe(1)
    view.rerender(<TextPreview {...h.props({ params: {}, revision: 2 })} />)
    expect(target(view.container)).toBeNull()
    expect(h.instance.getSnapshot().byTab[TAB_ID]?.revision).toBe(2)
  })

  it('wraps by default and stops when the shared store says so', async () => {
    const h = harness({ 1: page(1, ['a'], true) })
    const view = render(<TextPreview {...h.props()} />)
    await settle()
    expect(body(view.container).hasAttribute('data-textpreview-wrap')).toBe(true)
    act(() => { h.instance.actions.toggledWrap(TAB_ID) })
    expect(body(view.container).hasAttribute('data-textpreview-wrap')).toBe(false)
  })
})

describe('TextPreview — header controls', () => {
  it('toggles wrap off from the header, reporting the pressed state', async () => {
    const h = harness({ 1: page(1, ['a'], true) })
    const view = render(<TextPreview {...h.props()} />)
    await settle()
    const wrap = view.container.querySelector<HTMLButtonElement>('[data-textpreview-tool="wrap"]')
    if (wrap === null) throw new Error('expected the wrap control')
    expect(wrap.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(wrap)
    expect(h.instance.getSnapshot().byTab[TAB_ID]?.wrap).toBe(false)
    expect(wrap.getAttribute('aria-pressed')).toBe('false')
    expect(body(view.container).hasAttribute('data-textpreview-wrap')).toBe(false)
  })

  it('reloads from the header through the resource and the face, without a change announced', async () => {
    const h = harness({ 1: page(1, ['one'], true) })
    const view = render(<TextPreview {...h.props()} />)
    await settle()
    expect(h.useResource).toHaveBeenCalledWith(ADDRESS)
    expect(view.container.querySelector('[data-textpreview-changed]')).toBeNull()
    h.script(1, page(1, ['uno'], true, 'v2'))
    click(view.container, '[data-textpreview-tool="reload"]')
    expect(h.reload).toHaveBeenCalledTimes(1)
    await settle()
    expect(h.read).toHaveBeenLastCalledWith(SESSION, PATH, 1, h.controller.signal)
    expect(lines(view.container)).toEqual(['uno\n'])
  })

  it('forgets at once when mounted for a record that has already ended', async () => {
    const h = harness({ 1: page(1, ['a'], true) })
    h.controller.abort()
    render(<TextPreview {...h.props()} />)
    await settle()
    expect(h.instance.getSnapshot().byTab[TAB_ID]).toBeUndefined()
  })

  it('forgets its state when the record ends, even with the body unmounted, through one listener however often it mounted', async () => {
    const h = harness({ 1: page(1, ['a'], true) })
    const armed = vi.spyOn(h.controller.signal, 'addEventListener')
    const first = render(<TextPreview {...h.props()} />)
    await settle()
    expect(h.instance.getSnapshot().byTab[TAB_ID]).toBeDefined()
    // Switched away and back: the store outlives the body, so nothing re-arms.
    first.unmount()
    const second = render(<TextPreview {...h.props()} />)
    await settle()
    second.unmount()
    expect(armed.mock.calls.filter(([type]) => type === 'abort')).toHaveLength(1)
    h.controller.abort()
    expect(h.instance.getSnapshot().byTab[TAB_ID]).toBeUndefined()
  })
})
