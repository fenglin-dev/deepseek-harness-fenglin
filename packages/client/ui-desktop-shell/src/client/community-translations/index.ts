/** Complete static dictionaries for the community desktop locales. */

import de from './de.ts'
import es from './es.ts'
import fr from './fr.ts'
import ja from './ja.ts'
import ko from './ko.ts'
import ptBR from './pt-BR.ts'
import ru from './ru.ts'

/** Dictionaries keyed by the locale identifiers exposed by Desktop. */
export const COMMUNITY_TRANSLATIONS = {
  ja,
  ko,
  es,
  fr,
  de,
  'pt-BR': ptBR,
  ru,
} as const
