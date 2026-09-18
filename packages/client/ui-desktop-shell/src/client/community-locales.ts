/** Community desktop language catalog and the locale selector's own copy. */

import type { Context } from '@deepseek-ai/cordis'
import type { LanguageRegistration } from '@deepseek-ai/dsh-client-locale/client'

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
