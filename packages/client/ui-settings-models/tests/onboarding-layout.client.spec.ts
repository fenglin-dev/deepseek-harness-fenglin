/** Onboarding geometry contract for short windows. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

function stylesheet(name: string): string {
  return readFileSync(fileURLToPath(new URL(`../src/client/${name}`, import.meta.url)), 'utf8')
}

/** Read one exact selector's declarations from a CSS module source. */
function declarations(css: string, selector: string): Map<string, string> {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, ' ')
  for (const [, selectors = '', body = ''] of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectors.split(',').map(value => value.trim()).includes(selector)) continue
    const found = new Map<string, string>()
    for (const part of body.split(';')) {
      const colon = part.indexOf(':')
      if (colon === -1) continue
      found.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim().replace(/\s+/g, ' '))
    }
    return found
  }
  return new Map()
}

describe('settings onboarding geometry', () => {
  it('fits every surface to its renderer viewport', () => {
    const onboarding = stylesheet('OnboardingModal.module.css')
    const wizard = stylesheet('SetupWizard.module.css')
    expect(declarations(onboarding, '.content').get('max-height'))
      .toBe('calc(100vh - 48px)')
    expect(declarations(wizard, '.dialog').get('height'))
      .toBe('min(820px, calc(100vh - 48px))')
    expect(declarations(wizard, '.dialog').get('--dsh-scrollbar-thumb'))
      .toBe('var(--dsw-alias-scrollbar-bg-l2)')
  })

  it('keeps both wizard columns reachable in a short window', () => {
    const wizard = stylesheet('SetupWizard.module.css')
    for (const selector of ['.rail', '.main']) {
      const rule = declarations(wizard, selector)
      expect(rule.get('min-height')).toBe('0')
      expect(rule.get('overflow-y')).toBe('auto')
      expect(rule.get('overscroll-behavior')).toBe('contain')
    }
  })
})
