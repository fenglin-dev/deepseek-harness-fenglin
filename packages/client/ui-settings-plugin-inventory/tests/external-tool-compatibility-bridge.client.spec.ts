import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveExternalToolInstallRequest } from '../src/client/external-tool-compatibility-bridge.ts'

afterEach(() => {
  delete (globalThis as typeof globalThis & { deepSeekHarnessDesktop?: unknown }).deepSeekHarnessDesktop
})

describe('external tool compatibility bridge', () => {
  it('asks desktop main to resolve a closed tool id', async () => {
    const resolve = vi.fn(async () => ({
      toolId: 'codex' as const,
      packageSpec: '@deepseek-ai/dsh-subagent-codex@0.1.2-alpha.5',
    }))
    ;(globalThis as typeof globalThis & { deepSeekHarnessDesktop?: unknown }).deepSeekHarnessDesktop = {
      externalTools: { resolve },
    }

    await expect(resolveExternalToolInstallRequest('codex')).resolves.toEqual({
      profile: 'web',
      packageSpec: '@deepseek-ai/dsh-subagent-codex@0.1.2-alpha.5',
    })
    expect(resolve).toHaveBeenCalledWith('codex')
  })

  it('uses the exact embedded browser fallback without a desktop bridge', async () => {
    await expect(resolveExternalToolInstallRequest('claude-code')).resolves.toEqual({
      profile: 'web',
      packageSpec: '@deepseek-ai/dsh-subagent-claude-code@0.1.2-alpha.5',
    })
  })
})
