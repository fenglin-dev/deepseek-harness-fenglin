/** File-backed, least-privilege approval records for plugin-owned services. */
import type { SubprocessSpawnSpec } from './types.ts';
/** Versioned declaration a plugin must provide before asking to outlive Harness. */
export interface PersistentServiceDeclaration {
    /** Stable package name of the plugin that owns the service. */
    readonly pluginName: string;
    /** Exact installed plugin version. */
    readonly pluginVersion: string;
    /** Stable service identifier within the plugin. */
    readonly serviceId: string;
    /** Human-readable reason shown before the first approval. */
    readonly purpose: string;
    /** SHA-256 of the complete launch specification, excluding credentials. */
    readonly specFingerprint: string;
}
/** Renderer-safe view of one pending or approved declaration. */
export interface PersistentServiceSummary extends PersistentServiceDeclaration {
    readonly key: string;
    readonly status: 'pending' | 'approved';
    readonly requestedAt: string;
    readonly approvedAt?: string;
}
/** PID identity fence persisted separately from approval data. */
export interface PersistentServiceProcessIdentity {
    readonly pid: number;
    readonly started: string;
}
/** Stable profile identity; the raw data-directory path is never stored.
 * @param dataHome - Active DSH data directory known only to the trusted host.
 * @returns SHA-256 profile identity suitable for approval scoping.
 */
export declare function persistentProfileFingerprint(dataHome: string): string;
/**
 * Compute the Host-authoritative launch fingerprint. Secret-like environment
 * values are represented by a stable marker so rotating a credential does not
 * require a new lifecycle approval and the digest never becomes a secret oracle.
 * @param spec - Fully specified process request validated by the Host provider.
 * @returns SHA-256 identity of the non-secret launch specification.
 */
export declare function persistentSpawnSpecFingerprint(spec: SubprocessSpawnSpec): string;
/** Validate one declaration received from a trusted plugin host.
 * @param raw - Untrusted declaration-shaped value.
 * @returns Normalized versioned service declaration.
 */
export declare function normalizePersistentServiceDeclaration(raw: unknown): PersistentServiceDeclaration;
/** Compute the key that binds approval to profile, plugin, version, service and launch spec.
 * @param profileFingerprint - Host-computed Profile identity.
 * @param declaration - Normalized plugin service declaration.
 * @returns Opaque SHA-256 approval key.
 */
export declare function persistentServiceKey(profileFingerprint: string, declaration: PersistentServiceDeclaration): string;
/**
 * Small synchronous store shared by the Harness process and Electron. Writes
 * are atomic and contain declarations only; argv, cwd, env and credentials do
 * not cross this boundary.
 */
export declare class FilePersistentServiceAuthorizer {
    #private;
    constructor(path: string, profileFingerprint: string, now?: () => number);
    private read;
    private write;
    private currentRecords;
    /** Ask for approval. A first request is recorded as pending and is denied.
     * @param declaration - Exact service declaration requested by the plugin.
     * @returns Opaque key and current grant decision.
     */
    request(declaration: PersistentServiceDeclaration): {
        readonly key: string;
        readonly granted: boolean;
        readonly status: 'pending' | 'approved';
    };
    /** Return declarations belonging to the active Profile only.
     * @returns Redacted pending and approved declarations.
     */
    list(): readonly PersistentServiceSummary[];
    /** Approve one exact pending declaration by opaque key.
     * @param key - Host-issued declaration key received from the renderer.
     * @returns Updated active-Profile declaration list.
     */
    approve(key: string): readonly PersistentServiceSummary[];
    /** Revoke an approval or discard a pending request. Existing processes need separate stop handling.
     * @param key - Host-issued declaration key to remove.
     * @returns Updated active-Profile declaration list.
     */
    revoke(key: string): readonly PersistentServiceSummary[];
}
/**
 * Crash-recovery identities for approved services. This deliberately uses a
 * different file from approval state, so sampling cannot overwrite a user
 * approval written concurrently by Electron.
 */
export declare class FilePersistentServiceRuntimeRegistry {
    #private;
    constructor(authorizationPath: string, profileFingerprint: string);
    private read;
    private write;
    /** Replace the observed identities for one exact approved service.
     * @param key - Exact approved declaration key.
     * @param declaration - Declaration used for redacted ownership labels.
     * @param identities - Current PID/start identity fences in the service range.
     */
    track(key: string, declaration: PersistentServiceDeclaration, identities: readonly PersistentServiceProcessIdentity[]): void;
    /** Read identity fences for one service in the active Profile.
     * @param key - Exact approved declaration key.
     * @returns Persisted PID/start identity fences, or an empty list.
     */
    identities(key: string): readonly PersistentServiceProcessIdentity[];
    /** Remove runtime evidence only after stop has been confirmed.
     * @param key - Exact approved declaration key whose range is empty.
     */
    clear(key: string): void;
}
//# sourceMappingURL=persistent.d.ts.map