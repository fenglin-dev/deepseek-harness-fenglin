import { describe, expect, it, vi } from 'vitest'
import { candidatePreparationUsesLease, prepareDesktopCandidate, CandidatePreparationError } from '../src/candidate-preparation.ts'
import { HarnessInvocationError } from '../src/harness-invocation.ts'

describe('candidate preparation ownership', () => {
  const record = { id: 'owned', producerPid: 100, phase: 'preparing' }
  const missing = { active: false, state: 'missing' as const, lockPath: '/unused' }

  it('permits rollback after worker exit without a surviving lease', () => {
    expect(candidatePreparationUsesLease('owned', 100, record, missing)).toBe(false)
  })

  it('uses only the current desktop lease', () => {
    expect(candidatePreparationUsesLease('owned', 100, record, {
      ...missing, active: true, state: 'live', pid: 100, operationKind: 'desktop-mutation-lease',
    })).toBe(true)
  })

  it('uses the current desktop lease after its recorded worker exits', () => {
    expect(candidatePreparationUsesLease('owned', 100, record, {
      ...missing, active: true, state: 'live', pid: 100, workerPid: 200, workerActive: false,
      operationKind: 'desktop-mutation-lease',
    })).toBe(true)
  })

  it.each([
    { ...record, id: 'other' },
    { ...record, producerPid: 200 },
    { ...record, phase: 'activated' },
  ])('rejects a foreign or activated journal: %j', (journal) => {
    expect(() => candidatePreparationUsesLease('owned', 100, journal, missing)).toThrow('different or activated')
  })

  it.each([
    { ...missing, active: true, state: 'malformed' as const },
    { ...missing, active: true, state: 'live' as const, pid: 200 },
    { ...missing, active: true, state: 'live' as const, pid: 100, workerPid: 200, workerActive: true,
      operationKind: 'desktop-mutation-lease' },
  ])('rejects unconfirmed worker exit: %j', (lock) => {
    expect(() => candidatePreparationUsesLease('owned', 100, record, lock)).toThrow('exit is not confirmed')
  })

  it('assigns identity before launch and selects only matching output', async () => {
    const cleanup = vi.fn()
    const id = await prepareDesktopCandidate({
      prepare: async id => JSON.stringify({ id }), parse: JSON.parse, cleanup, cleanupFailed: vi.fn(),
    })
    expect(id).toMatch(/^[0-9a-f-]{36}$/u)
    expect(cleanup).not.toHaveBeenCalled()
  })

  it('cleans a timed-out attempt with its preallocated ID before returning failure', async () => {
    let attempted = ''
    const cleanup = vi.fn(async (id: string) => { expect(id).toBe(attempted) })
    const failure = new HarnessInvocationError({ operationId: 'test', kind: 'plugin-candidate-prepare', reason: 'timeout', durationMs: 60000, message: 'timeout' })
    await expect(prepareDesktopCandidate({
      prepare: async (id) => { attempted = id; throw failure }, parse: JSON.parse, cleanup, cleanupFailed: vi.fn(),
    })).rejects.toBeInstanceOf(CandidatePreparationError)
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('retains the journal when process-tree exit cannot be confirmed', async () => {
    const cleanup = vi.fn()
    const cleanupFailed = vi.fn()
    await expect(prepareDesktopCandidate({ prepare: async () => { throw new Error('cleanup remains unconfirmed') }, parse: JSON.parse, cleanup, cleanupFailed })).rejects.toBeInstanceOf(CandidatePreparationError)
    expect(cleanup).not.toHaveBeenCalled()
    expect(cleanupFailed).toHaveBeenCalledOnce()
  })

  it('recovers mismatched output and reports cleanup failure without selecting a candidate', async () => {
    const cleanupFailed = vi.fn()
    await expect(prepareDesktopCandidate({ prepare: async () => '{"id":"other"}', parse: JSON.parse,
      cleanup: async () => { throw new Error('foreign journal') }, cleanupFailed,
    })).rejects.toThrow('journal retained')
    expect(cleanupFailed).toHaveBeenCalledOnce()
  })
})
