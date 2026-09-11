// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSyncExternalStore } from 'react'
import type { ComponentProps } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ConversationHeaderMenuItemOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { SessionLogDownloadController } from '../src/client/controller.ts'
import { SessionLogDownloadHeaderAction } from '../src/client/HeaderAction.tsx'
import { en } from '../src/client/locales.ts'

const SID = 'session-export-header' as SessionId

function bindSessionExport(controller: SessionLogDownloadController) {
  return function useSessionLogDownload<T>(selector: (state: ReturnType<typeof controller.store.getSnapshot>) => T): T {
    return useSyncExternalStore(
      listener => controller.store.subscribe(listener),
      () => selector(controller.store.getSnapshot()),
    )
  }
}

function bench() {
  const controller = new SessionLogDownloadController(async () => new Response('zip'), vi.fn())
  const request = vi.fn((sessionId: SessionId) => controller.download(sessionId))
  const dismiss = vi.fn((sessionId: SessionId) => { controller.dismiss(sessionId) })
  const useSessionLogDownload = bindSessionExport(controller)
  let menuOwner: ConversationHeaderMenuItemOwnerProps | undefined
  const props = {
    sessionId: SID,
    useSessionLogDownload,
    request,
    dismiss,
    renderSlot: (_key: string, owner: ConversationHeaderMenuItemOwnerProps) => {
      menuOwner = owner
      return null
    },
    t: (key: keyof typeof en): string => en[key],
  } as unknown as ComponentProps<typeof SessionLogDownloadHeaderAction>
  const view = render(<SessionLogDownloadHeaderAction {...props} />)
  return { controller, request, view, menuOwner: () => menuOwner! }
}

afterEach(cleanup)

describe('Session export Header action', () => {
  it('opens the more-actions menu and downloads through the shared controller', async () => {
    const b = bench()
    const button = b.view.getByRole('button', { name: 'More actions' })
    expect(button.querySelector('svg')).not.toBeNull()
    expect(button.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(b.view.getByRole('menuitem', { name: 'Download session log' }))
    await waitFor(() => { expect(b.request).toHaveBeenCalledWith(SID) })
    expect(b.view.queryByRole('menuitem', { name: 'Download session log' })).toBeNull()
    expect(await b.view.findByRole('dialog', { name: 'Session download started' })).toBeTruthy()
  })

  it('closes the menu on Escape without downloading', () => {
    const b = bench()
    fireEvent.click(b.view.getByRole('button', { name: 'More actions' }))
    expect(b.view.getByRole('menuitem', { name: 'Download session log' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(b.view.queryByRole('menuitem', { name: 'Download session log' })).toBeNull()
    expect(b.request).not.toHaveBeenCalled()
  })

  it('appends community actions below the official log export row', () => {
    const b = bench()
    const selected = vi.fn()
    act(() => {
      b.menuOwner().registerMenuItem({
        id: 'conversation-session-remove',
        item: { id: 'conversation-session-remove', label: 'Delete session', danger: true },
        onSelect: selected,
      })
    })
    fireEvent.click(b.view.getByRole('button', { name: 'More actions' }))
    expect(b.view.getAllByRole('menuitem').map(item => item.textContent)).toEqual([
      'Download session log', 'Delete session',
    ])
    fireEvent.click(b.view.getByRole('menuitem', { name: 'Delete session' }))
    expect(selected).toHaveBeenCalledWith('conversation-session-remove')
  })

  it('disables the download row while either entry path downloads this Session', async () => {
    const b = bench()
    let release!: (response: Response) => void
    const pending = new Promise<Response>((resolve) => { release = resolve })
    const controller = new SessionLogDownloadController(() => pending, vi.fn())
    const useSessionLogDownload = bindSessionExport(controller)
    b.view.rerender(<SessionLogDownloadHeaderAction {...({
      sessionId: SID,
      useSessionLogDownload,
      request: (sessionId: SessionId) => controller.download(sessionId),
      dismiss: (sessionId: SessionId) => { controller.dismiss(sessionId) },
      renderSlot: () => null,
      t: (key: keyof typeof en): string => en[key],
    } as unknown as ComponentProps<typeof SessionLogDownloadHeaderAction>)} />)

    const download = controller.download(SID)
    const button = b.view.getByRole('button', { name: 'More actions' })
    await waitFor(() => { expect(button.getAttribute('aria-busy')).toBe('true') })
    fireEvent.click(button)
    const item = b.view.getByRole('menuitem', { name: 'Download session log' })
    expect((item as HTMLButtonElement).disabled).toBe(true)
    release(new Response('zip'))
    await download
    await waitFor(() => { expect(button.getAttribute('aria-busy')).toBe('false') })
    expect((item as HTMLButtonElement).disabled).toBe(false)
  })
})
