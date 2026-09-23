/**
 * Versioned fixed-route JSON protocol shared by NAS Runtime and Desktop
 * adapters. Transport, authorization, TLS, and Runtime selection remain owned
 * by those adapters.
 *
 * @module @deepseek-ai/dsh-nas-protocol
 */
declare const HEALTH_SCHEMA: "open-deepseek-harness/nas-health/v1";
declare const PAIRING_SCHEMA: "open-deepseek-harness/nas-pairing/v1";
/** Health document returned by a NAS Runtime. */
export interface NasHealthDocument {
    readonly schema: typeof HEALTH_SCHEMA;
    readonly instanceId: string;
    readonly name: string;
    readonly version: string;
    readonly protocolVersion: number;
    readonly platform: 'linux';
    readonly architecture: 'x64' | 'arm64';
    readonly pairingAvailable: boolean;
    readonly pairingExpiresAt?: string;
}
/** JSON body accepted by the pairing route. */
export interface NasPairRequest {
    readonly code: string;
    readonly deviceName: string;
}
/** Pairing document returned after creating a Paired Device. */
export interface NasPairingDocument {
    readonly schema: typeof PAIRING_SCHEMA;
    readonly deviceId: string;
    readonly token: string;
    readonly expiresAt: string;
    readonly health: NasHealthDocument;
}
/** Renderer-safe summary of one Paired Device. */
export interface NasDeviceSummary {
    readonly id: string;
    readonly name: string;
    readonly createdAt: string;
    readonly expiresAt: string;
}
/** JSON document returned by both device-management operations. */
export interface NasDevicesDocument {
    readonly devices: readonly NasDeviceSummary[];
}
/** JSON body accepted when revoking a Paired Device. */
export interface NasRevokeDeviceRequest {
    readonly revokeDeviceId: string;
}
/** Fields supplied by the NAS Runtime when constructing a health document. */
export type NasHealthFields = Omit<NasHealthDocument, 'schema'>;
/** Fields supplied by the NAS Runtime when constructing a pairing document. */
export type NasPairingFields = Omit<NasPairingDocument, 'schema'>;
/** Raised when JSON at the NAS wire seam violates the v1 document format. */
export declare class NasProtocolViolation extends Error {
    readonly document: 'health' | 'pair-request' | 'pairing' | 'devices' | 'revoke-device-request';
    readonly name = "NasProtocolViolation";
    /**
     * Create a protocol-format failure without retaining the rejected payload.
     * @param document - v1 document kind that failed validation.
     */
    constructor(document: 'health' | 'pair-request' | 'pairing' | 'devices' | 'revoke-device-request');
}
interface Codec<T, CreateInput = T> {
    create(input: CreateInput): T;
    parse(raw: unknown): T;
}
/**
 * Complete NAS wire protocol v1 interface. Adapters use its methods, paths,
 * and codecs instead of restating route or JSON knowledge.
 */
export declare const NAS_PROTOCOL_V1: Readonly<{
    version: 1;
    health: Readonly<{
        method: "GET";
        path: "/nas/health";
        response: Codec<NasHealthDocument, NasHealthFields>;
    }>;
    pair: Readonly<{
        method: "POST";
        path: "/nas/pair";
        request: Codec<NasPairRequest, NasPairRequest>;
        response: Codec<NasPairingDocument, NasPairingFields>;
    }>;
    devices: Readonly<{
        method: "GET";
        path: "/nas/devices";
        response: Codec<NasDevicesDocument, readonly NasDeviceSummary[]>;
    }>;
    revokeDevice: Readonly<{
        method: "POST";
        path: "/nas/devices";
        request: Codec<NasRevokeDeviceRequest, NasRevokeDeviceRequest>;
        response: Codec<NasDevicesDocument, readonly NasDeviceSummary[]>;
    }>;
}>;
export {};
//# sourceMappingURL=index.d.ts.map