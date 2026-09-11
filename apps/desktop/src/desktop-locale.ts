/** Shared locale selection for Electron-owned pages, menus, and notifications. */

/** Locale ids exposed by the community desktop distribution. */
export const DESKTOP_LOCALE_IDS = ['zh', 'en', 'ru', 'es', 'fr', 'pt-BR', 'de', 'ja', 'ko'] as const

/** Locale id understood by desktop-owned UI. */
export type DesktopLocaleId = typeof DESKTOP_LOCALE_IDS[number]

/** One self-named locale option. */
export interface DesktopLocaleDefinition {
  readonly id: DesktopLocaleId
  readonly label: string
}

/** Stable display order shared by language pickers. */
export const DESKTOP_LOCALES: readonly DesktopLocaleDefinition[] = Object.freeze([
  { id: 'zh', label: '\u4e2d\u6587' },
  { id: 'en', label: 'English' },
  { id: 'ru', label: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439' },
  { id: 'es', label: 'Espa\u00f1ol' },
  { id: 'fr', label: 'Fran\u00e7ais' },
  { id: 'pt-BR', label: 'Portugu\u00eas (Brasil)' },
  { id: 'de', label: 'Deutsch' },
  { id: 'ja', label: '\u65e5\u672c\u8a9e' },
  { id: 'ko', label: '\ud55c\uad6d\uc5b4' },
])

const exactIds = new Map(DESKTOP_LOCALE_IDS.map(id => [id.toLowerCase(), id] as const))
const primaryIds = new Map<string, DesktopLocaleId>([
  ['zh', 'zh'], ['en', 'en'], ['ja', 'ja'], ['ko', 'ko'], ['es', 'es'],
  ['fr', 'fr'], ['de', 'de'], ['pt', 'pt-BR'], ['ru', 'ru'],
])

/** Resolve the first supported BCP 47-style tag, falling back to English. */
export function resolveDesktopLocale(tags: string | readonly string[]): DesktopLocaleId {
  const values = typeof tags === 'string' ? [tags] : tags
  for (const value of values) {
    const normalized = value.trim().replaceAll('_', '-').toLowerCase()
    const exact = exactIds.get(normalized)
    if (exact !== undefined) return exact
    const primary = primaryIds.get(normalized.split('-')[0] ?? '')
    if (primary !== undefined) return primary
  }
  return 'en'
}

/** Select a localized dictionary with an explicit English fallback. */
export function desktopDictionary<T>(
  locale: string | readonly string[],
  dictionaries: Readonly<{ en: T } & Partial<Record<DesktopLocaleId, T>>>,
): T {
  return dictionaries[resolveDesktopLocale(locale)] ?? dictionaries.en
}

/** Replace named placeholders without interpreting paths or user-provided values. */
export function formatDesktopCopy(template: string, values: Readonly<Record<string, unknown>>): string {
  return template.replace(/\{(\w+)\}/gu, (match, name: string) => name in values ? String(values[name]) : match)
}
