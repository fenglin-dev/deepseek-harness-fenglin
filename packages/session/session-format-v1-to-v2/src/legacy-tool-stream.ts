import { isDeepStrictEqual } from 'node:util'
import { AssistantStreamAccumulator, BlockAssembler, expandAssistantStream } from '@deepseek-ai/dsh-llm'
import type { AssistantStreamRecord, ContentBlock } from '@deepseek-ai/dsh-llm'
import { SessionFormatError } from '@deepseek-ai/dsh-session-format'

/**
 * Mirror proven legacy failed-call identities into their stream without changing other content.
 * @param stream - historical timed stream, never mutated.
 * @param content - message blocks already repaired by the failed-call normalizer.
 * @param sessionId - source Session identity used by the normalizer.
 * @returns the unchanged stream or a detached stream with aligned final blocks.
 * @throws {SessionFormatError} when content, ordering or final blocks cannot be aligned exactly.
 */
export function repairLegacyToolStream(
  stream: readonly AssistantStreamRecord[],
  content: readonly ContentBlock[],
  sessionId: string,
): readonly AssistantStreamRecord[] {
  const prefix = `legacy-empty-tool-call:${sessionId}:`
  if (!content.some(b => b.type === 'tool-call' && b.name === 'legacy_invalid_tool' && b.id.startsWith(prefix))) return stream
  const timed = expandAssistantStream(stream)
  if (timed.length === 0) return stream
  const assembler = new BlockAssembler()
  const indexes = new Set<number>()
  for (const { chunk } of timed) {
    if ('index' in chunk) indexes.add(chunk.index)
    assembler.push(chunk)
  }
  const blocks = assembler.blocks()
  const order = [...indexes]
  if (blocks.length !== content.length || order.length !== blocks.length) {
    throw new SessionFormatError('legacy repaired tool stream has ambiguous block ordering')
  }
  const replacements = new Map<number, Extract<ContentBlock, { type: 'tool-call' }>>()
  const aligned = blocks.map((block, position) => {
    const target = content[position]
    if (block.type !== 'tool-call' || block.id !== '' || block.name !== ''
      || target?.type !== 'tool-call' || target.name !== 'legacy_invalid_tool'
      || !target.id.startsWith(prefix) || block.arguments !== target.arguments) return block
    const index = order[position]
    if (index === undefined) throw new SessionFormatError('legacy repaired tool stream lacks a block index')
    replacements.set(index, target)
    return target
  })
  if (!isDeepStrictEqual(aligned, content)) throw new SessionFormatError('legacy repaired tool stream disagrees with message content')
  const output = new AssistantStreamAccumulator()
  for (const { time, chunk } of timed) {
    const target = 'index' in chunk ? replacements.get(chunk.index) : undefined
    if (target && chunk.type === 'block-end' && chunk.block.type === 'tool-call') {
      if (chunk.block.id !== '' || chunk.block.name !== '' || chunk.block.arguments !== target.arguments) {
        throw new SessionFormatError('legacy repaired tool stream has conflicting final identity')
      }
      output.push({ chunk: { ...chunk, block: target }, time })
    } else {
      output.push({ chunk, time })
    }
  }
  const result = output.snapshot()
  const verified = new BlockAssembler()
  for (const { chunk } of expandAssistantStream(result)) verified.push(chunk)
  if (!isDeepStrictEqual(verified.blocks(), content)) throw new SessionFormatError('legacy repaired tool stream lacks a matching final block')
  return result
}
