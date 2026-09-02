import { useEffect, useState, type ReactNode } from 'react'
import { Button, RiskConfirmation } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PluginInventoryLocaleKey } from './locales.ts'
import type {
  PluginSnapshotRestoreSnapshot,
  PluginSnapshotSummary,
  PluginSnapshotsInjected,
} from './plugin-snapshot-bridge.ts'
import css from './PluginSnapshotPanel.module.css'

export interface PluginSnapshotPanelProps extends PluginSnapshotsInjected {
  readonly t: (key: PluginInventoryLocaleKey) => string
}

const TERMINAL = new Set<PluginSnapshotRestoreSnapshot['phase']>([
  'needs-network', 'succeeded', 'rolled-back', 'failed',
])

function summary(snapshot: PluginSnapshotSummary): string {
  const count = snapshot.difference.added.length + snapshot.difference.removed.length + snapshot.difference.changed.length
  return String(count)
}

function Difference({ snapshot, t }: {
  readonly snapshot: PluginSnapshotSummary
  readonly t: (key: PluginInventoryLocaleKey) => string
}): ReactNode {
  const rows = [
    snapshot.difference.removed.length === 0 ? null : {
      label: t('snapshots.restoreAdds'),
      value: snapshot.difference.removed.join(', '),
    },
    snapshot.difference.added.length === 0 ? null : {
      label: t('snapshots.restoreRemoves'),
      value: snapshot.difference.added.join(', '),
    },
    ...snapshot.difference.versionChanges.map(change => ({
      label: t(`snapshots.restore.${change.direction}`),
      value: `${change.name}${change.currentVersion === undefined || change.snapshotVersion === undefined
        ? ''
        : ` ${change.currentVersion} → ${change.snapshotVersion}`}`,
    })),
  ].filter(row => row !== null)
  if (rows.length === 0) return null
  return <ul className={css.difference}>{rows.map(row => (
    <li key={`${row.label}:${row.value}`}><b>{row.label}</b><span>{row.value}</span></li>
  ))}</ul>
}

/** Desktop-only controls for durable plugin-stack rollback points. */
export function PluginSnapshotPanel({ list, create, remove, startRestore, subscribe, t }: PluginSnapshotPanelProps): ReactNode {
  const [snapshots, setSnapshots] = useState<readonly PluginSnapshotSummary[]>([])
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restore, setRestore] = useState<PluginSnapshotSummary | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const [networkAllowed, setNetworkAllowed] = useState(false)
  const [operation, setOperation] = useState<PluginSnapshotRestoreSnapshot | null>(null)
  const [expanded, setExpanded] = useState(false)
  const availableSnapshots = snapshots.filter(snapshot => snapshot.kind !== 'safety')
  const visibleSnapshots = expanded ? availableSnapshots : availableSnapshots.slice(0, 3)

  const reload = (): void => {
    void list().then(setSnapshots, (reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason))
    })
  }

  useEffect(reload, [list])
  useEffect(() => subscribe((next) => {
    setOperation(next)
    if (TERMINAL.has(next.phase)) setBusy(false)
  }), [subscribe])

  const createManual = (): void => {
    setBusy(true)
    setError(null)
    void create(label.trim() === '' ? undefined : label).then(() => {
      setLabel('')
      reload()
    }, (reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason))
    }).finally(() => { setBusy(false) })
  }

  const confirmRestore = (): void => {
    if (restore === null) return
    setBusy(true)
    setError(null)
    void startRestore(restore.snapshotId, networkAllowed).then(setOperation, (reason: unknown) => {
      setBusy(false)
      setError(reason instanceof Error ? reason.message : String(reason))
    })
    setRestore(null)
    setAcknowledged(false)
  }

  return (
    <section className={css.panel}>
      <header>
        <div>
          <span className={css.eyebrow}>{t('snapshots.eyebrow')}</span>
          <h3>{t('snapshots.title')}</h3>
          <p>{t('snapshots.description')}</p>
        </div>
      </header>
      <div className={css.create}>
        <input
          value={label}
          maxLength={80}
          placeholder={t('snapshots.label')}
          aria-label={t('snapshots.label')}
          onChange={(event) => { setLabel(event.currentTarget.value) }}
        />
        <Button variant="outline" disabled={busy} onClick={createManual}>{t('snapshots.create')}</Button>
      </div>
      {availableSnapshots.length === 0 ? <p className={css.empty}>{t('snapshots.empty')}</p> : (
        <div className={css.list}>
          {visibleSnapshots.map(snapshot => (
            <article key={snapshot.snapshotId}>
              <div className={css.copy}>
                <strong>{snapshot.label ?? t(snapshot.kind === 'bootable' ? 'snapshots.bootable' : 'snapshots.automatic')}</strong>
                <span>{new Date(snapshot.createdAt).toLocaleString()} · {t('snapshots.difference')} {summary(snapshot)}</span>
                <span>{t(snapshot.offlineState === 'local-source-missing' ? 'snapshots.localMissing' : 'snapshots.offline')}</span>
                <Difference snapshot={snapshot} t={t} />
              </div>
              <div className={css.actions}>
                <Button variant="primary" disabled={busy} onClick={() => {
                  setRestore(snapshot)
                  setNetworkAllowed(false)
                }}>{t('snapshots.restore')}</Button>
                {snapshot.kind === 'bootable' ? null : <Button variant="outline" disabled={busy} onClick={() => {
                  setBusy(true)
                  void remove(snapshot.snapshotId).then(setSnapshots, (reason: unknown) => {
                    setError(reason instanceof Error ? reason.message : String(reason))
                  }).finally(() => { setBusy(false) })
                }}>{t('snapshots.remove')}</Button>}
              </div>
            </article>
          ))}
          {availableSnapshots.length <= 3 ? null : (
            <div className={css.listToggle}>
              <Button
                variant="outline"
                aria-expanded={expanded}
                onClick={() => { setExpanded(value => !value) }}
              >{t(expanded ? 'snapshots.collapse' : 'snapshots.expand')}</Button>
            </div>
          )}
        </div>
      )}
      {operation === null ? null : (
        <div className={css.status}>
          <p role={operation.phase === 'failed' ? 'alert' : 'status'}>
            {t(`snapshots.phase.${operation.phase}`)}
            {operation.message === undefined ? '' : ` · ${operation.message}`}
          </p>
          {operation.phase !== 'needs-network' ? null : (
            <Button variant="outline" onClick={() => {
              const selected = snapshots.find(snapshot => snapshot.snapshotId === operation.snapshotId)
              if (selected === undefined) return
              setNetworkAllowed(true)
              setRestore(selected)
            }}>{t('snapshots.networkRetry')}</Button>
          )}
        </div>
      )}
      {error === null ? null : <p role="alert" className={css.error}>{error}</p>}
      <RiskConfirmation
        open={restore !== null}
        closeLabel={t('snapshots.confirm.cancel')}
        title={t('snapshots.confirm.title')}
        description={t(networkAllowed ? 'snapshots.confirm.networkDescription' : 'snapshots.confirm.description')}
        acknowledgeLabel={t('snapshots.confirm.acknowledge')}
        cancelLabel={t('snapshots.confirm.cancel')}
        confirmLabel={t('snapshots.confirm.action')}
        acknowledged={acknowledged}
        disabled={busy}
        onAcknowledgedChange={setAcknowledged}
        onCancel={() => { setRestore(null); setAcknowledged(false) }}
        onConfirm={confirmRestore}
      />
    </section>
  )
}
