import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { DESKTOP_LANGUAGE_DEFINITIONS, registerDesktopLanguages } from '../src/client/community-locales.ts'

describe('community desktop locales', () => {
  it('keeps Russian third overall and orders the remaining community locales by audience size', () => {
    expect(DESKTOP_LANGUAGE_DEFINITIONS.map(({ id }) => id)).toEqual([
      'ru', 'es', 'fr', 'pt-BR', 'de', 'ja', 'ko',
    ])
  })

  it('registers each locale namespace exactly once after merging desktop additions', () => {
    const registrations = new Set<string>()
    const dictionaries = new Map<string, Record<string, string>>()
    const ctx = {
      locale: {
        getSnapshot: () => ({ active: 'en', revision: 0, locales: [] }),
        addLanguage: () => () => undefined,
        register: (namespace: string, locale: string, dictionary: Record<string, string>) => {
          const key = `${namespace}/${locale}`
          if (registrations.has(key)) throw new Error(`duplicate locale registration: ${key}`)
          registrations.add(key)
          dictionaries.set(key, dictionary)
          return () => { registrations.delete(key) }
        },
      },
    } as unknown as Context

    const dispose = registerDesktopLanguages(ctx)
    for (const definition of DESKTOP_LANGUAGE_DEFINITIONS) {
      expect(registrations).toContain(`desktop-shell/${definition.id}`)
      expect(dictionaries.get(`desktop-shell/${definition.id}`)?.['nas.title']).toBeTruthy()
    }
    dispose()
    expect(registrations).toHaveLength(0)
  })

  it('leaves a locale owned by an installed language pack untouched', () => {
    const added: string[] = []
    const registered: string[] = []
    const ctx = {
      locale: {
        getSnapshot: () => ({
          active: 'es', revision: 1,
          locales: [
            { id: 'zh', label: '中文', fallback: 'en' },
            { id: 'en', label: 'English' },
            { id: 'es', label: 'Español', fallback: 'en' },
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

    expect(added).not.toContain('es')
    expect(registered.some(key => key.endsWith('/es'))).toBe(false)
    expect(added).toContain('ru')
    expect(registered).toContain('desktop-shell/ru')
  })
})
