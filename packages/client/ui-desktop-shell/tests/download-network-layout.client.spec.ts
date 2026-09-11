import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('download network responsive layout', () => {
  it('wraps long localized actions and collapses headings in narrow settings panels', () => {
    const css = readFileSync(new URL('../src/client/DesktopShell.module.css', import.meta.url), 'utf8')
    expect(css).toMatch(/\.networkActions\s*\{[^}]*flex-wrap:\s*wrap/su)
    expect(css).toMatch(/@media \(max-width: 620px\)[\s\S]*\.networkHeading\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/u)
    expect(css).toMatch(/\.networkActions > \*\s*\{[^}]*flex:\s*1 1 140px/su)
  })
})
