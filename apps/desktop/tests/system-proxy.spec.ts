import { describe, expect, it, vi } from 'vitest'
import {
  CODEX_PROXY_TARGET,
  parseResolvedSystemProxy,
  resolveSystemProxyEnvironment,
} from '../src/system-proxy.ts'

describe('desktop system proxy', () => {
  it('parses Chromium proxy routes without accepting credentials or unsupported routes', () => {
    expect(parseResolvedSystemProxy('PROXY 127.0.0.1:7890; DIRECT')).toBe('http://127.0.0.1:7890/')
    expect(parseResolvedSystemProxy('HTTPS proxy.example:8443')).toBe('https://proxy.example:8443/')
    expect(parseResolvedSystemProxy('SOCKS5 [::1]:1080')).toBe('socks5://[::1]:1080')
    expect(parseResolvedSystemProxy('QUIC proxy.example:443; DIRECT')).toBeUndefined()
    expect(parseResolvedSystemProxy('PROXY user:secret@proxy.example:8080')).toBeUndefined()
    expect(parseResolvedSystemProxy('DIRECT')).toBeUndefined()
    expect(parseResolvedSystemProxy('DIRECT; PROXY fallback.example:8080')).toBeUndefined()
  })

  it('conveys only the Codex route without modifying pnpm or Git proxy settings', async () => {
    const resolveProxy = vi.fn(async () => 'PROXY 127.0.0.1:7890; DIRECT')
    const result = await resolveSystemProxyEnvironment({
      PATH: '/usr/bin',
      NO_PROXY: 'internal.example,localhost',
    }, resolveProxy)

    expect(resolveProxy).toHaveBeenCalledWith(CODEX_PROXY_TARGET)
    expect(result).toEqual({
      applied: true,
      environment: {
        PATH: '/usr/bin',
        DSH_DESKTOP_CODEX_PROXY: 'http://127.0.0.1:7890/',
        NO_PROXY: 'internal.example,localhost',
      },
    })
  })

  it('preserves explicit proxy environment entries without consulting Electron', async () => {
    const resolveProxy = vi.fn(async () => 'PROXY system.example:8080')
    const result = await resolveSystemProxyEnvironment({
      https_proxy: 'http://explicit.example:3128',
    }, resolveProxy)

    expect(resolveProxy).not.toHaveBeenCalled()
    expect(result).toEqual({
      applied: false,
      environment: { https_proxy: 'http://explicit.example:3128' },
    })
  })

  it('keeps direct system routes unchanged', async () => {
    const result = await resolveSystemProxyEnvironment(
      { PATH: '/usr/bin' },
      async () => 'DIRECT',
    )
    expect(result).toEqual({ applied: false, environment: { PATH: '/usr/bin' } })
  })

  it('bounds a stalled resolver and ignores its late completion', async () => {
    vi.useFakeTimers()
    try {
      let finish: ((value: string) => void) | undefined
      const parent = { PATH: '/usr/bin' }
      const pending = resolveSystemProxyEnvironment(parent, () => new Promise((resolve) => { finish = resolve }))
      const assertion = expect(pending).rejects.toThrow('timed out')
      await vi.advanceTimersByTimeAsync(3_000)
      await assertion
      finish?.('PROXY late.example:8080')
      await Promise.resolve()
      expect(parent).toEqual({ PATH: '/usr/bin' })
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('propagates resolver errors without changing the parent environment', async () => {
    const parent = { PATH: '/usr/bin' }
    await expect(resolveSystemProxyEnvironment(parent, () => Promise.reject(new Error('resolver failed'))))
      .rejects.toThrow('resolver failed')
    expect(parent).toEqual({ PATH: '/usr/bin' })
  })
})
