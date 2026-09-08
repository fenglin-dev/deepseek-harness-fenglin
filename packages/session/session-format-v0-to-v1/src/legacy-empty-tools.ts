import { SessionFormatError } from '@deepseek-ai/dsh-session-format'
import type { SessionFormatEvent, SessionFormatJsonObject } from '@deepseek-ai/dsh-session-format'

function object(value: unknown): SessionFormatJsonObject | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as SessionFormatJsonObject : undefined
}

/** Buffers only an empty-tool message and its adjacent failed call/result pairs. */
export class LegacyEmptyTools {
  private pending: SessionFormatEvent[] = []
  private expected = 0

  constructor(private readonly sessionId: string) {}

  /**
   * Retain all events and repair only proven UNKNOWN_TOOL failures before payload validation.
   * @param event - historical event in sequence order.
   * @param emit - downstream migration consumer.
   */
  accept(event: SessionFormatEvent, emit: (event: SessionFormatEvent) => void): void {
    if (this.pending.length === 0) {
      const message = object(object(event.data)?.['message'])
      const content = message?.['content']
      const tools = Array.isArray(content) ? content.map(object).filter(b => b?.['type'] === 'tool-call') : []
      if (event.type !== 'assistant/message' || tools.length === 0
        || tools.some(b => b?.['id'] !== '' || b['name'] !== '' || typeof b['arguments'] !== 'string')) {
        emit(event)
        return
      }
      this.expected = 1 + tools.length * 2
    }
    this.pending.push(event)
    if (this.pending.length !== this.expected) return
    const repaired = this.repair()
    this.pending = []
    for (const item of repaired) emit(item)
  }

  /** Refuse interrupted or non-adjacent pairs instead of dropping buffered evidence. */
  finish(): void {
    if (this.pending.length !== 0) throw new SessionFormatError('incomplete legacy empty tool call sequence')
  }

  private repair(): SessionFormatEvent[] {
    const assistant = this.pending[0]
    const data = object(assistant?.data)
    const message = object(data?.['message'])
    if (assistant === undefined || data === undefined || message === undefined) {
      throw new SessionFormatError('missing legacy empty tool message')
    }
    const content = [...message['content'] as SessionFormatJsonObject[]]
    const output = [...this.pending]
    let offset = 1
    for (const [index, block] of content.entries()) {
      if (object(block)?.['type'] !== 'tool-call') continue
      const call = this.pending[offset]
      const result = this.pending[offset + 1]
      if (call === undefined || result === undefined) throw new SessionFormatError('incomplete legacy empty tool pair')
      const callData = object(call.data)
      const resultData = object(result.data)
      const resultMessage = object(resultData?.['message'])
      const source = object(resultMessage?.['source'])
      const resultContent = resultMessage?.['content']
      const resultBlock = Array.isArray(resultContent) ? object(resultContent[0]) : undefined
      if (call.type !== 'tool/call' || result.type !== 'tool/result'
        || call.seq !== assistant.seq + offset || result.seq !== call.seq + 1
        || callData?.['turn'] !== data['turn'] || callData?.['step'] !== data['step']
        || callData?.['callId'] !== '' || callData['name'] !== ''
        || callData['arguments'] !== block['arguments']
        || resultData?.['turn'] !== data['turn'] || resultData?.['step'] !== data['step']
        || result.surfaceOp !== 'append' || !Array.isArray(result.sourceEventSeqs) || result.sourceEventSeqs.length !== 1
        || result.sourceEventSeqs[0] !== call.seq
        || object(resultData?.['error'])?.['code'] !== 'UNKNOWN_TOOL'
        || source?.['kind'] !== 'tool' || source['callId'] !== ''
        || !Array.isArray(resultContent) || resultContent.length !== 1
        || resultBlock?.['type'] !== 'tool-result' || resultBlock['toolCallId'] !== ''
        || resultBlock['isError'] !== true) {
        throw new SessionFormatError('ambiguous legacy empty tool call sequence')
      }
      const id = `legacy-empty-tool-call:${this.sessionId}:${call.seq}`
      content[index] = { ...block, id, name: 'legacy_invalid_tool' }
      output[offset] = { ...call, data: { ...callData, callId: id, name: 'legacy_invalid_tool' } }
      output[offset + 1] = { ...result, data: { ...resultData, message: {
        ...resultMessage, source: { ...source, callId: id },
        content: [{ ...resultBlock, toolCallId: id }],
      } } }
      offset += 2
    }
    output[0] = { ...assistant, data: { ...data, message: { ...message, content } } }
    return output
  }
}
