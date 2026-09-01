/** Shared modal geometry contract for short viewports. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL('../src/Modal.module.css', import.meta.url)), 'utf8')

/** Read one exact selector's declarations from the CSS module source. */
function declarations(selector: string): Map<string, string> {
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

describe('Modal.module.css geometry', () => {
  it('fills its renderer viewport without a desktop-titlebar offset', () => {
    const root = declarations('.root')
    expect(root.get('inset')).toBe('0')
    expect(root.get('box-sizing')).toBe('border-box')
  })

  it('keeps dialog content reachable in short viewports', () => {
    const dialog = declarations('.dialog')
    expect(dialog.get('max-height')).toBe('100%')
    expect(dialog.get('--dsh-scrollbar-thumb')).toBe('var(--dsw-alias-scrollbar-bg-l2)')
    expect(dialog.get('--dsh-scrollbar-thumb-hover')).toBe('var(--dsw-alias-scrollbar-hover-l2)')
    const content = declarations('.content')
    expect(content.get('min-height')).toBe('0')
    expect(content.get('overflow-y')).toBe('auto')
  })
})
