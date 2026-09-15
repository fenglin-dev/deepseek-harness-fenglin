import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const read = (name: string): string => readFileSync(
  fileURLToPath(new URL(`../src/client/skeleton/${name}`, import.meta.url)),
  'utf8',
)

describe('phone conversation layout', () => {
  it('uses the 680px boundary, dynamic viewport height, and no page-wide overflow', () => {
    const css = read('ConversationRoot.module.css')
    expect(css).toContain('@media (max-width: 680px)')
    expect(css).toContain('height: 100dvh')
    expect(css).toContain('--dsh-chat-content-width: calc(var(--dsh-conversation-column-width, 100vw) - 24px)')
    expect(css).toContain('overflow-x: hidden')
    expect(css).toMatch(/\.widthHandle\s*\{\s*display: none;/)
  })

  it('keeps the editor at 16px and primary composer controls at 44px', () => {
    const css = read('InputBar.module.css')
    expect(css).toContain('font-size: max(16px, var(--dsh-content-font-size, 14px))')
    expect(css).toMatch(/\.add,[\s\S]*?\.primary\s*\{[\s\S]*?width: 44px;[\s\S]*?height: 44px;/)
    expect(css).toMatch(/\.trailing\s*\{[\s\S]*?flex: 1 1 100%;/)
    expect(css).toContain('env(safe-area-inset-bottom)')
  })
})
