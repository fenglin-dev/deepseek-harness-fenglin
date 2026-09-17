/** Desktop-owned NAS runtime settings page. */

import { useEffect, useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { DesktopNasBridge, NasDeviceSummary, NasDiscoveryCandidate, NasRuntimeStatus } from './bridge.ts'
import css from './NasRuntimeSection.module.css'

export type NasRuntimeSectionProps = PropsRuntime<'settings.section'>
  & PropsLocale<'desktop-shell'>
  & { readonly bridge: DesktopNasBridge }

export function NasRuntimeSection({ bridge, t }: NasRuntimeSectionProps) {
  const [status, setStatus] = useState<NasRuntimeStatus>()
  const [baseUrl, setBaseUrl] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [code, setCode] = useState('')
  const [fingerprint, setFingerprint] = useState<string>()
  const [trusted, setTrusted] = useState(false)
  const [busy, setBusy] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [devices, setDevices] = useState<Readonly<Record<string, readonly NasDeviceSummary[]>>>({})
  const [discovered, setDiscovered] = useState<readonly NasDiscoveryCandidate[]>([])

  useEffect(() => {
    let live = true
    void bridge.get().then((value) => { if (live) setStatus(value) }, (error: unknown) => {
      if (live) setMessage(error instanceof Error ? error.message : String(error))
    })
    const dispose = bridge.onStatus((value) => { if (live) setStatus(value) })
    return () => { live = false; dispose() }
  }, [bridge])

  const inspect = async (): Promise<void> => {
    setBusy('inspect'); setMessage(undefined); setTrusted(false); setFingerprint(undefined)
    try { setFingerprint((await bridge.inspect(baseUrl)).fingerprint) } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally { setBusy(undefined) }
  }
  const discover = async (): Promise<void> => {
    setBusy('discover'); setMessage(undefined)
    try {
      const candidates = await bridge.discover()
      setDiscovered(candidates)
      if (candidates.length === 0) setMessage(t('nas.discovery.empty'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally { setBusy(undefined) }
  }
  const pair = async (): Promise<void> => {
    if (fingerprint === undefined || !trusted) return
    setBusy('pair'); setMessage(undefined)
    try {
      setStatus(await bridge.pair({ baseUrl, code, deviceName, certificateFingerprint: fingerprint }))
      setCode(''); setFingerprint(undefined); setTrusted(false)
      setMessage(t('nas.paired'))
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)) } finally { setBusy(undefined) }
  }
  const select = async (serverId?: string): Promise<void> => {
    setBusy(serverId ?? 'local'); setMessage(undefined)
    try { await bridge.select(serverId === undefined ? { kind: 'local' } : { kind: 'nas', serverId }) } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error)); setBusy(undefined)
    }
  }
  const test = async (serverId: string): Promise<void> => {
    setBusy(`test:${serverId}`); setMessage(undefined)
    try {
      const result = await bridge.test(serverId)
      setMessage(t('nas.test.success', { version: result.version }))
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)) } finally { setBusy(undefined) }
  }
  const remove = async (serverId: string): Promise<void> => {
    setBusy(`remove:${serverId}`); setMessage(undefined)
    try { setStatus(await bridge.remove(serverId)) } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally { setBusy(undefined) }
  }
  const loadDevices = async (serverId: string): Promise<void> => {
    setBusy(`devices:${serverId}`); setMessage(undefined)
    try {
      const next = await bridge.devices(serverId)
      setDevices(current => ({ ...current, [serverId]: next }))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally { setBusy(undefined) }
  }
  const revokeDevice = async (serverId: string, deviceId: string): Promise<void> => {
    setBusy(`revoke:${deviceId}`); setMessage(undefined)
    try {
      const next = await bridge.revokeDevice(serverId, deviceId)
      setDevices(current => ({ ...current, [serverId]: next }))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally { setBusy(undefined) }
  }

  return (
    <section className={css.page}>
      <header>
        <div className={css.titleRow}>
          <h2>{t('nas.title')}</h2>
          <span className={css.experimentalBadge}>{t('nas.experimental')}</span>
        </div>
        <p>{t('nas.description')}</p>
      </header>
      <div className={css.betaNotice}>{t('nas.experimentalNotice')}</div>
      {status?.secureStorageAvailable === false && <div className={css.warning}>{t('nas.secureStorageUnavailable')}</div>}
      {message !== undefined && <div className={css.message}>{message}</div>}

      <div className={css.card}>
        <div className={css.cardHeader}>
          <div><strong>{t('nas.local.title')}</strong><p>{t('nas.local.description')}</p></div>
          <span className={css.badge}>{status?.selection.kind === 'local' ? t('nas.current') : t('nas.available')}</span>
        </div>
        {status?.selection.kind !== 'local' && (
          <Button variant="outline" disabled={busy !== undefined} onClick={() => { void select() }}>{t('nas.useLocal')}</Button>
        )}
      </div>

      {status?.servers.map(server => (
        <div className={css.card} key={server.id}>
          <div className={css.cardHeader}>
            <div><strong>{server.name}</strong><p className={css.mono}>{server.baseUrl}</p></div>
            <span className={css.badge}>{status.selection.kind === 'nas' && status.selection.serverId === server.id ? t('nas.selected') : t('nas.saved')}</span>
          </div>
          {server.certificateFingerprint !== undefined && <p className={css.fingerprint}>{t('nas.fingerprint')}: {server.certificateFingerprint}</p>}
          <div className={css.actions}>
            <Button variant="outline" disabled={busy !== undefined} onClick={() => { void test(server.id) }}>{t('nas.test')}</Button>
            <Button variant="outline" disabled={busy !== undefined} onClick={() => { void loadDevices(server.id) }}>{t('nas.devices')}</Button>
            <Button disabled={busy !== undefined} onClick={() => { void select(server.id) }}>{t('nas.connect')}</Button>
            <Button variant="outline" disabled={busy !== undefined || status.selection.kind === 'nas' && status.selection.serverId === server.id} onClick={() => { void remove(server.id) }}>{t('nas.remove')}</Button>
          </div>
          {devices[server.id] !== undefined && <div className={css.devices}>
            <strong>{t('nas.devices.title')}</strong>
            {devices[server.id]?.map(device => <div className={css.device} key={device.id}>
              <span>{device.name}<small>{t('nas.devices.expires', { date: new Date(device.expiresAt).toLocaleDateString() })}</small></span>
              <Button variant="outline" disabled={busy !== undefined} onClick={() => { void revokeDevice(server.id, device.id) }}>{t('nas.devices.revoke')}</Button>
            </div>)}
            {devices[server.id]?.length === 0 && <p>{t('nas.devices.empty')}</p>}
          </div>}
        </div>
      ))}

      <div className={css.card}>
        <h3>{t('nas.add.title')}</h3>
        <p>{t('nas.add.description')}</p>
        <div className={css.actions}>
          <Button variant="outline" disabled={busy !== undefined} onClick={() => { void discover() }}>
            {busy === 'discover' ? t('nas.discovery.searching') : t('nas.discovery.search')}
          </Button>
        </div>
        {discovered.length > 0 && <div className={css.devices}>
          <strong>{t('nas.discovery.title')}</strong>
          {discovered.map(candidate => <button className={css.discovery} type="button" key={candidate.baseUrl} onClick={() => {
            setBaseUrl(candidate.baseUrl); setFingerprint(undefined); setTrusted(false)
          }}><span>{candidate.name}</span><code>{candidate.baseUrl}</code></button>)}
          <p>{t('nas.discovery.untrusted')}</p>
        </div>}
        <label className={css.field}><span>{t('nas.address')}</span><input value={baseUrl} placeholder="https://harness.example.com" onChange={(event) => { setBaseUrl(event.target.value); setFingerprint(undefined); setTrusted(false) }} /></label>
        <label className={css.field}><span>{t('nas.deviceName')}</span><input value={deviceName} maxLength={80} onChange={(event) => { setDeviceName(event.target.value) }} /></label>
        <label className={css.field}><span>{t('nas.code')}</span><input value={code} inputMode="numeric" autoComplete="one-time-code" maxLength={9} onChange={(event) => { setCode(event.target.value) }} /></label>
        <div className={css.actions}><Button variant="outline" disabled={busy !== undefined || baseUrl === ''} onClick={() => { void inspect() }}>{busy === 'inspect' ? t('nas.inspecting') : t('nas.inspect')}</Button></div>
        {fingerprint !== undefined && (
          <div className={css.trust}>
            <p>{t('nas.confirmCertificate')}</p><code>{fingerprint}</code>
            <label><input type="checkbox" checked={trusted} onChange={(event) => { setTrusted(event.target.checked) }} /> {t('nas.trustCertificate')}</label>
            <Button disabled={!trusted || code === '' || deviceName.trim() === '' || busy !== undefined} onClick={() => { void pair() }}>{busy === 'pair' ? t('nas.pairing') : t('nas.pair')}</Button>
          </div>
        )}
      </div>
    </section>
  )
}
