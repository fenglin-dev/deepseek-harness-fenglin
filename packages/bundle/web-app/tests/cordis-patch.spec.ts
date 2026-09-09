import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('Web bundle composition', () => {
  it('exposes the Web carrier to Connection for dedicated plugin RPC routes', async () => {
    const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
    expect(patch).toMatch(
      /- id: connection[\s\S]*?name: '@deepseek-ai\/dsh-client-connection'[\s\S]*?inject: \[webRuntime, webServer\]/,
    )
  })
})
