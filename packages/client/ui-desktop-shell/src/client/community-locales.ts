/** Community desktop language catalog and the locale selector's own copy. */

import type { Context } from '@deepseek-ai/cordis'
import type { LanguageRegistration } from '@deepseek-ai/dsh-client-locale/client'
import { desktopLanguageTitles } from './locales.ts'
import { COMMUNITY_TRANSLATIONS } from './community-translations/index.ts'
import { COMMUNITY_SURFACE_TRANSLATIONS } from './community-translations/surfaces.ts'
import { DOWNLOAD_NETWORK_TRANSLATIONS } from './download-network-locales.ts'
import { ru } from './locales.ts'

/** Additional languages offered by Open DSH Desktop. */
export const DESKTOP_LANGUAGE_DEFINITIONS = [
  { id: 'ja', label: '日本語', fallback: 'en' },
  { id: 'ko', label: '한국어', fallback: 'en' },
  { id: 'es', label: 'Español', fallback: 'en' },
  { id: 'fr', label: 'Français', fallback: 'en' },
  { id: 'de', label: 'Deutsch', fallback: 'en' },
  { id: 'pt-BR', label: 'Português (Brasil)', fallback: 'en' },
  { id: 'ru', label: 'Русский', fallback: 'en' },
] as const satisfies readonly LanguageRegistration[]

/**
 * Register the community languages and their selector label as one reversible effect.
 * @param ctx - Desktop-shell client context.
 * @returns Cleanup that removes dictionaries before their language definitions.
 */
export function registerDesktopLanguages(ctx: Context): () => void {
  const disposers: (() => void)[] = []
  try {
    for (const definition of DESKTOP_LANGUAGE_DEFINITIONS) {
      disposers.push(ctx.locale.addLanguage(definition))
      disposers.push(ctx.locale.register('settings.locale', definition.id, {
        'language.title': desktopLanguageTitles[definition.id],
      }))
      const dictionaries: Record<string, Record<string, string>> = {}
      for (const source of [COMMUNITY_TRANSLATIONS[definition.id], COMMUNITY_SURFACE_TRANSLATIONS[definition.id]]) {
        const namespaces = source as Readonly<Record<string, Readonly<Record<string, string>>>>
        for (const [namespace, dictionary] of Object.entries(namespaces)) {
          dictionaries[namespace] = { ...dictionaries[namespace], ...dictionary }
        }
      }
      dictionaries['desktop-shell'] = {
        ...dictionaries['desktop-shell'],
        ...(definition.id === 'ru' ? ru : DOWNLOAD_NETWORK_TRANSLATIONS[definition.id]),
      }
      for (const [namespace, dictionary] of Object.entries(dictionaries)) {
        disposers.push(ctx.locale.register(namespace, definition.id, dictionary))
      }
    }
  } catch (error) {
    for (const dispose of disposers.reverse()) dispose()
    throw error
  }
  return () => {
    for (const dispose of disposers.reverse()) dispose()
  }
}
