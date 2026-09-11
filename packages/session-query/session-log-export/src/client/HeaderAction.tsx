import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { IconDownloadOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { SessionLogDownloadDialog, type SessionLogDownloadDialogProps } from './Dialog.tsx'

/**
 * Append Session export to the official Header actions menu and render its shared result dialog.
 * @param props - Session runtime, download controller, and localized copy.
 * @returns the persistent Header action and Session-scoped dialog.
 */
export function SessionLogDownloadHeaderAction(props: SessionLogDownloadDialogProps): ReactNode {
  const { sessionId, useSessionLogDownload, registerMenuItem, request, t } = props
  const entry = useSessionLogDownload(state => state.bySession[String(sessionId)])
  const busy = entry?.status === 'downloading'
  const requestRef = useRef(request)
  requestRef.current = request

  useEffect(() => registerMenuItem({
    id: 'session-log-download',
    order: 20,
    item: {
      id: 'session-log-download',
      label: t('menu.download'),
      icon: <IconDownloadOutline16 />,
      disabled: busy,
    },
    onSelect: (id) => {
      if (id === 'session-log-download') void requestRef.current(sessionId)
    },
  }), [busy, registerMenuItem, sessionId, t])

  return (
    <SessionLogDownloadDialog {...props} />
  )
}
