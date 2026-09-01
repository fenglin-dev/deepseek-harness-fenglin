/** Session-level copy, clear, and removal controls for the conversation Header. */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { ConversationNode, PartialAssistant } from '../contract/records.ts'
import type { ConversationSnapshot } from '../contract/snapshot.ts'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  Button, IconCheckOutline16, IconCopyOutline16, IconEllipsisOutline16,
  IconRefreshOutline16, IconTrashOutline16, Menu, Modal, Tooltip, writeClipboard,
} from '@deepseek-ai/dsh-client-ui-primitives'
import css from './SessionActions.module.css'

/** Session-scoped operations supplied by the conversation plugin. */
export interface SessionActionsInjected {
  /** Hide the current Session while retaining its durable log. */
  archive: () => Promise<void>
  /** Hide the current Session and open a blank Session in the same Workspace when possible. */
  clearAndRestart: () => Promise<void>
  /** Current Workspace identity retained before the Session is archived. */
  workspaceId?: WorkspaceId | undefined
}

type SessionActionsProps = SessionActionsInjected
  & PropsLocale<'conversation'>
  & PropsRuntime<'conversation.session.header.utilities'>

type ConfirmAction = 'clear' | 'remove'

type UserContent = Extract<ConversationNode, { kind: 'user' }>['content']

function contentText(content: UserContent): string {
  const parts: string[] = []
  for (const block of content) {
    switch (block.type) {
      case 'text': parts.push(block.text); break
      case 'image': parts.push('[Image]'); break
      case 'tool-call': parts.push(`[Tool: ${block.name}]`); break
      case 'tool-result': parts.push(contentText(block.content)); break
      case 'reasoning': break
      default: parts.push('[Content]')
    }
  }
  return parts.filter(Boolean).join('\n')
}

/**
 * Convert the loaded visible message window to a portable plain-text transcript.
 * @param snapshot - current Session projection.
 * @param labels - localized speaker labels.
 * @returns user and assistant messages in durable event order.
 */
export function conversationTranscript(
  snapshot: ConversationSnapshot,
  labels: { readonly user: string; readonly assistant: string },
): string {
  const chat = (snapshot.views as { get(target: string): unknown }).get('chat') as {
    legacy?: { nodes?: readonly ConversationNode[]; partial?: PartialAssistant | null }
  } | undefined
  const lines: string[] = []
  for (const node of chat?.legacy?.nodes ?? []) {
    if (node.kind === 'user' || node.kind === 'steering') {
      const text = contentText(node.content).trim()
      if (text !== '') lines.push(`${labels.user}:\n${text}`)
    } else if (node.kind === 'assistant') {
      const text = node.blocks.flatMap((block) => {
        if (block.kind === 'text') return [block.text]
        if (block.kind === 'image') return ['[Image]']
        if (block.kind === 'tool-call') return [`[Tool: ${block.name}]`]
        return []
      }).join('\n').trim()
      if (text !== '') lines.push(`${labels.assistant}:\n${text}`)
    }
  }
  const partial = chat?.legacy?.partial
  if (partial !== undefined && partial !== null) {
    const text = partial.blocks.flatMap((block) => {
      if (block.kind === 'text') return [block.text]
      if (block.kind === 'image') return ['[Image]']
      if (block.kind === 'tool-call') return [`[Tool: ${block.name}]`]
      return []
    }).join('\n').trim()
    if (text !== '') lines.push(`${labels.assistant}:\n${text}`)
  }
  return lines.join('\n\n')
}

/**
 * Render Session utility controls and confirmation dialogs.
 * @param props - standard Session hooks, localized copy, and persistence operations.
 * @returns Header actions and the active confirmation dialog.
 */
export function SessionActions({
  useConversation, useSession, archive, clearAndRestart, workspaceId, t,
}: SessionActionsProps): ReactNode {
  const snapshot = useConversation(value => value)
  const running = useSession(value => value.running)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmation, setConfirmation] = useState<ConfirmAction | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const copyPending = useRef(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyEpoch = useRef(0)
  const transcript = useMemo(() => conversationTranscript(snapshot, {
    user: t('session.actions.speaker.user'),
    assistant: t('session.actions.speaker.assistant'),
  }), [snapshot, t])

  useEffect(() => () => {
    copyEpoch.current += 1
    copyPending.current = false
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
  }, [])

  const copy = (): void => {
    if (transcript === '' || copied || copyPending.current) return
    const epoch = copyEpoch.current
    copyPending.current = true
    void writeClipboard(transcript).then((ok) => {
      if (epoch !== copyEpoch.current) return
      copyPending.current = false
      if (!ok) return
      setCopied(true)
      copyTimer.current = window.setTimeout(() => {
        copyTimer.current = null
        setCopied(false)
      }, 1_000)
    })
  }

  const confirm = (): void => {
    if (confirmation === null || busy) return
    setBusy(true)
    setError(null)
    const operation = confirmation === 'clear' ? clearAndRestart : archive
    void operation().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason))
      setBusy(false)
    })
  }

  const close = (): void => {
    if (busy) return
    setConfirmation(null)
    setError(null)
  }

  return (
    <>
      <Tooltip label={copied ? t('copied') : t('session.actions.copy')} side="bottom">
        <button
          type="button"
          className={css.iconButton}
          aria-label={copied ? t('copied') : t('session.actions.copy')}
          disabled={transcript === ''}
          onClick={copy}
        >
          {copied ? <IconCheckOutline16 /> : <IconCopyOutline16 />}
        </button>
      </Tooltip>
      <Menu
        open={menuOpen}
        align="end"
        portal
        anchor={(
          <Tooltip label={t('session.actions.more')} side="bottom">
            <button
              type="button"
              className={css.iconButton}
              aria-label={t('session.actions.more')}
              aria-expanded={menuOpen}
              onClick={() => { setMenuOpen(open => !open) }}
            >
              <IconEllipsisOutline16 />
            </button>
          </Tooltip>
        )}
        items={[
          {
            id: 'clear',
            label: t('session.actions.clear'),
            icon: <IconRefreshOutline16 />,
            disabled: running,
          },
          { type: 'separator', id: 'danger-separator' },
          {
            id: 'remove',
            label: t('session.actions.remove'),
            icon: <IconTrashOutline16 />,
            danger: true,
            disabled: running,
          },
        ]}
        onSelect={(id) => {
          setMenuOpen(false)
          setConfirmation(id === 'clear' ? 'clear' : 'remove')
        }}
        onClose={() => { setMenuOpen(false) }}
      />
      <Modal
        open={confirmation !== null}
        onClose={close}
        closeLabel={t('session.actions.cancel')}
        title={confirmation === 'clear'
          ? t('session.actions.clear.title')
          : t('session.actions.remove.title')}
        description={confirmation === 'clear'
          ? t(workspaceId === undefined
            ? 'session.actions.clear.description.noWorkspace'
            : 'session.actions.clear.description')
          : t('session.actions.remove.description')}
        footer={(
          <>
            <Button variant="outline" disabled={busy} onClick={close}>
              {t('session.actions.cancel')}
            </Button>
            <Button
              variant="outline"
              className={confirmation === 'remove' ? css.dangerAction : undefined}
              disabled={busy}
              onClick={confirm}
            >
              {busy
                ? t('session.actions.working')
                : confirmation === 'clear'
                  ? t('session.actions.clear.confirm')
                  : t('session.actions.remove.confirm')}
            </Button>
          </>
        )}
      >
        {error !== null && <div className={css.error} role="alert">{error}</div>}
      </Modal>
    </>
  )
}
