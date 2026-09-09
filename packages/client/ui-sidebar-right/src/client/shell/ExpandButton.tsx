/**
 * The way into a hidden panel: one button in the conversation header's corner
 * seat, shown only while the panel is collapsed.
 *
 * It lives in the conversation's own header rather than in the frame's right
 * column so that a collapsed Sidebar costs the conversation nothing — no rail,
 * no width, and the transcript's scrollbar stays at the column's edge. The
 * corner seat is its own, past the utilities' edge, so the button neither joins
 * the utilities row nor moves it: while the panel is shown this renders a
 * same-size placeholder, and the seat's width stays reserved. It shares the
 * panel's per-session store, which the slot runtime allows because both seats
 * are session-scoped.
 *
 * The glyph is the left sidebar's collapse icon mirrored: the same affordance,
 * on the other edge.
 */
import type { ReactNode } from 'react'
import { IconPanelLeftOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { createSidebarRightStore } from '../stores.ts'
import css from './ExpandButton.module.css'

/** The button's props: the header corner seat, the shared store, and copy. */
export type ExpandButtonProps =
  & PropsRuntime<'conversation.session.header.corner'>
  & PropsStore<ReturnType<typeof createSidebarRightStore>>
  & PropsLocale<'sidebarRight'>

/** The expand control while the panel is collapsed; its footprint while it is shown. */
export function ExpandButton({ sessionId, useStore, actions, t }: ExpandButtonProps): ReactNode {
  // A session with no surface yet is collapsed: the panel seat materializes the
  // surface on its own mount, and until then there is nothing expanded.
  const expanded = useStore(state => state.bySession[sessionId]?.layout.expanded ?? false)
  if (expanded) return <span className={css.placeholder} aria-hidden data-sidebar-right-expand-placeholder />
  return (
    <button
      type="button"
      className={css.button}
      aria-label={t('chrome.expand')}
      title={t('chrome.expand')}
      data-sidebar-right-expand
      onClick={() => { actions.setExpanded(sessionId, true) }}
    >
      <IconPanelLeftOutline16 className={css.icon} />
    </button>
  )
}
