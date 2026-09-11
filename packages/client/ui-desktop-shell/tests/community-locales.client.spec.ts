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
})
