/** Desktop-owned composition and caching for the compact Plugin Market preview. */

export const PLUGIN_DISCOVERY_CACHE_KEY = 'dsh.desktop.plugin-discovery.v1'
/** Maximum age of a discovery catalog before the UI requires revalidation. */
export const PLUGIN_DISCOVERY_CACHE_TTL_MS = 24 * 60 * 60 * 1_000
/** Synthetic ranking id for the market-wide popular collection. */
export const PLUGIN_DISCOVERY_POPULAR = 'popular'
const CACHE_SCHEMA = 'desktop-plugin-discovery-cache/v1' as const
const CARD_LIMIT = 4

/** Local installation state rendered on one discovery card. */
export type PreviewState = 'installed' | 'uninstalled' | 'restart' | 'unavailable' | 'unknown'

/** Market registry fields required to rank and render one plugin. */
export interface MarketRegistryPlugin {
  name: string
  owner: string
  url: string
  npm?: string | null
  category: string | string[]
  description: Record<string, string>
  downloads?: number | null
  stars?: number | null
  install: string
  deprecated?: boolean
}

/** Market registry response used to build the compact discovery catalog. */
export interface MarketRegistrySnapshot {
  updated: string
  categories: Record<string, Record<string, string>>
  plugins: MarketRegistryPlugin[]
}

/** Active Profile data used to resolve current installation and activation state. */
export interface MarketInstalledSnapshot {
  installed: Record<string, string>
  repoIdentities?: Record<string, string[]>
  activation?: Record<string, { state?: string }>
}

/** Localized category metadata retained by the compact catalog. */
export interface PreviewCategory {
  id: string
  labels: Record<string, string>
}

/** Cache-safe projection of one registry plugin. */
export interface CachedPreviewItem {
  id: string
  name: string
  owner: string
  category: string[]
  description: Record<string, string>
  downloads: number | null
  stars: number | null
  packageName: string
  /** Registry package accepted by the guarded Host installer; absent for market-only sources. */
  installSpec: string | null
  repositoryIdentity: string | null
  matchNames: string[]
}

/** Versioned compact catalog with pre-ranked card ids. */
export interface PluginDiscoveryCatalog {
  schema: typeof CACHE_SCHEMA
  cachedAt: number
  updated: string
  categories: PreviewCategory[]
  items: Record<string, CachedPreviewItem>
  rankings: Record<string, string[]>
}

/** Discovery card data combined with current Profile state. */
export interface PreviewItem extends CachedPreviewItem {
  state: PreviewState
}

/** Cache read result that distinguishes usable fresh and stale catalogs. */
export interface PluginDiscoveryCacheRead {
  catalog: PluginDiscoveryCatalog
  stale: boolean
}

let memoryCache: PluginDiscoveryCatalog | null = null

function categoriesOf(plugin: MarketRegistryPlugin): string[] {
  const values = Array.isArray(plugin.category) ? plugin.category : [plugin.category]
  return [...new Set(values.filter(value => typeof value === 'string' && value !== ''))]
}

function repositoryIdentity(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.toLowerCase() !== 'github.com') return null
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    const owner = parts[0]
    const name = parts[1]
    if (owner === undefined || name === undefined) return null
    const repository = `${owner}/${name.replace(/\.git$/iu, '')}`.toLowerCase()
    const tree = parts.indexOf('tree')
    return tree >= 0 && parts.length > tree + 2
      ? `${repository}#path:/${parts.slice(tree + 2).join('/').toLowerCase()}`
      : repository
  } catch {
    return null
  }
}

function itemId(plugin: MarketRegistryPlugin): string {
  return `${plugin.url}\u0000${plugin.npm ?? ''}\u0000${plugin.name}`
}

function cacheLooksValid(value: unknown): value is PluginDiscoveryCatalog {
  if (value === null || typeof value !== 'object') return false
  const candidate = value as Partial<PluginDiscoveryCatalog>
  const items: unknown = (value as { items?: unknown }).items
  return candidate.schema === CACHE_SCHEMA
    && typeof candidate.cachedAt === 'number'
    && Number.isFinite(candidate.cachedAt)
    && typeof candidate.updated === 'string'
    && Array.isArray(candidate.categories)
    && items !== null
    && typeof items === 'object'
    && typeof candidate.rankings === 'object'
    && Array.isArray(candidate.rankings[PLUGIN_DISCOVERY_POPULAR])
    && Object.values(items as Record<string, unknown>).every(item => item !== null
      && typeof item === 'object'
      && ('installSpec' in item)
      && (item.installSpec === null || typeof item.installSpec === 'string'))
}

function storageOrNull(storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  if (storage !== undefined) return storage
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

/**
 * Rank once, then fill the popular and category buckets in one pass.
 *
 * @param registry - Complete market registry snapshot.
 * @param cachedAt - Timestamp assigned to the generated catalog.
 * @returns A bounded, cache-safe catalog for the discovery preview.
 */
export function buildPluginDiscoveryCatalog(
  registry: MarketRegistrySnapshot,
  cachedAt: number = Date.now(),
): PluginDiscoveryCatalog {
  const nameCounts = new Map<string, number>()
  for (const plugin of registry.plugins) {
    for (const name of [plugin.name, plugin.npm]) {
      if (typeof name !== 'string' || name === '') continue
      const normalized = name.toLowerCase()
      nameCounts.set(normalized, (nameCounts.get(normalized) ?? 0) + 1)
    }
  }

  const sorted = [...registry.plugins]
    .filter(plugin => plugin.name !== 'dsh-market' && plugin.npm !== 'dshmarket')
    .filter(plugin => plugin.deprecated !== true && plugin.install.trim() !== '')
    .sort((a, b) => {
      const downloads = (b.downloads ?? -1) - (a.downloads ?? -1)
      if (downloads !== 0) return downloads
      const stars = (b.stars ?? -1) - (a.stars ?? -1)
      return stars !== 0 ? stars : a.name.localeCompare(b.name)
    })

  const knownCategories = new Set(Object.keys(registry.categories))
  const rankings: Record<string, string[]> = { [PLUGIN_DISCOVERY_POPULAR]: [] }
  for (const category of knownCategories) rankings[category] = []
  const selected = new Map<string, MarketRegistryPlugin>()

  for (const plugin of sorted) {
    const id = itemId(plugin)
    const buckets = [PLUGIN_DISCOVERY_POPULAR, ...categoriesOf(plugin).filter(category => knownCategories.has(category))]
    for (const bucket of buckets) {
      const ranking = rankings[bucket] ?? (rankings[bucket] = [])
      if (ranking.length >= CARD_LIMIT || ranking.includes(id)) continue
      ranking.push(id)
      selected.set(id, plugin)
    }
  }

  const categories = Object.entries(registry.categories)
    .filter(([id]) => (rankings[id]?.length ?? 0) > 0)
    .map(([id, labels]) => ({ id, labels }))
  const items: Record<string, CachedPreviewItem> = {}
  for (const [id, plugin] of selected) {
    const matchNames = [plugin.name, plugin.npm]
      .filter((name): name is string => typeof name === 'string' && name !== '')
      .map(name => name.toLowerCase())
      .filter(name => nameCounts.get(name) === 1)
    items[id] = {
      id,
      name: plugin.name,
      owner: plugin.owner,
      category: categoriesOf(plugin),
      description: plugin.description,
      downloads: plugin.downloads ?? null,
      stars: plugin.stars ?? null,
      packageName: plugin.npm ?? plugin.name,
      installSpec: plugin.npm ?? null,
      repositoryIdentity: repositoryIdentity(plugin.url),
      matchNames: [...new Set(matchNames)],
    }
  }

  return { schema: CACHE_SCHEMA, cachedAt, updated: registry.updated, categories, items, rankings }
}

function installedNameFor(item: CachedPreviewItem, local: MarketInstalledSnapshot): string | null {
  if (item.repositoryIdentity !== null) {
    const identityMatch = Object.entries(local.repoIdentities ?? {})
      .find(([, identities]) => identities.some(candidate => candidate.toLowerCase() === item.repositoryIdentity))
    if (identityMatch !== undefined) return identityMatch[0]
  }
  const names = new Set(item.matchNames)
  return Object.keys(local.installed).find(name => names.has(name.toLowerCase())) ?? null
}

function previewState(name: string | null, local: MarketInstalledSnapshot | null): PreviewState {
  if (local === null) return 'unknown'
  if (name === null) return 'uninstalled'
  const state = local.activation?.[name]?.state
  if (state === 'restart') return 'restart'
  if (state === 'broken' || state === 'missing' || state === 'disabled' || state === 'inert') return 'unavailable'
  return 'installed'
}

/**
 * Select at most four pre-ranked cards and merge current local activation state.
 *
 * @param catalog - Compact catalog containing pre-ranked item ids.
 * @param category - Popular or registry category id to display.
 * @param local - Current Profile state, or `null` when it could not be read.
 * @returns The selected cards with current installation states.
 */
export function selectPluginDiscoveryItems(
  catalog: PluginDiscoveryCatalog,
  category: string,
  local: MarketInstalledSnapshot | null,
): PreviewItem[] {
  return (catalog.rankings[category] ?? []).slice(0, CARD_LIMIT).flatMap((id) => {
    const item = catalog.items[id]
    if (item === undefined) return []
    const installedName = local === null ? null : installedNameFor(item, local)
    return [{ ...item, packageName: installedName ?? item.packageName, state: previewState(installedName, local) }]
  })
}

/**
 * Read persistent cache first, falling back to the process-local copy.
 *
 * @param now - Timestamp used to determine whether the catalog is stale.
 * @param storage - Storage implementation, `null` to use memory only, or omitted for local storage.
 * @returns A validated cache entry with freshness state, or `null` when no valid entry exists.
 */
export function readPluginDiscoveryCache(
  now: number = Date.now(),
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
): PluginDiscoveryCacheRead | null {
  const target = storageOrNull(storage)
  if (target !== null) {
    try {
      const raw = target.getItem(PLUGIN_DISCOVERY_CACHE_KEY)
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw)
        if (cacheLooksValid(parsed)) memoryCache = parsed
        else target.removeItem(PLUGIN_DISCOVERY_CACHE_KEY)
      }
    } catch {
      try { target.removeItem(PLUGIN_DISCOVERY_CACHE_KEY) } catch { /* storage may be unavailable */ }
    }
  }
  if (memoryCache === null) return null
  return { catalog: memoryCache, stale: now - memoryCache.cachedAt >= PLUGIN_DISCOVERY_CACHE_TTL_MS }
}

/**
 * Atomically replace the process cache, then best-effort persist it.
 *
 * @param catalog - Valid catalog that becomes the process-local source immediately.
 * @param storage - Storage implementation, `null` for memory only, or omitted for local storage.
 */
export function writePluginDiscoveryCache(
  catalog: PluginDiscoveryCatalog,
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
): void {
  memoryCache = catalog
  try {
    storageOrNull(storage)?.setItem(PLUGIN_DISCOVERY_CACHE_KEY, JSON.stringify(catalog))
  } catch { /* in-memory cache remains usable */ }
}

/** Test seam for module-level cache isolation. */
export function resetPluginDiscoveryMemoryCache(): void {
  memoryCache = null
}
