/** Resolve a Codex-only system route without changing package-manager proxy settings. */

const PROXY_ENV_NAMES = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'ALL_PROXY',
] as const

/** Network target used to resolve the proxy route required by ChatGPT-authenticated Codex. */
export const CODEX_PROXY_TARGET = 'https://chatgpt.com/backend-api/'

async function resolveWithDeadline(resolveProxy: (url: string) => Promise<string>): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      resolveProxy(CODEX_PROXY_TARGET),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => { reject(new Error('System proxy resolution timed out')) }, 3_000)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

function environmentEntry(
  environment: NodeJS.ProcessEnv,
  name: string,
): [string, string] | undefined {
  const normalized = name.toUpperCase()
  return Object.entries(environment).find(([key, value]) =>
    key.toUpperCase() === normalized && value !== undefined && value.trim().length > 0,
  ) as [string, string] | undefined
}

function proxyUrl(kind: string, endpoint: string): string | undefined {
  const scheme = kind === 'PROXY'
    ? 'http'
    : kind === 'HTTPS'
      ? 'https'
      : kind === 'SOCKS' || kind === 'SOCKS5'
        ? 'socks5'
        : kind === 'SOCKS4'
          ? 'socks4'
          : undefined
  if (scheme === undefined || endpoint.length === 0 || /[\s/@?#]/u.test(endpoint)) return undefined
  try {
    const parsed = new URL(`${scheme}://${endpoint}`)
    if (parsed.hostname.length === 0 || parsed.username.length > 0 || parsed.password.length > 0) return undefined
    return parsed.href
  } catch {
    return undefined
  }
}

/**
 * Select the first environment-compatible route from Chromium proxy-resolution output.
 * @param proxyRules - Semicolon-separated `PROXY`, `HTTPS`, `SOCKS`, or `DIRECT` routes.
 * @returns A proxy URL, or undefined when Chromium selected direct access or unsupported routes.
 */
export function parseResolvedSystemProxy(proxyRules: string): string | undefined {
  for (const candidate of proxyRules.split(';')) {
    if (candidate.trim().toUpperCase() === 'DIRECT') return undefined
    const match = /^\s*([A-Za-z0-9]+)\s+(.+?)\s*$/u.exec(candidate)
    if (match === null) continue
    const [, kind = '', endpoint = ''] = match
    if (kind.toUpperCase() === 'DIRECT') return undefined
    const parsed = proxyUrl(kind.toUpperCase(), endpoint)
    if (parsed !== undefined) return parsed
  }
  return undefined
}

/** Result of applying one system proxy resolution to a Harness environment. */
export interface ResolvedSystemProxyEnvironment {
  /** Harness environment containing a private Codex route, not generic proxy overrides. */
  readonly environment: NodeJS.ProcessEnv
  /** Whether system proxy entries were added. */
  readonly applied: boolean
}

/**
 * Preserve explicit proxy configuration or convey Electron's route only to the Codex provider.
 * @param environment - Parent environment selected by the desktop host.
 * @param resolveProxy - Electron session proxy resolver.
 * @returns A copied environment and whether the system route was added.
 * @throws When the resolver fails or exceeds three seconds; callers retain the original environment.
 */
export async function resolveSystemProxyEnvironment(
  environment: NodeJS.ProcessEnv,
  resolveProxy: (url: string) => Promise<string>,
): Promise<ResolvedSystemProxyEnvironment> {
  if (PROXY_ENV_NAMES.some(name => environmentEntry(environment, name) !== undefined)) {
    return { environment: { ...environment }, applied: false }
  }
  const proxy = parseResolvedSystemProxy(await resolveWithDeadline(resolveProxy))
  if (proxy === undefined) return { environment: { ...environment }, applied: false }

  const resolved: NodeJS.ProcessEnv = {
    ...environment,
    DSH_DESKTOP_CODEX_PROXY: proxy,
  }
  return { environment: resolved, applied: true }
}
