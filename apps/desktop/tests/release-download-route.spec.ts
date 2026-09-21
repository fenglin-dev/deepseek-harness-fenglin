import { describe, expect, it } from 'vitest'
import { curlProxyArguments, releaseDownloadProxy } from '../scripts/release-download-route.ts'

describe('release download route', () => {
  it('uses one explicit proxy route in deterministic priority order', () => {
    const environment = {
      HTTPS_PROXY: 'http://proxy.example:8443',
      https_proxy: 'http://ignored.example:8080',
      ALL_PROXY: 'socks5h://ignored.example:1080',
    }
    expect(releaseDownloadProxy(environment)).toBe('http://proxy.example:8443')
    expect(curlProxyArguments(environment)).toEqual(['--proxy', 'http://proxy.example:8443'])
  })

  it('uses the direct route when no proxy was explicitly configured', () => {
    expect(releaseDownloadProxy({})).toBeUndefined()
    expect(curlProxyArguments({})).toEqual([])
  })
})
