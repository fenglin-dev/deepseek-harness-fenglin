import { describe, expect, it, vi } from 'vitest'
import { clearStaleHarnessAuthCookies } from '../src/harness-auth-cookies.ts'

describe('Harness authentication cookie cleanup', () => {
  it('removes only stale Harness authentication cookies before a fresh token exchange', async () => {
    const stale = `dsh-auth-${'a'.repeat(43)}`
    const current = `dsh-auth-${'B'.repeat(42)}_`
    const remove = vi.fn(async () => undefined)
    const count = await clearStaleHarnessAuthCookies({
      get: vi.fn(async () => [
        { name: stale }, { name: current }, { name: 'unrelated-session' }, { name: 'dsh-auth-short' },
      ]),
      remove,
    }, 'http://127.0.0.1:43123/?token=fresh-token')

    expect(count).toBe(2)
    expect(remove.mock.calls).toEqual([
      ['http://127.0.0.1:43123/', stale],
      ['http://127.0.0.1:43123/', current],
    ])
  })

  it.each([
    'https://127.0.0.1:43123/?token=value',
    'http://localhost:43123/?token=value',
    'http://127.0.0.1/?token=value',
    'http://user@127.0.0.1:43123/?token=value',
  ])('rejects a non-Harness cookie origin: %s', async (url) => {
    await expect(clearStaleHarnessAuthCookies({
      get: vi.fn(async () => []), remove: vi.fn(async () => undefined),
    }, url)).rejects.toThrow('invalid Harness authentication URL')
  })
})
