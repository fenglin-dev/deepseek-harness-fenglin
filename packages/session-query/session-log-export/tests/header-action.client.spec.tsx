// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSyncExternalStore } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ConversationHeaderMenuContribution } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { SessionLogDownloadController } from '../src/client/controller.ts'
import { SessionLogDownloadHeaderAction } from '../src/client/HeaderAction.tsx'
import type { SessionLogDownloadDialogProps } from '../src/client/Dialog.tsx'
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

function bench(controller = new SessionLogDownloadController(async () => new Response('zip'), vi.fn())) {
  const request = vi.fn((sessionId: SessionId) => controller.download(sessionId))
  const dismiss = vi.fn((sessionId: SessionId) => { controller.dismiss(sessionId) })
  const useSessionLogDownload = bindSessionExport(controller)
  let contribution: ConversationHeaderMenuContribution | undefined
  const registerMenuItem = vi.fn((next: ConversationHeaderMenuContribution) => {
    contribution = next
    return () => {
      if (contribution === next) contribution = undefined
    }
  })
  const props = {
    sessionId: SID,
    useSessionLogDownload,
    request,
    dismiss,
    registerMenuItem,
    t: (key: keyof typeof en): string => en[key],
  } as unknown as SessionLogDownloadDialogProps
  const view = render(<SessionLogDownloadHeaderAction {...props} />)
  return { controller, request, view, contribution: () => contribution! }
}

afterEach(cleanup)

describe('Session export Header action', () => {
  it('contributes one download row to the official menu and uses the shared controller', async () => {
    const b = bench()
    await waitFor(() => { expect(b.contribution().item.label).toBe('Download session log') })
    act(() => { b.contribution().onSelect('session-log-download') })
    await waitFor(() => { expect(b.request).toHaveBeenCalledWith(SID) })
    expect(await b.view.findByRole('dialog', { name: 'Session download started' })).toBeTruthy()
  })

  it('does not render a second more-actions trigger beside the official one', async () => {
    const b = bench()
    await waitFor(() => { expect(b.contribution()).toBeDefined() })
    expect(b.view.queryByRole('button', { name: 'More actions' })).toBeNull()
    expect(b.request).not.toHaveBeenCalled()
  })

  it('disables the download row while either entry path downloads this Session', async () => {
    let release!: (response: Response) => void
    const pending = new Promise<Response>((resolve) => { release = resolve })
    const controller = new SessionLogDownloadController(() => pending, vi.fn())
    const b = bench(controller)

    const download = controller.download(SID)
    await waitFor(() => { expect(b.contribution().item.disabled).toBe(true) })
    release(new Response('zip'))
    await download
    await waitFor(() => { expect(b.contribution().item.disabled).toBe(false) })
  })
})
