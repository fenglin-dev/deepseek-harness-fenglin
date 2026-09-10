/** Desktop-owned process inventory rendered without exposing PIDs or commands. */
import { useEffect, useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { DesktopPersistentServiceSummary, DesktopProcessesBridge, DesktopProcessSnapshot } from './bridge.ts'
import css from './DesktopShell.module.css'

export function ManagedProcessesRow({ bridge, openLog, t }: {
  bridge: DesktopProcessesBridge
  openLog: () => Promise<unknown>
  t: PropsLocale<'desktop-shell'>['t']
}) {
  const [processes, setProcesses] = useState<readonly DesktopProcessSnapshot[]>([])
  const [persistent, setPersistent] = useState<readonly DesktopPersistentServiceSummary[]>([])
  const [error, setError] = useState<string>()
  const [stopping, setStopping] = useState<string>()
  const elapsed = (startedAt: string): string => {
    const started = Date.parse(startedAt)
    if (!Number.isFinite(started) || startedAt === '') return t('processes.elapsed.unknown')
    const seconds = Math.max(0, Math.floor((Date.now() - started) / 1_000))
    if (seconds < 60) return t('processes.elapsed.seconds', { count: seconds })
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return t('processes.elapsed.minutes', { count: minutes })
    return t('processes.elapsed.hours', { count: Math.floor(minutes / 60) })
  }
  useEffect(() => {
    let active = true
    const refresh = (): void => {
      void Promise.all([bridge.list(), bridge.persistentServices()]).then(([processValue, persistentValue]) => {
        if (active) { setProcesses(processValue); setPersistent(persistentValue); setError(undefined) }
      }, (reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : t('processes.error'))
      })
    }
    refresh()
    const timer = window.setInterval(refresh, 2_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [bridge, t])
  return (
    <div className={css.processSection}>
      <div className={css.row}>
        <div className={css.text}>
          <div className={css.title}>{t('processes.title')}</div>
          <div className={css.description}>{t('processes.description', { count: processes.length })}</div>
          {error !== undefined && <div className={css.error}>{error}</div>}
        </div>
        <Button variant="outline" onClick={() => { void openLog() }}>{t('processes.logs')}</Button>
      </div>
      {processes.map(process => (
        <div key={process.id} className={css.processItem}>
          <div className={css.text}>
            <div className={css.title}>{process.plugin ?? process.label}</div>
            <div className={css.description}>
              {t(`processes.lifecycle.${process.lifecycle}`)} · {t(`processes.phase.${process.phase}`)} · {elapsed(process.startedAt)} · {process.containment}
            </div>
          </div>
          {process.stoppable && (
            <Button
              variant="outline"
              disabled={stopping === process.id}
              onClick={() => {
                setStopping(process.id)
                void bridge.stop(process.id).then(setProcesses, (reason: unknown) => {
                  setError(reason instanceof Error ? reason.message : t('processes.error'))
                }).finally(() => { setStopping(undefined) })
              }}
            >
              {t(stopping === process.id ? 'processes.stopping' : 'processes.stop')}
            </Button>
          )}
        </div>
      ))}
      {persistent.length > 0 && (
        <div className={css.processSection}>
          <div className={css.title}>{t('processes.persistent.title')}</div>
          <div className={css.description}>{t('processes.persistent.description')}</div>
          {persistent.map(service => (
            <div key={service.key} className={css.processItem}>
              <div className={css.text}>
                <div className={css.title}>{service.pluginName} · {service.serviceId}</div>
                <div className={css.description}>{service.pluginVersion} · {service.purpose}</div>
                <div className={css.description}>{t(`processes.persistent.${service.status}`)}</div>
              </div>
              <div className={css.actions}>
                {service.status === 'pending' && (
                  <Button
                    variant="outline"
                    disabled={stopping === service.key}
                    onClick={() => {
                      setStopping(service.key)
                      void bridge.approvePersistentService(service.key).then(setPersistent, (reason: unknown) => {
                        setError(reason instanceof Error ? reason.message : t('processes.error'))
                      }).finally(() => { setStopping(undefined) })
                    }}
                  >
                    {t(stopping === service.key ? 'processes.persistent.approving' : 'processes.persistent.approve')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  disabled={stopping === service.key}
                  onClick={() => {
                    setStopping(service.key)
                    void bridge.revokePersistentService(service.key).then(setPersistent, (reason: unknown) => {
                      setError(reason instanceof Error ? reason.message : t('processes.error'))
                    }).finally(() => { setStopping(undefined) })
                  }}
                >
                  {t('processes.persistent.revoke')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
