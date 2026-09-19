import { describe, expect, it } from 'vitest'
import { NAS_PROTOCOL_V1, NasProtocolViolation } from '../src/index.ts'

const health = {
  schema: 'open-deepseek-harness/nas-health/v1' as const,
  instanceId: 'nas-1', name: 'Home NAS', version: '0.1.6', protocolVersion: 1,
  platform: 'linux' as const, architecture: 'arm64' as const, pairingAvailable: true,
  pairingExpiresAt: '2026-09-18T12:00:00.000Z',
}
const device = {
  id: 'device-1', name: 'Mac mini',
  createdAt: '2026-09-18T12:00:00.000Z', expiresAt: '2026-12-17T12:00:00.000Z',
}

describe('NAS protocol v1', () => {
  it('pins every operation to its existing method and route', () => {
    expect(NAS_PROTOCOL_V1).toMatchObject({
      version: 1,
      health: { method: 'GET', path: '/nas/health' },
      pair: { method: 'POST', path: '/nas/pair' },
      devices: { method: 'GET', path: '/nas/devices' },
      revokeDevice: { method: 'POST', path: '/nas/devices' },
    })
  })

  it('round-trips the hand-written v1 documents', () => {
    const { schema: _healthSchema, ...healthFields } = health
    expect(NAS_PROTOCOL_V1.health.response.parse(health)).toEqual(health)
    expect(NAS_PROTOCOL_V1.health.response.create(healthFields)).toEqual(health)
    expect(NAS_PROTOCOL_V1.pair.request.parse({ code: '12345678', deviceName: 'Mac mini' }))
      .toEqual({ code: '12345678', deviceName: 'Mac mini' })
    const pairing = {
      schema: 'open-deepseek-harness/nas-pairing/v1' as const,
      deviceId: 'device-1', token: 't'.repeat(43), expiresAt: device.expiresAt, health,
    }
    const { schema: _pairingSchema, ...pairingFields } = pairing
    expect(NAS_PROTOCOL_V1.pair.response.parse(pairing)).toEqual(pairing)
    expect(NAS_PROTOCOL_V1.pair.response.create(pairingFields)).toEqual(pairing)
    expect(NAS_PROTOCOL_V1.devices.response.create([device])).toEqual({ devices: [device] })
    expect(NAS_PROTOCOL_V1.devices.response.parse({ devices: [device] })).toEqual({ devices: [device] })
    expect(NAS_PROTOCOL_V1.revokeDevice.request.parse({ revokeDeviceId: 'device-1' }))
      .toEqual({ revokeDeviceId: 'device-1' })
  })

  it.each([
    ['health', () => NAS_PROTOCOL_V1.health.response.parse({ ...health, schema: 'wrong' })],
    ['health', () => NAS_PROTOCOL_V1.health.response.parse({ ...health, protocolVersion: Number.NaN })],
    ['health', () => NAS_PROTOCOL_V1.health.response.parse({ ...health, architecture: 'riscv64' })],
    ['health', () => NAS_PROTOCOL_V1.health.response.parse({ ...health, pairingExpiresAt: 'not-a-date' })],
    ['pair-request', () => NAS_PROTOCOL_V1.pair.request.parse({ code: 12345678, deviceName: 'Mac' })],
    ['pairing', () => NAS_PROTOCOL_V1.pair.response.parse({ schema: 'open-deepseek-harness/nas-pairing/v1', deviceId: 'd', token: 'short', expiresAt: device.expiresAt, health })],
    ['pairing', () => NAS_PROTOCOL_V1.pair.response.parse({ schema: 'open-deepseek-harness/nas-pairing/v1', deviceId: 'd', token: 't'.repeat(43), expiresAt: device.expiresAt, health: {} })],
    ['devices', () => NAS_PROTOCOL_V1.devices.response.parse({ devices: [{ ...device, expiresAt: 'bad' }] })],
    ['devices', () => NAS_PROTOCOL_V1.devices.response.parse({ devices: 'bad' })],
    ['revoke-device-request', () => NAS_PROTOCOL_V1.revokeDevice.request.parse({})],
  ])('rejects an invalid %s document', (document, operation) => {
    expect(operation).toThrow(NasProtocolViolation)
    try { operation() } catch (error) { expect(error).toMatchObject({ document }) }
  })
})
