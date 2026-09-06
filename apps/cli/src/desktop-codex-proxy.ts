/** Desktop-only Codex defaults composed without modifying Profile files or global proxy state. */
import type { PatchOptions } from '@deepseek-ai/cordis-plugin-include'
import { composeEntries } from '@deepseek-ai/dsh-app-boot'

function hasProxy(environment: Record<string, unknown>, includeEmpty = false): boolean {
  return Object.entries(environment).some(([key, value]) =>
    /^(?:https?|all)_proxy$/iu.test(key) && typeof value === 'string' && (includeEmpty || value.trim() !== ''),
  )
}

/**
 * Apply a host-resolved route exclusively to official Codex provider rows.
 * Recompute after user patches on both boot and reload so explicit provider
 * proxy settings (including lowercase keys) always win. No files are written.
 * @param patches - Effective Profile patches before desktop defaults.
 * @param environment - Launch environment with the optional private route.
 * @returns Patches with scoped defaults; unchanged for explicit or invalid routes.
 */
export function withDesktopCodexProxy(patches: PatchOptions[], environment: NodeJS.ProcessEnv): PatchOptions[] {
  const route = environment.DSH_DESKTOP_CODEX_PROXY
  if (!route || hasProxy(environment)) return patches
  try {
    const url = new URL(route)
    if (!['http:', 'https:', 'socks4:', 'socks5:'].includes(url.protocol)
      || !url.hostname || url.username || url.password || url.search || url.hash
      || (url.pathname !== '' && url.pathname !== '/')) return patches
  } catch {
    return patches
  }
  const defaults: PatchOptions[] = []
  for (const row of composeEntries([patches])) {
    if (row.name !== '@deepseek-ai/dsh-subagent-codex' || typeof row.id !== 'string') continue
    const config = row.config as { env?: Record<string, unknown> } | undefined
    const providerEnv = config?.env ?? {}
    if (hasProxy(providerEnv, true)) continue
    const bypass = [...Object.entries(providerEnv), ...Object.entries(environment)]
      .find(([key, value]) => key.toUpperCase() === 'NO_PROXY' && typeof value === 'string')
    const values = typeof bypass?.[1] === 'string' ? bypass[1].split(',').map(value => value.trim()).filter(Boolean) : []
    const noProxy = [...new Set([...values, '127.0.0.1', 'localhost', '::1'])].join(',')
    defaults.push({ id: row.id, config: { ...config, env: {
      ...providerEnv,
      HTTP_PROXY: route,
      HTTPS_PROXY: route,
      [bypass?.[0] ?? 'NO_PROXY']: noProxy,
    } } })
  }
  return [...patches, ...defaults]
}
