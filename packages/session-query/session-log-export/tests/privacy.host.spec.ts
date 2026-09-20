import { describe, expect, it } from 'vitest'
import { redactCustomInstructionsInSessionLog } from '../src/archive.ts'

function runtimeEvent(sections: readonly { name: string; text: string }[]): string {
  return JSON.stringify({
    type: 'user/message', seq: 0, time: 1, surfaceOp: 'append',
    data: {
      role: 'user',
      content: [{ type: 'text', text: 'secret current runtime context' }],
      source: {
        kind: 'plugin', plugin: '@deepseek-ai/dsh-system-prompt', form: 'snapshot', sections,
      },
    },
  })
}

describe('custom-prompt diagnostic redaction', () => {
  it('removes plaintext, keeps version attribution, and retains other runtime context', () => {
    const input = `${JSON.stringify({ type: 'session', version: 3 })}\n${runtimeEvent([
      { name: 'sandbox', text: 'Sandbox remains.' },
      { name: 'custom-instructions:global', text: '<custom-instructions scope="global" version="prompt-v1">\nsecret guidance\n</custom-instructions>' },
    ])}\n`
    const redacted = redactCustomInstructionsInSessionLog(input)
    expect(redacted).not.toContain('secret guidance')
    expect(redacted).not.toContain('secret current runtime context')
    expect(redacted).toContain('Sandbox remains.')
    expect(redacted).toContain('prompt-v1')
    expect(redacted.endsWith('\n')).toBe(true)
  })

  it('replaces a custom-only snapshot with a non-plaintext notice', () => {
    const redacted = redactCustomInstructionsInSessionLog(`${runtimeEvent([
      { name: 'custom-instructions:workspace', text: '<custom-instructions scope="workspace:w" version="project-v2">\nprivate\n</custom-instructions>' },
    ])}\n`)
    const event = JSON.parse(redacted.trim()) as { data: { source: { form: string; summary: string }; content: Array<{ text: string }> } }
    expect(event.data.source.form).toBe('notice')
    expect(event.data.source.summary).toContain('project-v2')
    expect(event.data.content[0]?.text).not.toContain('private')
  })
})
