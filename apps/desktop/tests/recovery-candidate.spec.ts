import { describe, expect, it, vi } from 'vitest'
import { activateOrDiscardRecoveryCandidate } from '../src/recovery-candidate.ts'

describe('recovery candidate activation', () => {
  it('does not discard a candidate that activates successfully', async () => {
    const discard = vi.fn(async () => undefined)
    await activateOrDiscardRecoveryCandidate({ activate: vi.fn(async () => undefined), discard })
    expect(discard).not.toHaveBeenCalled()
  })

  it('discards and releases a candidate before returning its activation failure', async () => {
    const activation = new Error('candidate Doctor failed')
    const discard = vi.fn(async () => undefined)
    const onRollback = vi.fn(async () => undefined)
    await expect(activateOrDiscardRecoveryCandidate({
      activate: vi.fn(async () => { throw activation }), discard, onRollback,
    })).rejects.toBe(activation)
    expect(discard).toHaveBeenCalledOnce()
    expect(onRollback).toHaveBeenCalledOnce()
  })

  it('reports a rollback failure while retaining the activation failure as its cause', async () => {
    const activation = new Error('candidate Doctor failed')
    const operation = activateOrDiscardRecoveryCandidate({
      activate: vi.fn(async () => { throw activation }),
      discard: vi.fn(async () => { throw new Error('lease release failed') }),
    })
    await expect(operation).rejects.toThrow('lease release failed')
    await operation.catch((error: unknown) => {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).cause).toBe(activation)
    })
  })
})
