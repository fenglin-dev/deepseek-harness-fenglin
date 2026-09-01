/** Cached, category-aware Plugin Market discovery for the new-session home screen. */
import { useCallback, useEffect, useRef, useState, type ReactNode, type UIEvent } from 'react'
import type { PluginInventorySnapshot } from '@deepseek-ai/dsh-api-remotes/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { PluginInstallId, PluginInstallRequest, PluginInstallSnapshot } from '@deepseek-ai/dsh-host-plugin-inventory/types'
import { Button, IconCordisPluginOutline14, IconRefreshOutline16, Modal, RiskConfirmation } from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import {
  buildPluginDiscoveryCatalog,
  PLUGIN_DISCOVERY_POPULAR,
  readPluginDiscoveryCache,
  selectPluginDiscoveryItems,
  writePluginDiscoveryCache,
  type MarketInstalledSnapshot,
  type MarketRegistrySnapshot,
  type PluginDiscoveryCatalog,
  type PreviewItem,
} from './plugin-discovery-preview.ts'
import css from './PluginDiscovery.module.css'

type ReadyState = {
  status: 'ready'
  catalog: PluginDiscoveryCatalog
  installed: MarketInstalledSnapshot | null
  stale: boolean
  refreshing: boolean
  refreshFailed: boolean
  installedFailed: boolean
  message?: string
}
type ViewState =
  | { status: 'idle' | 'loading' }
  | ReadyState
  | { status: 'missing' | 'outdated' | 'error'; message?: string; elapsedMs: number }

class MarketRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

export type PluginDiscoveryProps = PropsRuntime<'conversation.hero.pluginDiscovery'>
  & PropsLocale<'settings.pluginInventory'> & PluginDiscoveryInjected
export interface PluginDiscoveryInjected {
  list: () => Promise<PluginInventorySnapshot>
  startInstall: (request: PluginInstallRequest) => Promise<PluginInstallSnapshot>
  getInstall: (installId: PluginInstallId) => Promise<PluginInstallSnapshot>
  openSettings: (sectionId: string, subsectionId?: string) => void
}

const endpoint = (name: 'registry' | 'installed'): string => new URL(`dsh-market/${name}`, document.baseURI).pathname
const countFormatter = new Intl.NumberFormat()
const count = (value: number | null): string => value === null ? '—' : countFormatter.format(value)
const MIN_TRIGGER_LOADING_MS = 450
let registryInFlight: Promise<MarketRegistrySnapshot> | null = null
let installedInFlight: Promise<MarketInstalledSnapshot> | null = null

async function requestMarket<T>(name: 'registry' | 'installed', fallbackError: (status: number) => string): Promise<T> {
  const response = await fetch(endpoint(name), { cache: 'no-store', signal: AbortSignal.timeout(10_000) })
  let body: unknown
  try { body = await response.json() } catch { body = {} }
  if (!response.ok) {
    const message = typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : fallbackError(response.status)
    throw new MarketRequestError(response.status, message)
  }
  return body as T
}

function fetchRegistry(fallbackError: (status: number) => string): Promise<MarketRegistrySnapshot> {
  if (registryInFlight !== null) return registryInFlight
  registryInFlight = requestMarket<{ registry?: MarketRegistrySnapshot }>('registry', fallbackError)
    .then((body) => {
      if (body.registry === undefined) throw new Error('Plugin Market registry response is missing its catalog')
      return body.registry
    })
    .finally(() => { registryInFlight = null })
  return registryInFlight
}

function fetchInstalled(fallbackError: (status: number) => string): Promise<MarketInstalledSnapshot> {
  if (installedInFlight !== null) return installedInFlight
  installedInFlight = requestMarket<MarketInstalledSnapshot>('installed', fallbackError)
    .finally(() => { installedInFlight = null })
  return installedInFlight
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}

function requestStatus(reason: unknown): number | null {
  return reason instanceof MarketRequestError ? reason.status : null
}

export function PluginDiscovery({ t, list, startInstall, getInstall, openSettings }: PluginDiscoveryProps): ReactNode {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState(PLUGIN_DISCOVERY_POPULAR)
  const [state, setState] = useState<ViewState>({ status: 'idle' })
  const [marketInstall, setMarketInstall] = useState<PluginInstallSnapshot | null>(null)
  const [pluginInstalls, setPluginInstalls] = useState<Readonly<Record<string, PluginInstallSnapshot>>>({})
  const [installTarget, setInstallTarget] = useState<PreviewItem | null>(null)
  const [installAcknowledged, setInstallAcknowledged] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)
  const [categoriesExpanded, setCategoriesExpanded] = useState(false)
  const [triggerLoading, setTriggerLoading] = useState(false)
  const mounted = useRef(true)
  const openRef = useRef(false)
  const catalogRef = useRef<PluginDiscoveryCatalog | null>(null)
  const lastScrollTop = useRef(0)
  const triggerLoadingStartedAt = useRef(0)
  const triggerLoadingTimer = useRef<number | null>(null)
  const lang = document.documentElement.lang.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  const marketHttpError = useCallback((status: number): string => (
    t('discovery.httpError').replace('{status}', String(status))
  ), [t])

  useEffect(() => () => {
    mounted.current = false
    if (triggerLoadingTimer.current !== null) window.clearTimeout(triggerLoadingTimer.current)
  }, [])
  useEffect(() => { openRef.current = open }, [open])

  const beginTriggerLoading = useCallback((): void => {
    if (triggerLoadingTimer.current !== null) window.clearTimeout(triggerLoadingTimer.current)
    triggerLoadingTimer.current = null
    triggerLoadingStartedAt.current = performance.now()
    setTriggerLoading(true)
  }, [])

  const finishTriggerLoading = useCallback((): void => {
    const elapsed = performance.now() - triggerLoadingStartedAt.current
    const delay = Math.max(0, MIN_TRIGGER_LOADING_MS - elapsed)
    if (triggerLoadingTimer.current !== null) window.clearTimeout(triggerLoadingTimer.current)
    triggerLoadingTimer.current = window.setTimeout(() => {
      triggerLoadingTimer.current = null
      if (mounted.current) setTriggerLoading(false)
    }, delay)
  }, [])

  const showCatalog = useCallback((next: ReadyState): void => {
    catalogRef.current = next.catalog
    if (!mounted.current || !openRef.current) return
    setCategory(current => current === PLUGIN_DISCOVERY_POPULAR || next.catalog.categories.some(entry => entry.id === current)
      ? current
      : PLUGIN_DISCOVERY_POPULAR)
    setState(next)
  }, [])

  const load = useCallback(async (force: boolean): Promise<void> => {
    beginTriggerLoading()
    const started = performance.now()
    const cached = readPluginDiscoveryCache()
    const fallback = cached?.catalog ?? catalogRef.current
    if (fallback !== null) catalogRef.current = fallback

    if (!force && cached !== null && !cached.stale) {
      showCatalog({ status: 'ready', catalog: cached.catalog, installed: null, stale: false, refreshing: false,
        refreshFailed: false, installedFailed: false })
      try {
        const installed = await fetchInstalled(marketHttpError)
        showCatalog({ status: 'ready', catalog: cached.catalog, installed, stale: false, refreshing: false,
          refreshFailed: false, installedFailed: false })
      } catch (reason) {
        showCatalog({ status: 'ready', catalog: cached.catalog, installed: null, stale: false, refreshing: false,
          refreshFailed: false, installedFailed: true, message: errorMessage(reason) })
      }
      finishTriggerLoading()
      return
    }

    if (fallback === null) {
      if (mounted.current && openRef.current) setState({ status: 'loading' })
    } else {
      showCatalog({ status: 'ready', catalog: fallback, installed: null, stale: cached?.stale ?? false, refreshing: true,
        refreshFailed: false, installedFailed: false })
    }

    const [registryResult, installedResult] = await Promise.allSettled([
      fetchRegistry(marketHttpError),
      fetchInstalled(marketHttpError),
    ])
    let catalog = fallback
    if (registryResult.status === 'fulfilled') {
      catalog = buildPluginDiscoveryCatalog(registryResult.value)
      writePluginDiscoveryCache(catalog)
    }
    if (catalog !== null) {
      const registryFailed = registryResult.status === 'rejected'
      const installedFailed = installedResult.status === 'rejected'
      const messages = [
        registryFailed ? errorMessage(registryResult.reason) : null,
        installedFailed ? errorMessage(installedResult.reason) : null,
      ].filter((message): message is string => message !== null)
      showCatalog({
        status: 'ready',
        catalog,
        installed: installedResult.status === 'fulfilled' ? installedResult.value : null,
        stale: registryFailed ? true : false,
        refreshing: false,
        refreshFailed: registryFailed,
        installedFailed,
        ...(messages.length === 0 ? {} : { message: messages.join('\n') }),
      })
      finishTriggerLoading()
      return
    }

    const registryReason: unknown = registryResult.status === 'rejected' ? registryResult.reason : null
    const installedReason: unknown = installedResult.status === 'rejected' ? installedResult.reason : null
    const missingRoute = requestStatus(registryReason) === 404 || requestStatus(installedReason) === 404
    let status: 'missing' | 'outdated' | 'error' = 'error'
    if (missingRoute) {
      try {
        const inventory = await list()
        status = inventory.entries.some(entry => entry.moduleName === 'dshmarket' || entry.moduleName === 'dsh-market')
          ? 'outdated'
          : 'missing'
      } catch { status = 'missing' }
    }
    if (mounted.current && openRef.current) setState({
      status,
      elapsedMs: Math.round(performance.now() - started),
      ...(registryReason === null ? {} : { message: errorMessage(registryReason) }),
    })
    finishTriggerLoading()
  }, [beginTriggerLoading, finishTriggerLoading, list, marketHttpError, showCatalog])

  useEffect(() => {
    if (!open) return
    setCategory(PLUGIN_DISCOVERY_POPULAR)
    setCategoriesExpanded(false)
    lastScrollTop.current = 0
    void load(false)
  }, [load, open])

  useEffect(() => {
    if (marketInstall?.phase !== 'running') return
    const timer = window.setTimeout(() => { void getInstall(marketInstall.installId).then(setMarketInstall) }, 750)
    return () => { window.clearTimeout(timer) }
  }, [getInstall, marketInstall])

  const runningPlugin = Object.values(pluginInstalls).find(snapshot => snapshot.phase === 'running')
  useEffect(() => {
    if (runningPlugin === undefined) return
    let current = true
    const timer = window.setTimeout(() => {
      void getInstall(runningPlugin.installId).then(
        (snapshot) => {
          if (!current) return
          setPluginInstalls(previous => ({ ...previous, [snapshot.packageSpec]: snapshot }))
          if (snapshot.phase === 'succeeded' || snapshot.phase === 'repaired' || snapshot.phase === 'quarantined') {
            void fetchInstalled(marketHttpError).then((installed) => {
              if (!current) return
              setState(previous => previous.status === 'ready' ? { ...previous, installed, installedFailed: false } : previous)
            }).catch(() => { /* the completed install remains visible even if market state lags */ })
          }
        },
        () => { if (current) setInstallError(t('discovery.install.statusFailed')) },
      )
    }, 750)
    return () => { current = false; window.clearTimeout(timer) }
  }, [getInstall, marketHttpError, runningPlugin, t])

  const installMarket = (): void => {
    void startInstall({ profile: 'web', packageSpec: 'dshmarket' }).then(setMarketInstall).catch(() => {
      setState({ status: 'error', elapsedMs: 0, message: t('discovery.install.startFailed') })
    })
  }
  const confirmPluginInstall = (): void => {
    const target = installTarget
    if (target?.installSpec === null || target?.installSpec === undefined) return
    const installSpec = target.installSpec
    setInstallTarget(null)
    setInstallAcknowledged(false)
    setInstallError(null)
    void startInstall({ profile: 'web', packageSpec: installSpec }).then(
      (snapshot) => { setPluginInstalls(previous => ({ ...previous, [installSpec]: snapshot })) },
      () => { setInstallError(t('discovery.install.startFailed')) },
    )
  }
  const navigate = (item?: PreviewItem): void => {
    setOpen(false)
    const discover = item?.state === 'uninstalled' || item?.state === 'unknown'
    openSettings('market', item === undefined ? 'discover' : `${discover ? 'discover' : 'installed'}:${item.packageName}`)
  }
  const categoryLabel = (id: string, catalog: PluginDiscoveryCatalog): string => {
    if (id === PLUGIN_DISCOVERY_POPULAR) return t('discovery.category.popular')
    const labels = catalog.categories.find(entry => entry.id === id)?.labels
    return labels?.[lang] ?? labels?.en ?? id
  }

  const ready = state.status === 'ready' ? state : null
  const items = ready === null ? [] : selectPluginDiscoveryItems(ready.catalog, category, ready.installed)
  const cachedAt = ready === null ? '' : new Date(ready.catalog.cachedAt).toLocaleString(lang)
  const discoveryBusy = open && triggerLoading
  const onResultsScroll = (event: UIEvent<HTMLDivElement>): void => {
    const next = event.currentTarget.scrollTop
    if (categoriesExpanded && next + 4 < lastScrollTop.current) setCategoriesExpanded(false)
    lastScrollTop.current = next
  }
  const loadingPanel = <div className={css.loadingPanel} role="status" aria-live="polite">
    <span className={css.loadingSpinner} aria-hidden="true" />
    <span>{t('discovery.loadingShort')}</span>
  </div>

  return <>
    <button type="button" className={css.trigger} aria-haspopup="dialog" aria-expanded={open} aria-busy={discoveryBusy}
      onClick={() => { beginTriggerLoading(); setOpen(true) }}>
      <IconCordisPluginOutline14 size={14} />
      {t('discovery.trigger')}
    </button>
    <Modal open={open} onClose={() => { setOpen(false) }} closeLabel={t('discovery.close')} title={t('discovery.title')}
      description={t('discovery.description')} className={css.dialog ?? ''} contentClassName={css.dialogContent ?? ''}>
      <div className={css.scrollArea} aria-label={t('discovery.results')} onScroll={onResultsScroll}>
        {state.status === 'loading' || state.status === 'idle'
          ? loadingPanel
          : ready !== null
            ? <>
              <div className={css.stickyControls}>
                <div className={css.categoryControls}>
                  <div id="plugin-discovery-categories" className={css.categoryRail} data-expanded={categoriesExpanded ? 'true' : undefined}
                    role="group" aria-label={t('discovery.categories')}>
                    {[{ id: PLUGIN_DISCOVERY_POPULAR, labels: {} }, ...ready.catalog.categories].map(entry => <button
                      key={entry.id} type="button" className={css.categoryChoice} aria-pressed={category === entry.id}
                      onClick={() => { setCategory(entry.id) }}>
                      {categoryLabel(entry.id, ready.catalog)}
                    </button>)}
                  </div>
                  <div className={css.categoryActions}>
                    <Button size="sm" variant="ghost" disabled={ready.refreshing} onClick={() => { void load(true) }}>
                      <IconRefreshOutline16 size={14} />
                      {t('discovery.refresh')}
                    </Button>
                    <Button size="sm" variant="ghost" aria-controls="plugin-discovery-categories" aria-expanded={categoriesExpanded}
                      onClick={() => { setCategoriesExpanded(value => !value) }}>
                      {categoriesExpanded ? t('discovery.categories.collapse') : t('discovery.categories.expand')}
                    </Button>
                  </div>
                </div>
              </div>
              {discoveryBusy
                ? loadingPanel
                : <>
                  <div className={css.notice}>{t('discovery.notice')}</div>
                  {ready.stale
                    ? <div className={css.staleNotice} role="status"><strong>{t('discovery.cache.stale')}</strong>
                      <span>{t('discovery.cache.staleDescription')}</span></div>
                    : null}
                  {ready.installedFailed
                    ? <div className={css.warning} role="status">{t('discovery.installStateUnknown')}</div>
                    : null}
                  <ul className={css.grid}>{items.map(item => <li key={item.id} className={css.card}>
                    <div className={css.cardHead}><div><div className={css.category}>{item.category.map(id => categoryLabel(id, ready.catalog)).join(' · ')}</div>
                      <div className={css.name}>{item.name}</div><div className={css.author}>@{item.owner}</div></div>
                    <span className={css.stars}>★ {count(item.stars)}</span></div>
                    <p className={css.summary}>{item.description[lang] ?? item.description.en ?? ''}</p>
                    <div className={css.meta}><span>{t('discovery.downloads')} {count(item.downloads)}</span>
                      <span>{t(`discovery.state.${item.state}`)}</span></div>
                    {pluginInstalls[item.installSpec ?? '']?.phase === 'failed' && pluginInstalls[item.installSpec ?? '']?.diagnostic !== undefined
                      ? <p className={css.cardError}>{pluginInstalls[item.installSpec ?? '']?.diagnostic}</p>
                      : null}
                    <div className={css.actions}>
                      <Button size="sm" variant="ghost" onClick={() => { navigate(item) }}>{t('discovery.goView')}</Button>
                      {(() => {
                        const direct = item.installSpec === null ? undefined : pluginInstalls[item.installSpec]
                        if (item.state === 'installed' || direct?.phase === 'succeeded' || direct?.phase === 'repaired') {
                          return <Button size="sm" variant="primary" disabled>{t('discovery.install.installed')}</Button>
                        }
                        if (item.state === 'restart') return <Button size="sm" variant="primary" disabled>{t('discovery.state.restart')}</Button>
                        if (item.state === 'unavailable' || direct?.phase === 'quarantined') {
                          return <Button size="sm" variant="primary" disabled>{t('discovery.state.unavailable')}</Button>
                        }
                        if (direct?.phase === 'running') return <Button size="sm" variant="primary" disabled>{t('discovery.install.running')}</Button>
                        if (item.installSpec === null || item.state === 'unknown') return null
                        return <Button size="sm" variant="primary" disabled={runningPlugin !== undefined}
                          onClick={() => { setInstallTarget(item); setInstallAcknowledged(false) }}>
                          {direct?.phase === 'failed' ? t('discovery.install.retry') : t('discovery.install.action')}
                        </Button>
                      })()}
                    </div>
                  </li>)}</ul>
                  <div className={css.footer}><span>{t('discovery.updated')} {ready.catalog.updated} · {t('discovery.cached')} {cachedAt}</span>
                    <Button size="sm" variant="ghost" onClick={() => { navigate() }}>{t('discovery.more')}</Button></div>
                </>}
            </>
            : state.status === 'missing' || state.status === 'outdated' || state.status === 'error'
              ? <div className={css.notice}><strong>{t(`discovery.${state.status}.title`)}</strong>
                <p>{t(`discovery.${state.status}.description`)} ({t('discovery.elapsed').replace('{count}', String(state.elapsedMs))})</p>
                {state.message === undefined ? null : <code>{state.message}</code>}
                <div className={css.actions}>{state.status === 'missing'
                  ? <Button size="sm" variant="primary" disabled={marketInstall?.phase === 'running'} onClick={installMarket}>{t('discovery.installMarket')}</Button>
                  : state.status === 'outdated'
                    ? <Button size="sm" variant="primary" disabled={marketInstall?.phase === 'running'} onClick={installMarket}>{t('discovery.updateMarket')}</Button>
                    : null}
                <Button size="sm" variant="outline" onClick={() => { void load(true) }}>{t('discovery.retry')}</Button></div>
                {marketInstall?.phase === 'succeeded' ? <p>{t('discovery.marketInstalledRestart')}</p> : null}
              </div>
              : null}
        {installError === null ? null : <p className={css.installError} role="alert">{installError}</p>}
      </div>
    </Modal>
    <RiskConfirmation
      open={installTarget !== null}
      title={t('discovery.confirm.title')}
      description={t('discovery.confirm.description').replace('{name}', installTarget?.name ?? '')}
      acknowledgeLabel={t('discovery.confirm.acknowledge')}
      cancelLabel={t('discovery.confirm.cancel')}
      closeLabel={t('discovery.confirm.cancel')}
      confirmLabel={t('discovery.confirm.install')}
      acknowledged={installAcknowledged}
      onAcknowledgedChange={setInstallAcknowledged}
      onCancel={() => { setInstallTarget(null); setInstallAcknowledged(false) }}
      onConfirm={confirmPluginInstall}
    />
  </>
}
