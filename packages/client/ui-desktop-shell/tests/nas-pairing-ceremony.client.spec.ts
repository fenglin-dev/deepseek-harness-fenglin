import { describe, expect, it, vi } from 'vitest'
import { createNasPairingCeremony } from '../src/client/nas-pairing-ceremony.ts'
import type { NasRuntimeStatus } from '../src/client/bridge.ts'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((accept, fail) => { resolve = accept; reject = fail })
  return { promise, resolve, reject }
}

const status: NasRuntimeStatus = {
  selection: { kind: 'local' }, servers: [], secureStorageAvailable: true,
}

describe('NAS Pairing Ceremony', () => {
  it('binds a fingerprint to the inspected address and invalidates it when the address changes', async () => {
    const inspect = vi.fn(async () => ({ fingerprint: 'AA:BB' }))
    const ceremony = createNasPairingCeremony({ inspect, pair: vi.fn() })
    ceremony.send({ type: 'edit', field: 'baseUrl', value: 'https://nas-a.example.com' })
    await ceremony.inspect()
    expect(ceremony.getSnapshot().stage).toMatchObject({
      phase: 'reviewing', inspection: { baseUrl: 'https://nas-a.example.com', fingerprint: 'AA:BB' },
    })
    ceremony.send({ type: 'trust', trusted: true })
    ceremony.send({ type: 'edit', field: 'baseUrl', value: 'https://nas-b.example.com' })
    expect(ceremony.getSnapshot()).toMatchObject({ stage: { phase: 'editing' }, canPair: false })
  })

  it('ignores a late inspection result after the address changes', async () => {
    const first = deferred<{ fingerprint: string }>()
    const ceremony = createNasPairingCeremony({ inspect: () => first.promise, pair: vi.fn() })
    ceremony.send({ type: 'edit', field: 'baseUrl', value: 'https://nas-a.example.com' })
    const pending = ceremony.inspect()
    ceremony.send({ type: 'edit', field: 'baseUrl', value: 'https://nas-b.example.com' })
    first.resolve({ fingerprint: 'OLD' })
    await pending
    expect(ceremony.getSnapshot()).toMatchObject({
      draft: { baseUrl: 'https://nas-b.example.com' }, stage: { phase: 'editing' },
    })
  })

  it('pairs only after confirmation and uses the inspected address', async () => {
    const pair = vi.fn(async () => status)
    const ceremony = createNasPairingCeremony({
      inspect: async () => ({ fingerprint: 'AA:BB' }), pair,
    })
    ceremony.send({ type: 'edit', field: 'baseUrl', value: 'https://nas.example.com' })
    ceremony.send({ type: 'edit', field: 'deviceName', value: 'Mac mini' })
    ceremony.send({ type: 'edit', field: 'code', value: '12345678' })
    await ceremony.inspect()
    expect(await ceremony.pair()).toBeUndefined()
    ceremony.send({ type: 'trust', trusted: true })
    expect(await ceremony.pair()).toBe(status)
    expect(pair).toHaveBeenCalledWith({
      baseUrl: 'https://nas.example.com', code: '12345678', deviceName: 'Mac mini',
      certificateFingerprint: 'AA:BB',
    })
    expect(ceremony.getSnapshot()).toMatchObject({
      draft: { baseUrl: 'https://nas.example.com', deviceName: 'Mac mini', code: '' },
      stage: { phase: 'editing' },
    })
  })

  it('keeps a confirmed inspection after a pairing failure at the same address', async () => {
    const ceremony = createNasPairingCeremony({
      inspect: async () => ({ fingerprint: 'AA:BB' }),
      pair: async () => { throw new Error('pairing failed') },
    })
    ceremony.send({ type: 'edit', field: 'baseUrl', value: 'https://nas.example.com' })
    ceremony.send({ type: 'edit', field: 'deviceName', value: 'Mac mini' })
    ceremony.send({ type: 'edit', field: 'code', value: '12345678' })
    await ceremony.inspect()
    ceremony.send({ type: 'trust', trusted: true })
    await ceremony.pair()
    expect(ceremony.getSnapshot()).toMatchObject({
      stage: { phase: 'reviewing', trusted: true }, error: 'pairing failed', canPair: true,
    })
  })

  it('reports inspection failure and ignores completion after disposal', async () => {
    const failed = createNasPairingCeremony({
      inspect: async () => { throw new Error('inspection failed') }, pair: vi.fn(),
    })
    failed.send({ type: 'edit', field: 'baseUrl', value: 'https://nas.example.com' })
    await failed.inspect()
    expect(failed.getSnapshot()).toMatchObject({ stage: { phase: 'editing' }, error: 'inspection failed' })

    const pending = deferred<{ fingerprint: string }>()
    const disposed = createNasPairingCeremony({ inspect: () => pending.promise, pair: vi.fn() })
    disposed.send({ type: 'edit', field: 'baseUrl', value: 'https://nas.example.com' })
    const operation = disposed.inspect()
    disposed.dispose()
    pending.resolve({ fingerprint: 'AA:BB' })
    await operation
    expect(disposed.getSnapshot().stage.phase).toBe('inspecting')
  })
})
