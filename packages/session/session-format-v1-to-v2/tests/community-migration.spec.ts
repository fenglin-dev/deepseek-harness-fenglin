import { describe, expect, it } from 'vitest'
import { createSessionFormatCatalog } from '@deepseek-ai/dsh-session-format'
import type { SessionFormatEvent } from '@deepseek-ai/dsh-session-format'
import { releasedV0SessionFormatCodec, releasedV1SessionFormatCodec, sessionFormatV0ToV1 } from '@deepseek-ai/dsh-session-format-v0-to-v1'
import { assertReleasedV2Header, releasedV2SessionFormatCodec, sessionFormatV1ToV2 } from '../src/index.ts'
import { assertReleasedV2Artifact } from '../src/testing/validation.ts'

const catalog = createSessionFormatCatalog({
  currentVersion: 2,
  codecs: [releasedV0SessionFormatCodec, releasedV1SessionFormatCodec, releasedV2SessionFormatCodec],
  currentEncoder: releasedV2SessionFormatCodec,
  migrations: [sessionFormatV0ToV1, sessionFormatV1ToV2],
  restoreCurrent(artifact) {
    assertReleasedV2Artifact(artifact)
    return artifact
  },
  restoreTransformedCurrent(artifact) {
    assertReleasedV2Artifact(artifact)
    return artifact
  },
  restoreCurrentHeader(header) {
    assertReleasedV2Header(header)
    return header
  },
})

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

describe('Community Desktop historical migrations', () => {
  it.each([0, 1])('preserves empty packed tool identities from v%i as raw v2 deltas', (version) => {
    for (const identity of [{ id: '', name: '' }, { id: '', name: 'read' }, { id: 'call', name: '' }]) {
      const rows = [
        { type: 'turn/start', seq: 0, time: 1, data: { turn: 1 } },
        { type: 'step/start', seq: 1, time: 2, data: { turn: 1, step: 1 } },
        { type: 'tool-call-chunks', seq0: 2, time0: 3,
          data: { turn: 1, step: 1, index: 0, ...identity, dt: [2], args: ['{', '}'] } },
        { type: 'step/end', seq: 4, time: 6, data: { turn: 1, step: 1 } },
        { type: 'turn/end', seq: 5, time: 7, data: { turn: 1, reason: { kind: 'completed' } } },
      ]
      const original = JSON.stringify(rows)
      const restore = catalog.createRestore({ type: 'session', version, id: 'empty-deltas', createdAt: 1, delegationDepth: 0 }, { recovery: 'strict', validation: 'current' })
      for (const row of rows) restore.decodeRow(row)
      const migrated = restore.finish()
      expect(migrated.events[2]?.data).toEqual({ turn: 1, step: 1, stream: [
        { type: 'chunk', time: 3, chunk: { type: 'tool-call-delta', index: 0, ...identity, argumentsDelta: '{' } },
        { type: 'chunk', time: 5, chunk: { type: 'tool-call-delta', index: 0, ...identity, argumentsDelta: '}' } },
      ] })
      expect(migrated.events.filter(e => e.type === 'assistant/message' || e.type === 'tool/result')).toHaveLength(0)
      const reopen = catalog.createRestore(releasedV2SessionFormatCodec.encodeHeader(migrated.header, migrated.inheritedEventCount), { recovery: 'strict', validation: 'current' })
      for (const row of migrated.events) reopen.decodeRow(row)
      expect(reopen.finish()).toEqual(migrated)
      expect(JSON.stringify(rows)).toBe(original)
    }
  })
  it.each([0, 1])('migrates failed empty tool calls from v%i and reopens v2 without changing the source', (version) => {
    const rows = legacyEmptyToolCallLog()
    const original = JSON.stringify(rows)
    const header = { type: 'session', version, id: 'legacy', createdAt: 1, delegationDepth: 0 }
    const restore = catalog.createRestore(header, { recovery: 'strict', validation: 'current' })
    for (const row of rows) restore.decodeRow(row)
    const migrated = restore.finish()
    expect(migrated.header.version).toBe(2)
    expect(JSON.stringify(rows)).toBe(original)
    expect(migrated.events.filter(e => e.type === 'tool/result')).toHaveLength(2)
    const current = catalog.createRestore(releasedV2SessionFormatCodec.encodeHeader(migrated.header, migrated.inheritedEventCount), { recovery: 'strict', validation: 'current' })
    for (const row of migrated.events) current.decodeRow(row)
    expect(current.finish()).toEqual(migrated)
  })
  it.each([0, 1])('retains the rc.1 external-tools audit event from v%i', (version) => {
    const restore = catalog.createRestore({ type: 'session', version, id: 'audit', createdAt: 1, delegationDepth: 0 }, { recovery: 'strict', validation: 'current' })
    restore.decodeRow({ type: 'external-tools/resolved', seq: 0, time: 1, data: { turn: 1, step: 1, tools: ['codex', 'claude-code'] } })
    expect(restore.finish().events[0]?.data).toEqual({ turn: 1, step: 1, tools: ['codex', 'claude-code'] })
  })
})
