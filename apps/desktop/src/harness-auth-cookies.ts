/** Cleanup for stale loopback authentication cookies owned by prior Harness generations. */

const LOOPBACK_HOST = '127.0.0.1'
// BrowserAuth uses an unpadded base64url SHA-256 authority digest (43 characters).
const HARNESS_AUTH_COOKIE = /^dsh-auth-[A-Za-z0-9_-]{43}$/u

/** Minimal cookie store used by the desktop host and unit tests. */
export interface HarnessAuthCookieStore {
  get(filter: { readonly url: string }): Promise<readonly { readonly name: string }[]>
  remove(url: string, name: string): Promise<void>
}

function loopbackCookieUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl)
  const port = Number(parsed.port)
  if (parsed.protocol !== 'http:' || parsed.hostname !== LOOPBACK_HOST || parsed.username !== ''
    || parsed.password !== '' || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new TypeError('desktop: invalid Harness authentication URL')
  }
  return `${parsed.origin}/`
}

/**
 * Remove only Harness authentication cookies before exchanging a fresh startup token.
 * Cookies are host-scoped, so random loopback ports otherwise accumulate indefinitely.
 * @param store - Electron session cookie store.
 * @param harnessUrl - Authenticated URL emitted by the current Harness generation.
 * @returns Number of stale authentication cookies removed.
 */
export async function clearStaleHarnessAuthCookies(
  store: HarnessAuthCookieStore,
  harnessUrl: string,
): Promise<number> {
  const url = loopbackCookieUrl(harnessUrl)
  const cookies = await store.get({ url })
  const names = [...new Set(cookies.map(cookie => cookie.name).filter(name => HARNESS_AUTH_COOKIE.test(name)))]
  await Promise.all(names.map(name => store.remove(url, name)))
  return names.length
}
