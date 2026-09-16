/** Settings-header action for restoring every archived Session. */

import { useState, type ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ArchivedSessionsSectionInjected } from './ArchivedSessionsSection.tsx'
import css from './ArchivedSessionsAction.module.css'

/** Header action props assembled by the Settings action slot. */
export type ArchivedSessionsActionProps =
  PropsRuntime<'settings.action'>
  & PropsLocale<'workspace'>
  & InjectFace<ArchivedSessionsSectionInjected>

/** Restore all archived Sessions while the archive settings page is active. */
export function ArchivedSessionsAction({
  activeSectionId, restoreSession, useWorkspaces, t,
}: ArchivedSessionsActionProps): ReactNode {
  const workspaces = useWorkspaces(value => value)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  if (activeSectionId !== 'archived-sessions') return null

  const restoreAll = async (): Promise<void> => {
    if (busy || workspaces.archivedSessionIds.length === 0) return
    setBusy(true)
    setFailed(false)
    try {
      for (const sessionId of workspaces.archivedSessionIds) await restoreSession(sessionId)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={css.action}>
      {failed && <span className={css.error} role="alert">{t('archive.restoreFailed')}</span>}
      <Button
        variant="outline"
        size="sm"
        disabled={busy || workspaces.archivedSessionIds.length === 0}
        onClick={() => { void restoreAll() }}
      >
        {busy ? t('archive.restoring') : t('archive.restoreAll')}
      </Button>
    </div>
  )
}
