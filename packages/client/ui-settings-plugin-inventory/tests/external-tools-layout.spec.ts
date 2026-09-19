import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL(
  '../src/client/ExternalToolsSection.module.css',
  import.meta.url,
)), 'utf8')

function singleColumnBreakpoint(source: string): number {
  const match = source.match(/@container external-tools-settings \(max-width: (\d+)px\)/u)
  if (match?.[1] === undefined) throw new Error('external tools container breakpoint is missing')
  return Number(match[1])
}

describe('external tools responsive grid', () => {
  it('keeps two columns in the normal desktop Settings content width', () => {
    const normalDesktopContentWidth = 540
    expect(normalDesktopContentWidth).toBeGreaterThan(singleColumnBreakpoint(css))
  })

  it('collapses to one column in a genuinely narrow Settings content width', () => {
    const compactContentWidth = 480
    expect(compactContentWidth).toBeLessThanOrEqual(singleColumnBreakpoint(css))
  })
})
