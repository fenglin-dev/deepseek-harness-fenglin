import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { IconDownloadOutline16, IconEllipsisOutline16, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConversationHeaderMenuContribution } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { SessionLogDownloadDialog, type SessionLogDownloadDialogProps } from './Dialog.tsx'
import css from './HeaderAction.module.css'

type SessionLogDownloadHeaderActionProps = SessionLogDownloadDialogProps
  & PropsRenderSlots<'conversation.session.header.menu.item'>

type RegisteredMenuContribution = ConversationHeaderMenuContribution & { readonly token: symbol }

const RESERVED_MENU_IDS = new Set(['download', 'extension-separator'])

/**
 * Render the Session Header more-actions icon button, its download menu, and the shared result dialog.
 * @param props - Session runtime, download controller, and localized copy.
 * @returns the persistent Header action and Session-scoped dialog.
 */
export function SessionLogDownloadHeaderAction(props: SessionLogDownloadHeaderActionProps): ReactNode {
  const { sessionId, useSessionLogDownload, request, renderSlot, t } = props
  const entry = useSessionLogDownload(state => state.bySession[String(sessionId)])
  const busy = entry?.status === 'downloading'
  const [open, setOpen] = useState(false)
  const [menuContributions, setMenuContributions] = useState<ReadonlyMap<string, RegisteredMenuContribution>>(new Map())

  const registerMenuItem = useCallback((contribution: ConversationHeaderMenuContribution): (() => void) => {
    const ids = [contribution.item.id, ...(contribution.item.submenu?.map(item => item.id) ?? [])]
    if (contribution.item.id !== contribution.id
      || new Set(ids).size !== ids.length
      || ids.some(id => RESERVED_MENU_IDS.has(id))) return () => {}
    const token = Symbol(contribution.id)
    setMenuContributions(current => new Map(current).set(contribution.id, { ...contribution, token }))
    return () => {
      setMenuContributions((current) => {
        if (current.get(contribution.id)?.token !== token) return current
        const next = new Map(current)
        next.delete(contribution.id)
        return next
      })
    }
  }, [])

  const extensions = useMemo(() => [...menuContributions.values()].sort((left, right) => (
    (left.order ?? 0) - (right.order ?? 0) || left.id.localeCompare(right.id)
  )), [menuContributions])

  return (
    <>
      <Menu
        open={open}
        align="end"
        dense
        onClose={() => { setOpen(false) }}
        items={[
          { id: 'download', label: t('menu.download'), icon: <IconDownloadOutline16 />, disabled: busy },
          ...(extensions.length === 0 ? [] : [
            { type: 'separator' as const, id: 'extension-separator' },
            ...extensions.map(extension => extension.item),
          ]),
        ]}
        onSelect={(id) => {
          setOpen(false)
          if (id === 'download') {
            void request(sessionId)
            return
          }
          const matches = extensions.filter(candidate => (
            candidate.item.id === id || candidate.item.submenu?.some(item => item.id === id) === true
          ))
          if (matches.length === 1) matches[0]?.onSelect(id)
        }}
        anchor={(
          <button
            type="button"
            className={css.moreButton}
            aria-label={t('header.more')}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-busy={busy}
            onClick={() => { setOpen(value => !value) }}
          >
            <IconEllipsisOutline16 />
          </button>
        )}
      />
      {renderSlot('conversation.session.header.menu.item', { registerMenuItem })}
      <SessionLogDownloadDialog {...props} />
    </>
  )
}
