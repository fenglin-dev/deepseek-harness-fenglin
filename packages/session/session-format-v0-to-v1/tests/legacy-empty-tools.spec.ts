import { describe, expect, it } from 'vitest'
import type { SessionFormatEvent } from '@deepseek-ai/dsh-session-format'
import { LegacyEmptyTools } from '../src/legacy-empty-tools.ts'

/** A historical failed turn whose adapter emitted two empty tool identities. */
function legacyEmptyToolCallLog(): SessionFormatEvent[] {
  return [
    { type: 'turn/start', seq: 0, time: 1, data: { turn: 1 } },
    {
      type: 'user/message', seq: 1, time: 2, surfaceOp: 'append',
      data: {
        id: 'legacy-empty-user', role: 'user',
        content: [{ type: 'text', text: 'inspect files' }], source: { kind: 'user' },
      },
    },
    { type: 'step/start', seq: 2, time: 3, data: { turn: 1, step: 1 } },
    {
      type: 'assistant/message', seq: 3, time: 4, surfaceOp: 'append',
      data: {
        turn: 1, step: 1,
        message: {
          id: 'legacy-empty-assistant', role: 'assistant',
          content: [
            { type: 'text', text: 'checking' },
            { type: 'tool-call', id: '', name: '', arguments: '{"path":"/fixture-a"}' },
            { type: 'tool-call', id: '', name: '', arguments: '{"path":"/fixture-b"}' },
          ],
          source: { kind: 'model', provider: 'mock', model: 'mock' },
        },
      },
    },
    {
      type: 'tool/call', seq: 4, time: 5,
      data: { turn: 1, step: 1, callId: '', name: '', arguments: '{"path":"/fixture-a"}' },
    },
    {
      type: 'tool/result', seq: 5, time: 6, surfaceOp: 'append', sourceEventSeqs: [4],
      data: {
        turn: 1, step: 1,
        message: {
          id: 'legacy-empty-result-a', role: 'user', source: { kind: 'tool', callId: '' },
          content: [{ type: 'tool-result', toolCallId: '', content: [], isError: true }],
        },
        error: { name: 'ToolNotFoundError', code: 'UNKNOWN_TOOL' },
      },
    },
    {
      type: 'tool/call', seq: 6, time: 7,
      data: { turn: 1, step: 1, callId: '', name: '', arguments: '{"path":"/fixture-b"}' },
    },
    {
      type: 'tool/result', seq: 7, time: 8, surfaceOp: 'append', sourceEventSeqs: [6],
      data: {
        turn: 1, step: 1,
        message: {
          id: 'legacy-empty-result-b', role: 'user', source: { kind: 'tool', callId: '' },
          content: [{ type: 'tool-result', toolCallId: '', content: [], isError: true }],
        },
        error: { name: 'ToolNotFoundError', code: 'UNKNOWN_TOOL' },
      },
    },
    { type: 'step/end', seq: 8, time: 9, data: { turn: 1, step: 1 } },
    { type: 'turn/end', seq: 9, time: 10, data: { turn: 1, reason: { kind: 'completed' } } },
  ]
}


function repair(events: SessionFormatEvent[]): SessionFormatEvent[] {
  const output: SessionFormatEvent[] = []
  const stage = new LegacyEmptyTools('fixture')
  for (const event of events) stage.accept(event, item => output.push(item))
  stage.finish()
  return output
}

describe('legacy empty tool recovery', () => {
  it('preserves original events and assigns matching stable identities to failed pairs', () => {
    const events = legacyEmptyToolCallLog()
    const original = JSON.stringify(events)
    const output = repair(events)
    expect(JSON.stringify(events)).toBe(original)
    expect(output).toHaveLength(events.length)
    expect(output[4]?.data).toMatchObject({ callId: 'legacy-empty-tool-call:fixture:4', name: 'legacy_invalid_tool' })
    expect(output[5]?.data).toMatchObject({ message: { source: { callId: 'legacy-empty-tool-call:fixture:4' } } })
    expect(repair(events)).toEqual(output)
  })

  it('refuses successful, incomplete and non-adjacent results', () => {
    const events = legacyEmptyToolCallLog()
    const modified = JSON.parse(JSON.stringify(events)) as SessionFormatEvent[]
    modified[5] = { ...modified[5]!, data: { ...modified[5]!.data as object, error: { code: 'OTHER' } } }
    expect(() => repair(modified)).toThrow('ambiguous')
    expect(() => repair(events.slice(0, 6))).toThrow('incomplete')
    expect(() => repair([...events.slice(0, 4), events[8]!, ...events.slice(4)])).toThrow('ambiguous')
  })
})
