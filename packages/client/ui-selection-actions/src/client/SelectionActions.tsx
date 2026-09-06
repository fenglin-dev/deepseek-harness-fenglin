/** Contextual actions rendered for eligible browser text selections. */

import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
  type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react'
import {
  IconCopyOutline16, IconNewChatOutline16, IconPlusOutline16, IconRefreshOutline16, Toast, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import {
  captureSelection, placeContextMenu, placeSelectionToolbar, quoteSelection,
  type PanelPosition, type SelectionSnapshot, type ViewportPoint,
} from './selection.ts'
import css from './SelectionActions.module.css'

type SurfaceMode = 'toolbar' | 'menu'

interface OpenSurface {
  readonly mode: SurfaceMode
  readonly selection: SelectionSnapshot
  readonly point?: ViewportPoint
}

interface ToastState {
  readonly seq: number
  readonly text: string
}

/** Business face assembled by the client plugin. */
export interface SelectionActionsInjected {
  hooks: { appendAvailable: HostObservable<boolean> }
  copy: (text: string) => Promise<boolean>
  askInNewConversation: (workspaceId: WorkspaceId, draft: string) => Promise<void>
  appendToCurrent: (sessionId: SessionId, text: string) => void
  restartDesktop?: () => Promise<void>
}

/** Props assembled by the shell overlay registration. */
export type SelectionActionsProps =
  PropsRuntime<'shell.overlay'>
  & PropsLocale<typeof NS>
  & InjectFace<SelectionActionsInjected>

function viewportSize(): { width: number; height: number } {
  return { width: window.innerWidth, height: window.innerHeight }
}

/** Selected-text toolbar and context menu. */
export function SelectionActions({
  useSessions,
  useWorkspaces,
  useAppendAvailable,
  copy,
  askInNewConversation,
  appendToCurrent,
  restartDesktop,
  t,
}: SelectionActionsProps) {
  const currentSessionId = useSessions(state => state.current)
  const currentWorkspaceId = useWorkspaces((state) => {
    if (currentSessionId === undefined) return undefined
    return state.items.find(workspace => workspace.sessionIds.includes(currentSessionId))?.workspaceId
  })
  const appendAvailable = useAppendAvailable(value => value) && currentWorkspaceId !== undefined
  const [open, setOpen] = useState<OpenSurface | null>(null)
  const [position, setPosition] = useState<PanelPosition | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const toastSeq = useRef(0)

  const close = useCallback(() => {
    setOpen(null)
    setPosition(null)
  }, [])

  const showToast = useCallback((text: string) => {
    toastSeq.current += 1
    setToast({ seq: toastSeq.current, text })
  }, [])

  useLayoutEffect(() => {
    if (open === null || surfaceRef.current === null) return
    const panel = {
      width: surfaceRef.current.offsetWidth,
      height: surfaceRef.current.offsetHeight,
    }
    setPosition(open.mode === 'toolbar'
      ? placeSelectionToolbar(open.selection.rect, panel, viewportSize())
      : placeContextMenu(open.point ?? { x: open.selection.rect.right, y: open.selection.rect.bottom }, panel, viewportSize()))
  }, [open])

  useEffect(() => {
    const onPointerUp = (event: PointerEvent): void => {
      if (event.button !== 0 || surfaceRef.current?.contains(event.target as Node)) return
      const selection = captureSelection(window.getSelection(), event.target)
      if (selection === null) {
        close()
        return
      }
      setPosition(null)
      setOpen({ mode: 'toolbar', selection })
    }
    const onContextMenu = (event: MouseEvent): void => {
      if (surfaceRef.current?.contains(event.target as Node)) return
      const selection = captureSelection(window.getSelection(), event.target)
      if (selection === null) {
        close()
        return
      }
      event.preventDefault()
      setPosition(null)
      setOpen({ mode: 'menu', selection, point: { x: event.clientX, y: event.clientY } })
    }
    const onPointerDown = (event: PointerEvent): void => {
      if (surfaceRef.current?.contains(event.target as Node)) return
      close()
    }
    const onSelectionChange = (): void => {
      if (window.getSelection()?.isCollapsed !== false) close()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    const onViewportMove = (): void => { close() }

    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('selectionchange', onSelectionChange)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('scroll', onViewportMove, { capture: true, passive: true })
    window.addEventListener('resize', onViewportMove)
    return () => {
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('scroll', onViewportMove, true)
      window.removeEventListener('resize', onViewportMove)
    }
  }, [close])

  useEffect(() => { close() }, [close, currentSessionId])

  const preserveSelection = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    event.preventDefault()
  }

  const onCopy = (): void => {
    if (open === null) return
    const text = open.selection.text
    close()
    void copy(text).then(
      (accepted) => { showToast(t(accepted ? 'status.copied' : 'error.copy')) },
      () => { showToast(t('error.copy')) },
    )
  }

  const onAsk = (): void => {
    if (open === null || currentWorkspaceId === undefined) return
    const draft = `${t('prompt.ask')}\n\n${quoteSelection(open.selection.text)}`
    close()
    void askInNewConversation(currentWorkspaceId, draft).then(
      () => { showToast(t('status.newConversation')) },
      () => { showToast(t('error.action')) },
    )
  }

  const onAppend = (): void => {
    if (open === null || currentSessionId === undefined || !appendAvailable) return
    const text = open.selection.text
    close()
    try {
      appendToCurrent(currentSessionId, text)
      showToast(t('status.added'))
    } catch {
      showToast(t('error.action'))
    }
  }

  const onRestart = (): void => {
    if (restartDesktop === undefined) return
    close()
    void restartDesktop().catch(() => { showToast(t('error.restart')) })
  }

  const toolbarAction = (label: string, icon: ReactNode, onClick: () => void) => (
    <Tooltip label={label} side="top" delayMs={350}>
      <button type="button" className={css.action} aria-label={label} onPointerDown={preserveSelection} onClick={onClick}>
        {icon}
      </button>
    </Tooltip>
  )

  const menuAction = (label: string, icon: ReactNode, onClick: () => void) => (
    <button type="button" role="menuitem" className={css.action} onPointerDown={preserveSelection} onClick={onClick}>
      {icon}<span>{label}</span>
    </button>
  )

  return (
    <>
      {open !== null ? (
        <div
          ref={surfaceRef}
          className={`${css.surface} ${open.mode === 'toolbar' ? css.toolbar : css.menu} ${position === null ? css.measuring : ''}`}
          style={position === null ? undefined : position}
          role={open.mode === 'toolbar' ? 'toolbar' : 'menu'}
          aria-label={t(open.mode === 'toolbar' ? 'toolbar.aria' : 'menu.aria')}
          data-selection-actions={open.mode}
        >
          {open.mode === 'toolbar' ? (
            <>
              {toolbarAction(t('action.copy'), <IconCopyOutline16 />, onCopy)}
              {currentWorkspaceId !== undefined
                ? toolbarAction(t('action.ask'), <IconNewChatOutline16 />, onAsk)
                : null}
              {appendAvailable
                ? toolbarAction(t('action.append'), <IconPlusOutline16 />, onAppend)
                : null}
            </>
          ) : (
            <>
              {menuAction(t('action.copy'), <IconCopyOutline16 />, onCopy)}
              {currentWorkspaceId !== undefined
                ? menuAction(t('action.ask'), <IconNewChatOutline16 />, onAsk)
                : null}
              {appendAvailable
                ? menuAction(t('action.append'), <IconPlusOutline16 />, onAppend)
                : null}
              {restartDesktop !== undefined ? (
                <>
                  <div className={css.separator} role="separator" />
                  {menuAction(t('action.restart'), <IconRefreshOutline16 />, onRestart)}
                </>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      {toast !== null ? (
        <Toast key={toast.seq} text={toast.text} onDone={() => { setToast(null) }} />
      ) : null}
    </>
  )
}
