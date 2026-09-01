import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { PluginInventorySnapshot } from '@deepseek-ai/dsh-api-remotes/client'
import type { PluginRepairNoticeRequest } from '@deepseek-ai/dsh-host-plugin-inventory/types'
import { Button, IconWarningOutline16, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './QuarantineNotice.module.css'

const POLL_INTERVAL_MS = 1_500

/** Host operations used by the global, one-shot quarantine notice. */
export interface QuarantineNoticeInjected {
  /** Read the durable repair notification and quarantine records. */
  list: () => Promise<PluginInventorySnapshot>
  /** Acknowledge only the retained notification, without changing quarantine state. */
  dismissDependencyHealth: (request: PluginRepairNoticeRequest) => Promise<boolean>
  /** Open the existing diagnostics settings section. */
  openDiagnostics: () => void
}

/** Props assembled for the root shell overlay. */
export type QuarantineNoticeProps =
  PropsRuntime<'shell.overlay'>
  & PropsLocale<'settings.pluginInventory'>
  & InjectFace<QuarantineNoticeInjected>

type Notice = {
  readonly fingerprint: string
  readonly records: PluginInventorySnapshot['dependencyHealth']['quarantined']
}

/** Return a stable notification only while a quarantine repair remains unacknowledged. */
export function quarantineNotice(snapshot: PluginInventorySnapshot): Notice | null {
  if (snapshot.dependencyHealth.lastRepair?.status !== 'quarantined') return null
  const records = snapshot.dependencyHealth.quarantined
  if (records.length === 0) return null
  return {
    fingerprint: records.map(record => record.quarantineId).sort().join('\n'),
    records,
  }
}

/**
 * Notify users when a guarded install or a restart-time Loader recovery quarantines a plugin.
 * The Host report is durable, so the same component covers an immediate repair and the first
 * healthy render after an automatic restart without inventing a second notification store.
 */
export function QuarantineNotice({
  list,
  dismissDependencyHealth,
  openDiagnostics,
  t,
}: QuarantineNoticeProps): ReactNode {
  const [notice, setNotice] = useState<Notice | null>(null)
  const [actionError, setActionError] = useState(false)
  const acknowledged = useRef<string | null>(null)

  const refresh = useCallback(() => {
    if (document.visibilityState === 'hidden') return
    void list().then((snapshot) => {
      const next = quarantineNotice(snapshot)
      if (next === null) {
        setNotice(null)
        return
      }
      if (acknowledged.current !== next.fingerprint) setNotice(next)
    }).catch(() => {
      // The diagnostics page owns connection errors. A background notice must stay quiet.
    })
  }, [list])

  useEffect(() => {
    refresh()
    const timer = window.setInterval(refresh, POLL_INTERVAL_MS)
    const onVisible = (): void => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  const acknowledge = (after?: () => void): void => {
    if (notice === null) return
    const current = notice
    acknowledged.current = current.fingerprint
    setNotice(null)
    setActionError(false)
    after?.()
    void dismissDependencyHealth({ profile: 'web' }).catch(() => {
      acknowledged.current = null
      setNotice(current)
      setActionError(true)
    })
  }

  return (
    <Modal
      open={notice !== null}
      onClose={() => { acknowledge() }}
      closeLabel={t('quarantineNotice.dismiss')}
      title={t('quarantineNotice.title')}
      description={t('quarantineNotice.description')}
      className={css.dialog ?? ''}
      footer={(
        <div className={css.actions}>
          <Button variant="outline" onClick={() => { acknowledge() }}>
            {t('quarantineNotice.dismiss')}
          </Button>
          <Button variant="primary" onClick={() => { acknowledge(openDiagnostics) }}>
            {t('quarantineNotice.openDiagnostics')}
          </Button>
        </div>
      )}
    >
      <div className={css.body} role="status">
        <span className={css.icon} aria-hidden="true"><IconWarningOutline16 size={18} /></span>
        <div>
          <strong>{t('quarantineNotice.count').replace('{count}', String(notice?.records.length ?? 0))}</strong>
          <ul>
            {notice?.records.map(record => (
              <li key={record.quarantineId}>
                <code>{record.packageName}</code>
                <span>{t(`health.quarantine.analysis.${record.reason}`)}</span>
              </li>
            ))}
          </ul>
          <p>{t('quarantineNotice.safe')}</p>
          {actionError ? <p className={css.error} role="alert">{t('quarantineNotice.dismissFailed')}</p> : null}
        </div>
      </div>
    </Modal>
  )
}
