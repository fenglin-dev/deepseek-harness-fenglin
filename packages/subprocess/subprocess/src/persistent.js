/** File-backed, least-privilege approval records for plugin-owned services. */
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
const SCHEMA = 'open-dsh-desktop/persistent-services/v1';
const SHA256 = /^[a-f0-9]{64}$/u;
const KEY = /^[a-f0-9]{64}$/u;
const NAME = /^[^\u0000-\u001f\u007f\\]{1,214}$/u;
const SENSITIVE_ENV = /(?:AUTH|COOKIE|CREDENTIAL|KEY|PASSWORD|SECRET|TOKEN)/iu;
/** Stable profile identity; the raw data-directory path is never stored.
 * @param dataHome - Active DSH data directory known only to the trusted host.
 * @returns SHA-256 profile identity suitable for approval scoping.
 */
export function persistentProfileFingerprint(dataHome) {
    return createHash('sha256').update(dataHome).digest('hex');
}
/**
 * Compute the Host-authoritative launch fingerprint. Secret-like environment
 * values are represented by a stable marker so rotating a credential does not
 * require a new lifecycle approval and the digest never becomes a secret oracle.
 * @param spec - Fully specified process request validated by the Host provider.
 * @returns SHA-256 identity of the non-secret launch specification.
 */
export function persistentSpawnSpecFingerprint(spec) {
    const environment = Object.entries(spec.env ?? {})
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => [key, SENSITIVE_ENV.test(key) ? '<secret>' : value]);
    return createHash('sha256').update(JSON.stringify({
        argv: spec.argv,
        cwd: spec.cwd,
        stdio: spec.stdio,
        graceMs: spec.graceMs,
        environment,
    })).digest('hex');
}
/** Validate one declaration received from a trusted plugin host.
 * @param raw - Untrusted declaration-shaped value.
 * @returns Normalized versioned service declaration.
 */
export function normalizePersistentServiceDeclaration(raw) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new TypeError('subprocess: persistent service declaration must be an object');
    }
    const value = raw;
    if (typeof value.pluginName !== 'string' || !NAME.test(value.pluginName)
        || typeof value.pluginVersion !== 'string' || !NAME.test(value.pluginVersion)
        || typeof value.serviceId !== 'string' || !NAME.test(value.serviceId)
        || typeof value.purpose !== 'string' || value.purpose.trim().length < 1 || value.purpose.length > 512
        || typeof value.specFingerprint !== 'string' || !SHA256.test(value.specFingerprint)) {
        throw new TypeError('subprocess: invalid persistent service declaration');
    }
    return {
        pluginName: value.pluginName,
        pluginVersion: value.pluginVersion,
        serviceId: value.serviceId,
        purpose: value.purpose.trim(),
        specFingerprint: value.specFingerprint,
    };
}
/** Compute the key that binds approval to profile, plugin, version, service and launch spec.
 * @param profileFingerprint - Host-computed Profile identity.
 * @param declaration - Normalized plugin service declaration.
 * @returns Opaque SHA-256 approval key.
 */
export function persistentServiceKey(profileFingerprint, declaration) {
    if (!SHA256.test(profileFingerprint))
        throw new TypeError('subprocess: invalid persistent profile fingerprint');
    const normalized = normalizePersistentServiceDeclaration(declaration);
    return createHash('sha256').update(JSON.stringify({ profileFingerprint, ...normalized })).digest('hex');
}
/** Read and validate a persistent service document; malformed state fails closed. */
function parseDocument(raw) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
        throw new TypeError('subprocess: invalid persistent service state');
    const value = raw;
    if (value.schema !== SCHEMA || !Array.isArray(value.records) || value.records.length > 256) {
        throw new TypeError('subprocess: invalid persistent service state');
    }
    const records = value.records.map((record) => {
        const normalized = normalizePersistentServiceDeclaration(record);
        const source = record;
        if (typeof source.profileFingerprint !== 'string' || !SHA256.test(source.profileFingerprint)
            || typeof source.key !== 'string' || !KEY.test(source.key)
            || (source.status !== 'pending' && source.status !== 'approved')
            || typeof source.requestedAt !== 'string' || Number.isNaN(Date.parse(source.requestedAt))
            || (source.approvedAt !== undefined && (typeof source.approvedAt !== 'string' || Number.isNaN(Date.parse(source.approvedAt))))) {
            throw new TypeError('subprocess: invalid persistent service record');
        }
        return {
            ...normalized,
            profileFingerprint: source.profileFingerprint,
            key: source.key,
            status: source.status,
            requestedAt: source.requestedAt,
            ...(source.approvedAt === undefined ? {} : { approvedAt: source.approvedAt }),
        };
    });
    return { schema: SCHEMA, records };
}
/**
 * Small synchronous store shared by the Harness process and Electron. Writes
 * are atomic and contain declarations only; argv, cwd, env and credentials do
 * not cross this boundary.
 */
export class FilePersistentServiceAuthorizer {
    #path;
    #profileFingerprint;
    #now;
    constructor(path, profileFingerprint, now = Date.now) {
        if (path.trim() === '')
            throw new TypeError('subprocess: persistent service state path is required');
        if (!SHA256.test(profileFingerprint))
            throw new TypeError('subprocess: invalid persistent profile fingerprint');
        this.#path = path;
        this.#profileFingerprint = profileFingerprint;
        this.#now = now;
    }
    read() {
        try {
            return parseDocument(JSON.parse(readFileSync(this.#path, 'utf8')));
        }
        catch (error) {
            if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
                return { schema: SCHEMA, records: [] };
            }
            // A malformed state must not silently grant a persistent process.
            throw new Error('subprocess: persistent service state is unreadable', { cause: error });
        }
    }
    write(records) {
        mkdirSync(dirname(this.#path), { recursive: true, mode: 0o700 });
        const temporary = `${this.#path}.${process.pid}.${randomUUID()}.tmp`;
        writeFileSync(temporary, `${JSON.stringify({ schema: SCHEMA, records })}\n`, { encoding: 'utf8', mode: 0o600 });
        renameSync(temporary, this.#path);
    }
    currentRecords() {
        return [...this.read().records];
    }
    /** Ask for approval. A first request is recorded as pending and is denied.
     * @param declaration - Exact service declaration requested by the plugin.
     * @returns Opaque key and current grant decision.
     */
    request(declaration) {
        const normalized = normalizePersistentServiceDeclaration(declaration);
        const key = persistentServiceKey(this.#profileFingerprint, normalized);
        const records = this.currentRecords();
        const current = records.find(record => record.key === key);
        if (current?.status === 'approved')
            return { key, granted: true, status: 'approved' };
        if (current === undefined) {
            records.push({
                ...normalized,
                profileFingerprint: this.#profileFingerprint,
                key,
                status: 'pending',
                requestedAt: new Date(this.#now()).toISOString(),
            });
            this.write(records);
        }
        return { key, granted: false, status: 'pending' };
    }
    /** Return declarations belonging to the active Profile only.
     * @returns Redacted pending and approved declarations.
     */
    list() {
        return this.currentRecords()
            .filter(record => record.profileFingerprint === this.#profileFingerprint)
            .map(({ profileFingerprint: _profileFingerprint, ...record }) => record)
            .sort((left, right) => left.requestedAt.localeCompare(right.requestedAt));
    }
    /** Approve one exact pending declaration by opaque key.
     * @param key - Host-issued declaration key received from the renderer.
     * @returns Updated active-Profile declaration list.
     */
    approve(key) {
        if (!KEY.test(key))
            throw new TypeError('subprocess: invalid persistent service key');
        const records = this.currentRecords();
        const index = records.findIndex(record => (record.key === key && record.profileFingerprint === this.#profileFingerprint));
        if (index < 0)
            throw new Error('subprocess: persistent service request is unavailable');
        const current = records[index];
        if (current === undefined)
            throw new Error('subprocess: persistent service request is unavailable');
        records[index] = { ...current, status: 'approved', approvedAt: new Date(this.#now()).toISOString() };
        this.write(records);
        return this.list();
    }
    /** Revoke an approval or discard a pending request. Existing processes need separate stop handling.
     * @param key - Host-issued declaration key to remove.
     * @returns Updated active-Profile declaration list.
     */
    revoke(key) {
        if (!KEY.test(key))
            throw new TypeError('subprocess: invalid persistent service key');
        const records = this.currentRecords().filter(record => (record.key !== key || record.profileFingerprint !== this.#profileFingerprint));
        this.write(records);
        return this.list();
    }
}
/**
 * Crash-recovery identities for approved services. This deliberately uses a
 * different file from approval state, so sampling cannot overwrite a user
 * approval written concurrently by Electron.
 */
export class FilePersistentServiceRuntimeRegistry {
    #path;
    #profileFingerprint;
    constructor(authorizationPath, profileFingerprint) {
        if (authorizationPath.trim() === '')
            throw new TypeError('subprocess: persistent service state path is required');
        if (!SHA256.test(profileFingerprint))
            throw new TypeError('subprocess: invalid persistent profile fingerprint');
        this.#path = `${authorizationPath}.runtime`;
        this.#profileFingerprint = profileFingerprint;
    }
    read() {
        let raw;
        try {
            raw = JSON.parse(readFileSync(this.#path, 'utf8'));
        }
        catch (error) {
            if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
                return { schema: 'open-dsh-desktop/persistent-service-runtime/v1', records: [] };
            }
            throw new Error('subprocess: persistent service runtime state is unreadable', { cause: error });
        }
        if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new TypeError('subprocess: invalid persistent service runtime state');
        }
        const document = raw;
        if (document.schema !== 'open-dsh-desktop/persistent-service-runtime/v1'
            || !Array.isArray(document.records) || document.records.length > 256) {
            throw new TypeError('subprocess: invalid persistent service runtime state');
        }
        const records = document.records.map((rawRecord) => {
            if (rawRecord === null || typeof rawRecord !== 'object')
                throw new TypeError('subprocess: invalid persistent service runtime record');
            const record = rawRecord;
            if (typeof record.key !== 'string' || !KEY.test(record.key)
                || typeof record.profileFingerprint !== 'string' || !SHA256.test(record.profileFingerprint)
                || typeof record.pluginName !== 'string' || !NAME.test(record.pluginName)
                || typeof record.serviceId !== 'string' || !NAME.test(record.serviceId)
                || !Array.isArray(record.identities) || record.identities.length > 1_024
                || typeof record.updatedAt !== 'string' || Number.isNaN(Date.parse(record.updatedAt))) {
                throw new TypeError('subprocess: invalid persistent service runtime record');
            }
            const identities = record.identities.map((rawIdentity) => {
                if (rawIdentity === null || typeof rawIdentity !== 'object')
                    throw new TypeError('subprocess: invalid persistent service process identity');
                const identity = rawIdentity;
                if (!Number.isSafeInteger(identity.pid) || (identity.pid ?? 0) <= 0
                    || typeof identity.started !== 'string' || identity.started.length < 1 || identity.started.length > 128) {
                    throw new TypeError('subprocess: invalid persistent service process identity');
                }
                return { pid: identity.pid, started: identity.started };
            });
            return {
                key: record.key, profileFingerprint: record.profileFingerprint,
                pluginName: record.pluginName, serviceId: record.serviceId,
                identities, updatedAt: record.updatedAt,
            };
        });
        return { schema: 'open-dsh-desktop/persistent-service-runtime/v1', records };
    }
    write(records) {
        mkdirSync(dirname(this.#path), { recursive: true, mode: 0o700 });
        const temporary = `${this.#path}.${process.pid}.${randomUUID()}.tmp`;
        writeFileSync(temporary, `${JSON.stringify({ schema: 'open-dsh-desktop/persistent-service-runtime/v1', records })}\n`, {
            encoding: 'utf8', mode: 0o600,
        });
        renameSync(temporary, this.#path);
    }
    /** Replace the observed identities for one exact approved service.
     * @param key - Exact approved declaration key.
     * @param declaration - Declaration used for redacted ownership labels.
     * @param identities - Current PID/start identity fences in the service range.
     */
    track(key, declaration, identities) {
        if (!KEY.test(key))
            throw new TypeError('subprocess: invalid persistent service key');
        const normalized = normalizePersistentServiceDeclaration(declaration);
        const records = [...this.read().records].filter(record => (record.key !== key || record.profileFingerprint !== this.#profileFingerprint));
        records.push({
            key, profileFingerprint: this.#profileFingerprint,
            pluginName: normalized.pluginName, serviceId: normalized.serviceId,
            identities: identities.map(identity => ({ pid: identity.pid, started: identity.started })),
            updatedAt: new Date().toISOString(),
        });
        this.write(records);
    }
    /** Read identity fences for one service in the active Profile.
     * @param key - Exact approved declaration key.
     * @returns Persisted PID/start identity fences, or an empty list.
     */
    identities(key) {
        if (!KEY.test(key))
            throw new TypeError('subprocess: invalid persistent service key');
        return this.read().records.find(record => (record.key === key && record.profileFingerprint === this.#profileFingerprint))?.identities ?? [];
    }
    /** Remove runtime evidence only after stop has been confirmed.
     * @param key - Exact approved declaration key whose range is empty.
     */
    clear(key) {
        if (!KEY.test(key))
            throw new TypeError('subprocess: invalid persistent service key');
        this.write(this.read().records.filter(record => (record.key !== key || record.profileFingerprint !== this.#profileFingerprint)));
    }
}
//# sourceMappingURL=persistent.js.map