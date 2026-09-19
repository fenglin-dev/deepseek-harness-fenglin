/**
 * Theme bootstrap row for the browser's pre-plugin interval. Each index
 * render embeds the current durable built-in preference and content font size;
 * the browser resolves only `system`, then writes the same DOM fields
 * ui-layout's ThemePresenter owns after the client plugin tree activates.
 */

import type { IndexInjection } from '@deepseek-ai/dsh-host-webserver'
import { DEFAULT_FONT_SIZE, DEFAULT_PREFERENCE, type ThemePreference } from './theme-settings.ts'

const LIGHT_BACKGROUND = '#fff'
const DARK_BACKGROUND = '#151517'
const DARK_THEMES: ReadonlySet<ThemePreference> = new Set([
  'dark', 'ocean', 'moonlight', 'starlight', 'pirate', 'shinobi', 'rift',
])

/** CSS that colors the document canvas before any script can paint it. */
function bootThemeStyle(preference: ThemePreference): string {
  const light = `:root{color-scheme:light}body{background-color:${LIGHT_BACKGROUND};--dsh-boot-bg:${LIGHT_BACKGROUND}}`
  const dark = `:root{color-scheme:dark}body{background-color:${DARK_BACKGROUND};--dsh-boot-bg:${DARK_BACKGROUND}}`
  if (DARK_THEMES.has(preference)) return dark
  if (preference !== 'system') return light
  return `${light}@media(prefers-color-scheme:dark){${dark}}`
}

/** Build the inline script body for one schema-validated durable theme section. */
function bootThemeScript(preference: ThemePreference, fontSize: number): string {
  return `(() => {
  const preference = ${JSON.stringify(preference)}
  const systemDark = preference === 'system'
    && typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-color-scheme: dark)').matches
  const darkThemes = ['dark', 'ocean', 'moonlight', 'starlight', 'pirate', 'shinobi', 'rift']
  const dark = darkThemes.includes(preference) || systemDark
  const source = preference === 'system' ? 'system' : (dark ? 'dark' : 'light')
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.documentElement.setAttribute('data-dsh-color-scheme-source', source)
  document.documentElement.setAttribute('data-ds-theme-source', source)
  document.body.toggleAttribute('data-ds-dark-theme', dark)
  document.body.style.setProperty('--dsh-content-font-size', ${JSON.stringify(`${fontSize}px`)})
})()`
}

/**
 * The theme bootstrap as an injection row: an inline script immediately after
 * the opening body tag, before the shell mount and module script.
 * @param preference - Current Host-backed built-in preference.
 * @param fontSize - Current Host-backed content font size in px.
 * @returns the body script row.
 */
export function bootThemeInjection(
  preference: ThemePreference = DEFAULT_PREFERENCE,
  fontSize: number = DEFAULT_FONT_SIZE,
): IndexInjection {
  return { kind: 'script', placement: 'body', text: bootThemeScript(preference, fontSize) }
}

/**
 * Theme bootstrap rows in paint order: an immediate canvas palette followed
 * by the community Desktop-compatible source attributes and font-size script.
 * @param preference - Current Host-backed built-in preference.
 * @param fontSize - Current Host-backed content font size in px.
 * @returns the ordered style and script rows.
 */
export function bootThemeInjections(
  preference: ThemePreference = DEFAULT_PREFERENCE,
  fontSize: number = DEFAULT_FONT_SIZE,
): IndexInjection[] {
  return [
    { kind: 'style', text: bootThemeStyle(preference) },
    bootThemeInjection(preference, fontSize),
  ]
}
