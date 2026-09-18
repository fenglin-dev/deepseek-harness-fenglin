/** Settings page for finding and restoring archived Sessions. */

import { useMemo, useState, type ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { Button, IconFolderClose16, IconSearchOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './ArchivedSessionsSection.module.css'

/** Registration-side face used by the page and its Settings-header action. */
export interface ArchivedSessionsSectionInjected {
  /** Remove one Session from the Host archive set. */
  unarchive: (sessionId: SessionId) => Promise<void>
}

/** Full component props assembled by the Settings slot renderer. */
export type ArchivedSessionsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.archivedSessions'>
  & InjectFace<ArchivedSessionsSectionInjected>

interface ArchivedRow {
  readonly id: SessionId
  readonly title: string
  readonly updatedAt?: number
}

interface ArchivedGroup {
  readonly id: string
  readonly title: string
  readonly rows: readonly ArchivedRow[]
}

const ALL_WORKSPACES = '__all__'
const UNGROUPED_WORKSPACE = '__ungrouped__'

/** Render archived Sessions grouped by their retained Workspace positions. */
export function ArchivedSessionsSection({
  unarchive, useSessions, useWorkspaces, t,
}: ArchivedSessionsSectionProps): ReactNode {
  const sessions = useSessions(value => value)
  const workspaces = useWorkspaces(value => value)
  const [query, setQuery] = useState('')
  const [workspaceFilter, setWorkspaceFilter] = useState(ALL_WORKSPACES)
  const [busy, setBusy] = useState<SessionId | null>(null)
  const [error, setError] = useState<string | null>(null)

  const groups = useMemo<readonly ArchivedGroup[]>(() => {
    const normalized = query.trim().toLocaleLowerCase()
    const rowsByWorkspace = new Map<string, ArchivedRow[]>()
    for (const id of workspaces.archivedSessionIds) {
      const summary = sessions.byId[id]
      if (summary === undefined) continue
      const title = summary.displayTitle
      const owner = workspaces.items.find(workspace => workspace.sessionIds.includes(id))
      if (normalized !== ''
        && !title.toLocaleLowerCase().includes(normalized)
        && !String(id).toLocaleLowerCase().includes(normalized)
        && !owner?.title.toLocaleLowerCase().includes(normalized)) continue
      const ownerId = owner === undefined ? UNGROUPED_WORKSPACE : String(owner.workspaceId)
      if (workspaceFilter !== ALL_WORKSPACES && workspaceFilter !== ownerId) continue
      const rows = rowsByWorkspace.get(ownerId) ?? []
      rows.push({ id, title, updatedAt: summary.updatedAt })
      rowsByWorkspace.set(ownerId, rows)
    }
    const projected: ArchivedGroup[] = []
    for (const workspace of workspaces.items) {
      const rows = rowsByWorkspace.get(String(workspace.workspaceId))
      if (rows === undefined) continue
      projected.push({ id: String(workspace.workspaceId), title: workspace.title, rows: [...rows].sort(compareRows) })
    }
    const ungrouped = rowsByWorkspace.get(UNGROUPED_WORKSPACE)
    if (ungrouped !== undefined) {
      projected.push({ id: UNGROUPED_WORKSPACE, title: t('ungrouped'), rows: [...ungrouped].sort(compareRows) })
    }
    return projected
  }, [query, sessions.byId, t, workspaceFilter, workspaces.archivedSessionIds, workspaces.items])

  const restore = async (sessionId: SessionId): Promise<void> => {
    if (busy !== null) return
    setBusy(sessionId)
    setError(null)
    try {
      await unarchive(sessionId)
    } catch (error) {
      console.warn('session unarchive rejected:', error)
      setError(t('restoreFailed'))
    } finally {
      setBusy(null)
    }
  }
  const loading = sessions.phase !== 'ready' || workspaces.phase !== 'ready'
  const archivedCount = workspaces.archivedSessionIds.length
  return (
    <section className={css.section}>
      <header className={css.intro}>
        <div>
          <h2>{t('title')}</h2>
          <p>{t('description')}</p>
        </div>
      </header>

      {!loading && <div className={css.toolbar}>
        <label className={css.search}>
          <IconSearchOutline16 aria-hidden="true" />
          <span className={css.visuallyHidden}>{t('searchAria')}</span>
          <input type="search" aria-label={t('search')} value={query} placeholder={t('search')} onChange={(event) => { setQuery(event.currentTarget.value) }} />
        </label>
        <label className={css.filter}>
          <span className={css.visuallyHidden}>{t('workspaceFilter')}</span>
          <select value={workspaceFilter} onChange={(event) => { setWorkspaceFilter(event.currentTarget.value) }}>
            <option value={ALL_WORKSPACES}>{t('allWorkspaces')}</option>
            {workspaces.items.map(workspace => (
              <option key={workspace.workspaceId} value={workspace.workspaceId}>{workspace.title}</option>
            ))}
            <option value={UNGROUPED_WORKSPACE}>{t('ungrouped')}</option>
          </select>
        </label>
      </div>}

      {error !== null && <p className={css.error} role="alert">{error}</p>}
      {loading
        ? <p className={css.empty} role="status">{t('loading')}</p>
        : groups.length === 0
          ? (
            <div className={css.empty} role="status">
              <strong>{archivedCount === 0 ? t('emptyTitle') : t('noMatchesTitle')}</strong>
              <span>{archivedCount === 0 ? t('emptyDescription') : t('noMatchesDescription')}</span>
            </div>
          )
          : (
            <div className={css.groups}>
              {groups.map(group => (
                <section key={group.id} className={css.group} aria-labelledby={`archive-group-${group.id}`}>
                  <div className={css.groupHeader}>
                    <span className={css.groupTitle} id={`archive-group-${group.id}`}>
                      <IconFolderClose16 size={16} />
                      {group.title}
                    </span>
                    <span>{t(group.rows.length === 1 ? 'countOne' : 'countOther', { n: group.rows.length })}</span>
                  </div>
                  <ul className={css.list}>
                    {group.rows.map(row => (
                      <li key={row.id} className={css.row}>
                        <div className={css.rowText}>
                          <strong>{row.title}</strong>
                          <span>{group.title} · {formatActivity(row.updatedAt, t)}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`${t('unarchive')} ${row.title}`}
                          disabled={busy !== null}
                          onClick={() => { void restore(row.id) }}
                        >
                          {busy === row.id ? t('restoring') : t('unarchive')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
    </section>
  )
}

function compareRows(left: ArchivedRow, right: ArchivedRow): number {
  return (right.updatedAt ?? 0) - (left.updatedAt ?? 0)
}

function formatActivity(updatedAt: number | undefined, t: ArchivedSessionsSectionProps['t']): string {
  if (updatedAt === undefined) return t('dateUnknown')
  const days = Math.floor(Math.max(0, Date.now() - updatedAt) / 86_400_000)
  if (days === 0) return 'now'
  return `${days}d`
}
