import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { DESKTOP_LANGUAGE_DEFINITIONS, registerDesktopLanguages } from '../src/client/community-locales.ts'

describe('community desktop locales', () => {
  it('has no additional community locales (only zh and en are supported)', () => {
    expect(DESKTOP_LANGUAGE_DEFINITIONS).toHaveLength(0)
  })

  it('registerDesktopLanguages returns a no-op cleanup function', () => {
    const ctx = {} as unknown as Context
    const dispose = registerDesktopLanguages(ctx)
    expect(typeof dispose).toBe('function')
    expect(() => dispose()).not.toThrow()
  })

  it('does not register any community locale namespaces', () => {
    const added: string[] = []
    const registered: string[] = []
    const ctx = {
      locale: {
        getSnapshot: () => ({
          active: 'zh',
          revision: 0,
          locales: [
            { id: 'zh', label: '中文' },
            { id: 'en', label: 'English' },
          ],
        }),
        addLanguage: ({ id }: { id: string }) => {
          added.push(id)
          return () => undefined
        },
        register: (namespace: string, locale: string) => {
          registered.push(`${namespace}/${locale}`)
          return () => undefined
        },
      },
    } as unknown as Context

    registerDesktopLanguages(ctx)

    expect(added).toHaveLength(0)
    expect(registered).toHaveLength(0)
  })
})
