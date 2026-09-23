/**
 * Versioned fixed-route JSON protocol shared by NAS Runtime and Desktop
 * adapters. Transport, authorization, TLS, and Runtime selection remain owned
 * by those adapters.
 *
 * @module @deepseek-ai/dsh-nas-protocol
 */
const HEALTH_SCHEMA = 'open-deepseek-harness/nas-health/v1';
const PAIRING_SCHEMA = 'open-deepseek-harness/nas-pairing/v1';
/** Raised when JSON at the NAS wire seam violates the v1 document format. */
export class NasProtocolViolation extends Error {
    document;
    name = 'NasProtocolViolation';
    /**
     * Create a protocol-format failure without retaining the rejected payload.
     * @param document - v1 document kind that failed validation.
     */
    constructor(document) {
        super(`NAS protocol v1 returned an invalid ${document} document`);
        this.document = document;
    }
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function nonEmpty(value) {
    return typeof value === 'string' && value.length > 0;
}
function isoDate(value) {
    return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
function parseHealth(raw) {
    if (!isRecord(raw) || raw.schema !== HEALTH_SCHEMA
        || !nonEmpty(raw.instanceId) || !nonEmpty(raw.name) || !nonEmpty(raw.version)
        || typeof raw.protocolVersion !== 'number' || !Number.isFinite(raw.protocolVersion)
        || raw.platform !== 'linux' || (raw.architecture !== 'x64' && raw.architecture !== 'arm64')
        || typeof raw.pairingAvailable !== 'boolean'
        || (raw.pairingExpiresAt !== undefined && !isoDate(raw.pairingExpiresAt))) {
        throw new NasProtocolViolation('health');
    }
    return raw;
}
function parsePairRequest(raw) {
    if (!isRecord(raw) || typeof raw.code !== 'string' || typeof raw.deviceName !== 'string') {
        throw new NasProtocolViolation('pair-request');
    }
    return { code: raw.code, deviceName: raw.deviceName };
}
function parsePairing(raw) {
    if (!isRecord(raw) || raw.schema !== PAIRING_SCHEMA || !nonEmpty(raw.deviceId)
        || !nonEmpty(raw.token) || raw.token.length < 32 || !isoDate(raw.expiresAt)) {
        throw new NasProtocolViolation('pairing');
    }
    let health;
    try {
        health = parseHealth(raw.health);
    }
    catch {
        throw new NasProtocolViolation('pairing');
    }
    return { schema: PAIRING_SCHEMA, deviceId: raw.deviceId, token: raw.token, expiresAt: raw.expiresAt, health };
}
function parseDevice(raw) {
    if (!isRecord(raw) || !nonEmpty(raw.id) || !nonEmpty(raw.name)
        || !isoDate(raw.createdAt) || !isoDate(raw.expiresAt)) {
        throw new NasProtocolViolation('devices');
    }
    return { id: raw.id, name: raw.name, createdAt: raw.createdAt, expiresAt: raw.expiresAt };
}
function parseDevices(raw) {
    if (!isRecord(raw) || !Array.isArray(raw.devices))
        throw new NasProtocolViolation('devices');
    return { devices: raw.devices.map(parseDevice) };
}
function parseRevokeRequest(raw) {
    if (!isRecord(raw) || typeof raw.revokeDeviceId !== 'string') {
        throw new NasProtocolViolation('revoke-device-request');
    }
    return { revokeDeviceId: raw.revokeDeviceId };
}
const healthCodec = {
    create: input => parseHealth({ schema: HEALTH_SCHEMA, ...input }),
    parse: parseHealth,
};
const pairRequestCodec = { create: parsePairRequest, parse: parsePairRequest };
const pairingCodec = {
    create: input => parsePairing({ schema: PAIRING_SCHEMA, ...input }),
    parse: parsePairing,
};
const devicesCodec = {
    create: devices => parseDevices({ devices }),
    parse: parseDevices,
};
const revokeRequestCodec = { create: parseRevokeRequest, parse: parseRevokeRequest };
/**
 * Complete NAS wire protocol v1 interface. Adapters use its methods, paths,
 * and codecs instead of restating route or JSON knowledge.
 */
export const NAS_PROTOCOL_V1 = Object.freeze({
    version: 1,
    health: Object.freeze({ method: 'GET', path: '/nas/health', response: healthCodec }),
    pair: Object.freeze({ method: 'POST', path: '/nas/pair', request: pairRequestCodec, response: pairingCodec }),
    devices: Object.freeze({ method: 'GET', path: '/nas/devices', response: devicesCodec }),
    revokeDevice: Object.freeze({ method: 'POST', path: '/nas/devices', request: revokeRequestCodec, response: devicesCodec }),
});
//# sourceMappingURL=index.js.map