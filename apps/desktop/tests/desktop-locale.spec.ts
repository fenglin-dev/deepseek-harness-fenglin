import { describe, expect, it } from 'vitest'
import {
  DESKTOP_LOCALE_IDS, desktopDictionary, formatDesktopCopy, resolveDesktopLocale,
} from '../src/desktop-locale.ts'

describe('desktop locale resolution', () => {
  it('publishes the complete stable locale order', () => {
    expect(DESKTOP_LOCALE_IDS).toEqual(['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'pt-BR', 'ru'])
  })

  it('matches exact, regional, underscore, and ordered browser tags', () => {
    expect(resolveDesktopLocale('pt-BR')).toBe('pt-BR')
    expect(resolveDesktopLocale('pt_PT')).toBe('pt-BR')
    expect(resolveDesktopLocale('ru-RU')).toBe('ru')
    expect(resolveDesktopLocale(['xx-ZZ', 'ja-JP'])).toBe('ja')
    expect(resolveDesktopLocale('ZH_cn')).toBe('zh')
  })

  it('falls back to English for empty and unsupported tags', () => {
    expect(resolveDesktopLocale('')).toBe('en')
    expect(resolveDesktopLocale(['xx', 'yy-ZZ'])).toBe('en')
  })

  it('uses English when a supported locale has no dictionary yet', () => {
    expect(desktopDictionary('fr-FR', { en: 'English', ru: 'Russian' })).toBe('English')
    expect(desktopDictionary('ru-RU', { en: 'English', ru: 'Russian' })).toBe('Russian')
  })

  it('interpolates without changing Unicode, spaces, or Windows separators in paths', () => {
    const path = 'C:\\Users\\\u6cfd\u82e5\\DeepSeek Harness\\\u914d\u7f6e'
    expect(formatDesktopCopy('Path: {path}; {missing}', { path })).toBe(`Path: ${path}; {missing}`)
  })
})
