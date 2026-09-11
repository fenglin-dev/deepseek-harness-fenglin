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
    const ctx = {
      locale: {
        addLanguage: () => () => undefined,
        register: (namespace: string, locale: string) => {
          const key = `${namespace}/${locale}`
          if (registrations.has(key)) throw new Error(`duplicate locale registration: ${key}`)
          registrations.add(key)
          return () => { registrations.delete(key) }
        },
      },
    } as unknown as Context

    const dispose = registerDesktopLanguages(ctx)
    for (const definition of DESKTOP_LANGUAGE_DEFINITIONS) {
      expect(registrations).toContain(`desktop-shell/${definition.id}`)
    }
    dispose()
    expect(registrations).toHaveLength(0)
  })
})
