/** NAS deployment authentication: public health, one-time pairing, and per-device grants. */

import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { credentialKey, type CredentialProvider, type CredentialRecord } from '@deepseek-ai/dsh-credentials'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import { isTrustedApiRequest } from './api-request-trust.ts'

const DEVICE_RECORD_KEY = credentialKey('client-connection', 'nas-devices')
const RECORD_VERSION = 1
const PAIRING_LIFETIME_MS = 10 * 60_000
const TOKEN_BYTES = 32
const MAX_PAIRING_BODY_BYTES = 4096
const MAX_PAIRING_ATTEMPTS = 10

interface DeviceRecord {
  readonly id: string
  readonly name: string
  readonly tokenHash: string
  readonly createdAt: string
  readonly expiresAt: string
}

interface DeviceDocument {
  readonly version: typeof RECORD_VERSION
  readonly instanceId?: string
  readonly devices: readonly DeviceRecord[]
}

export interface NasDeploymentConfig {
  readonly enabled: boolean
  readonly name: string
  readonly version: string
  readonly protocolVersion: number
  readonly trustedHosts: readonly string[]
  readonly deviceLifetimeDays: number
  readonly pairingCode?: string
}

export interface NasDeviceSummary {
  readonly id: string
  readonly name: string
  readonly createdAt: string
  readonly expiresAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseDocument(record: CredentialRecord | undefined): DeviceDocument {
  if (record === undefined) return { version: RECORD_VERSION, devices: [] }
  if (record.kind !== 'grant' || !isRecord(record.payload) || record.payload.version !== RECORD_VERSION
    || !Array.isArray(record.payload.devices)) {
    throw new Error('client-connection: NAS device credential record has an unsupported format')
  }
  const devices: DeviceRecord[] = []
  for (const value of record.payload.devices) {
    if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string'
      || typeof value.tokenHash !== 'string' || typeof value.createdAt !== 'string'
      || typeof value.expiresAt !== 'string') {
      throw new Error('client-connection: NAS device credential record contains an invalid device')
    }
    devices.push(value as unknown as DeviceRecord)
  }
  return {
    version: RECORD_VERSION,
    ...(typeof record.payload.instanceId === 'string' ? { instanceId: record.payload.instanceId } : {}),
    devices,
  }
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function matchesHash(token: string, expected: string): boolean {
  const actualBytes = Buffer.from(tokenHash(token), 'utf8')
  const expectedBytes = Buffer.from(expected, 'utf8')
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)
}

function json(res: ServerResponse, status: number, value: unknown): void {
  const body = `${JSON.stringify(value)}\n`
  res.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const raw of req) {
    const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as Uint8Array)
    total += chunk.length
    if (total > MAX_PAIRING_BODY_BYTES) throw new Error('request body is too large')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

function generatedCode(): string {
  return String(randomInt(0, 100_000_000)).padStart(8, '0')
}

function normalizeCode(value: string): string {
  const code = value.replaceAll(/\s/gu, '')
  if (!/^[0-9]{8}$/u.test(code)) throw new TypeError('pairing code must contain 8 digits')
  return code
}

function deviceSummary(device: DeviceRecord): NasDeviceSummary {
  return { id: device.id, name: device.name, createdAt: device.createdAt, expiresAt: device.expiresAt }
}

/** One deployment-wide NAS access owner. */
export class NasAccess {
  readonly routes: readonly WebRoute[]
  private pairingCode: string
  private pairingExpiresAt: number
  private pairingAttempts = 0
  private devices: readonly DeviceRecord[] = []
  private instanceId = ''

  private constructor(
    private readonly credentials: CredentialProvider,
    private readonly config: NasDeploymentConfig,
  ) {
    this.pairingCode = normalizeCode(config.pairingCode ?? generatedCode())
    this.pairingExpiresAt = Date.now() + PAIRING_LIFETIME_MS
    this.routes = [
      { kind: 'exact', path: '/nas/health', handler: (req: IncomingMessage, res: ServerResponse) => { this.health(req, res) } },
      { kind: 'exact', path: '/nas/pair', handler: (req: IncomingMessage, res: ServerResponse) => this.pair(req, res) },
      { kind: 'exact', path: '/nas/devices', handler: (req: IncomingMessage, res: ServerResponse) => this.manageDevices(req, res) },
    ]
  }

  static async create(credentials: CredentialProvider, config: NasDeploymentConfig): Promise<NasAccess> {
    const access = new NasAccess(credentials, config)
    const stored = parseDocument(await credentials.readRecord(DEVICE_RECORD_KEY))
    access.instanceId = stored.instanceId ?? randomBytes(16).toString('hex')
    if (stored.instanceId === undefined) {
      await credentials.modifyRecord(DEVICE_RECORD_KEY, current => Promise.resolve({
        kind: 'grant',
        payload: { ...parseDocument(current), instanceId: access.instanceId },
      }))
    }
    access.devices = stored.devices
      .filter(device => Date.parse(device.expiresAt) > Date.now())
    access.announcePairingCode()
    return access
  }

  /** True when a current per-device bearer token authorizes this request. */
  isAuthenticated(
    req: IncomingMessage | { readonly headers: Headers | Readonly<Record<string, string | readonly string[] | undefined>> },
  ): boolean {
    const headerValue: unknown = req.headers instanceof Headers
      ? req.headers.get('authorization') ?? undefined
      : req.headers.authorization
    const header: unknown = Array.isArray(headerValue) ? (headerValue as unknown[])[0] : headerValue
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false
    const token = header.slice('Bearer '.length)
    const now = Date.now()
    return this.devices.some(device => Date.parse(device.expiresAt) > now && matchesHash(token, device.tokenHash))
  }

  listDevices(): readonly NasDeviceSummary[] {
    return this.devices.map(deviceSummary)
  }

  private health(req: IncomingMessage, res: ServerResponse): void {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return }
    if (!isTrustedApiRequest(req, this.config.trustedHosts)) { res.writeHead(403); res.end('forbidden'); return }
    if (Date.now() >= this.pairingExpiresAt) this.rotatePairingCode()
    const available = this.pairingAttempts < MAX_PAIRING_ATTEMPTS
    const value = {
      schema: 'open-deepseek-harness/nas-health/v1',
      instanceId: this.instanceId,
      name: this.config.name,
      version: this.config.version,
      protocolVersion: this.config.protocolVersion,
      platform: 'linux',
      architecture: process.arch === 'arm64' ? 'arm64' : 'x64',
      pairingAvailable: available,
      ...(available ? { pairingExpiresAt: new Date(this.pairingExpiresAt).toISOString() } : {}),
    }
    if (req.method === 'HEAD') { res.writeHead(200, { 'cache-control': 'no-store' }); res.end(); return }
    json(res, 200, value)
  }

  private async pair(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
    if (!isTrustedApiRequest(req, this.config.trustedHosts)) { res.writeHead(403); res.end('forbidden'); return }
    let body: unknown
    try { body = await readJson(req) } catch { json(res, 400, { error: 'invalid JSON request' }); return }
    if (!isRecord(body) || typeof body.code !== 'string' || typeof body.deviceName !== 'string') {
      json(res, 400, { error: 'code and deviceName are required' }); return
    }
    const code = body.code.replaceAll(/\s/gu, '')
    const deviceName = body.deviceName.trim()
    if (this.pairingAttempts >= MAX_PAIRING_ATTEMPTS) {
      json(res, 429, { error: 'pairing attempt limit reached; request a fresh code' }); return
    }
    if (Date.now() >= this.pairingExpiresAt || code.length !== this.pairingCode.length
      || !timingSafeEqual(Buffer.from(code), Buffer.from(this.pairingCode))) {
      this.pairingAttempts += 1
      json(res, 401, { error: 'pairing code is invalid or expired' }); return
    }
    if (deviceName.length < 1 || deviceName.length > 80) { json(res, 400, { error: 'invalid device name' }); return }
    const token = randomBytes(TOKEN_BYTES).toString('base64url')
    const createdAt = new Date()
    const expiresAt = new Date(createdAt.getTime() + this.config.deviceLifetimeDays * 24 * 60 * 60 * 1000)
    const device: DeviceRecord = {
      id: randomBytes(16).toString('hex'), name: deviceName, tokenHash: tokenHash(token),
      createdAt: createdAt.toISOString(), expiresAt: expiresAt.toISOString(),
    }
    const record = await this.credentials.modifyRecord(DEVICE_RECORD_KEY, (current: CredentialRecord | undefined) => {
      const document = parseDocument(current)
      return Promise.resolve({
        kind: 'grant' as const,
        payload: { ...document, instanceId: this.instanceId, devices: [...document.devices, device] },
      })
    })
    this.devices = parseDocument(record).devices
    console.info(`dsh nas: paired device ${device.id} (${device.name}); grant expires ${device.expiresAt}`)
    this.rotatePairingCode()
    json(res, 200, {
      schema: 'open-deepseek-harness/nas-pairing/v1',
      deviceId: device.id,
      token,
      expiresAt: device.expiresAt,
      health: {
        schema: 'open-deepseek-harness/nas-health/v1',
        instanceId: this.instanceId,
        name: this.config.name,
        version: this.config.version,
        protocolVersion: this.config.protocolVersion,
        platform: 'linux',
        architecture: process.arch === 'arm64' ? 'arm64' : 'x64',
        pairingAvailable: true,
        pairingExpiresAt: new Date(this.pairingExpiresAt).toISOString(),
      },
    })
  }

  private async manageDevices(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!isTrustedApiRequest(req, this.config.trustedHosts)) { res.writeHead(403); res.end('forbidden'); return }
    if (!this.isAuthenticated(req)) { res.writeHead(401); res.end('unauthorized'); return }
    if (req.method === 'GET') { json(res, 200, { devices: this.listDevices() }); return }
    if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
    let body: unknown
    try { body = await readJson(req) } catch { json(res, 400, { error: 'invalid JSON request' }); return }
    if (!isRecord(body) || typeof body.revokeDeviceId !== 'string') {
      json(res, 400, { error: 'revokeDeviceId is required' }); return
    }
    const id = body.revokeDeviceId
    const record = await this.credentials.modifyRecord(DEVICE_RECORD_KEY, (current: CredentialRecord | undefined) => {
      const document = parseDocument(current)
      return Promise.resolve({
        kind: 'grant' as const,
        payload: { ...document, devices: document.devices.filter(device => device.id !== id) },
      })
    })
    this.devices = parseDocument(record).devices
    console.info(`dsh nas: revoked device ${id}`)
    json(res, 200, { devices: this.listDevices() })
  }

  private rotatePairingCode(): void {
    this.pairingCode = generatedCode()
    this.pairingExpiresAt = Date.now() + PAIRING_LIFETIME_MS
    this.pairingAttempts = 0
    this.announcePairingCode()
  }

  private announcePairingCode(): void {
    console.log(`dsh nas: pairing code ${this.pairingCode.slice(0, 4)} ${this.pairingCode.slice(4)} (expires ${new Date(this.pairingExpiresAt).toISOString()})`)
  }
}
