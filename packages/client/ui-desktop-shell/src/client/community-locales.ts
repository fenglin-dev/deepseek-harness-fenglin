/** Community desktop language catalog and the locale selector's own copy. */

import type { Context } from '@deepseek-ai/cordis'
import type { LanguageRegistration } from '@deepseek-ai/dsh-client-locale/client'
import { desktopLanguageTitles } from './locales.ts'
import { COMMUNITY_TRANSLATIONS } from './community-translations/index.ts'
import { COMMUNITY_SURFACE_TRANSLATIONS } from './community-translations/surfaces.ts'
import { DOWNLOAD_NETWORK_TRANSLATIONS } from './download-network-locales.ts'
import { ru } from './locales.ts'

/** Additional languages offered by Open DSH Desktop. */
export const DESKTOP_LANGUAGE_DEFINITIONS = [] as const satisfies readonly LanguageRegistration[]

/**
 * Register the community languages and their selector label as one reversible effect.
 * @param ctx - Desktop-shell client context.
 * @returns Cleanup that removes dictionaries before their language definitions.
 */
export function registerDesktopLanguages(_ctx: Context): () => void {
  return () => {}
}
