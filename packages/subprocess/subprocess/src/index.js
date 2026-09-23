/**
 * Service Definition for the subprocess capability seam (`ctx.subprocess`): execution-world executable lookup,
 * fully specified provider-managed process ranges with raw or
 * collected stdio, and one terminal-process primitive. Command defaulting,
 * shell semantics, deadlines, protocol framing, terminal readiness, and
 * presentation belong to consumers. The local implementation lives in
 * `@deepseek-ai/dsh-subprocess-local`.
 * @module @deepseek-ai/dsh-subprocess
 */
import { Service } from '@deepseek-ai/cordis';
import { proxyEnvironmentForChild } from '@deepseek-ai/dsh-http-proxy';
import { DSH_ENV_PREFIX } from "./types.js";
export { FilePersistentServiceAuthorizer, FilePersistentServiceRuntimeRegistry, normalizePersistentServiceDeclaration, persistentProfileFingerprint, persistentSpawnSpecFingerprint, persistentServiceKey, } from "./persistent.js";
export { DSH_ENV_PREFIX } from "./types.js";
/**
 * Credential-shaped environment names are NOT forwarded to children (the
 * harness's own `DEEPSEEK_API_KEY`/secrets must not leak into a spawned
 * process implicitly). One heuristic for every in-repo spawner; a
 * deliberately supplied entry survives because explicit env layers merge
 * after the scrub.
 */
export const SENSITIVE_ENV_PATTERN = /KEY|PASSWORD|SECRET|TOKEN/i;
/**
 * The ambient parent environment minus credential-shaped names and minus all
 * `DSH_*` names — the canonical base every harness child starts from. `PATH`,
 * `HOME`, locale, and proxy variables survive, so child CLIs run normally;
 * harness identity never leaks implicitly (a deliberately forwarded
 * credential or current `DSH_*` fact goes through the spec's explicit `env`,
 * which merges after this scrub). Both scrubs match case-insensitively:
 * Windows environment names are case-insensitive, so a parent `dsh_*` entry
 * would otherwise survive and read back as `$env:DSH_*` in the child;
 * deliberate lowercase `dsh_*` names on POSIX are implausible. Exported as a plain function so spawners
 * that cannot route through the service (node-pty backends, SDK-managed
 * transports) share the one scrub definition.
 *
 * When a proxy is active the result also carries the resolved proxy names and the flag a child Node
 * needs to honor them, so a child inherits the same routing as its parent.
 * @returns a fresh environment object safe to hand to a child spawn.
 */
export function scrubbedParentEnv() {
    const env = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined && !SENSITIVE_ENV_PATTERN.test(key) && !key.toUpperCase().startsWith(DSH_ENV_PREFIX))
            env[key] = value;
    }
    // A child Node ignores the inherited proxy variables unless the flag this adds is set, so an MCP
    // stdio server or subagent CLI would connect directly while its parent proxies. The same overlay
    // restores each proxy name to what the user exported, undoing this process's own normalization —
    // `undefined` removes a name the user never set.
    for (const [name, value] of Object.entries(proxyEnvironmentForChild())) {
        if (value === undefined)
            Reflect.deleteProperty(env, name);
        else
            env[name] = value;
    }
    return env;
}
/**
 * Abstract subprocess service. Subclass, implement {@link spawn}, and load the
 * subclass as a plugin — it registers as `ctx.subprocess` (one implementation
 * per context; loading a second throws, which is cordis' standard
 * duplicate-service behavior).
 *
 * Implementations must honor these semantics:
 * - Executable paths belong to one execution world shared with the mounted
 *   filesystem provider.
 * - {@link spawn} returns a live handle synchronously. Target identity remains
 *   provider-private; `done` resolves with the spawned command's exit facts and
 *   may reject for spawn or provider failures.
 * - Collect-mode readers are offset-based and non-consuming, so independent
 *   readers never consume one another's output; lossy reads report truncation
 *   and the spill file holding the complete stream when one exists. Piped
 *   streams are handed to the caller raw and never buffered here.
 * - {@link SubprocessHandle.terminate} (and the spec's abort signal) starts the
 *   provider's documented procedure against its managed range.
 *   {@link SubprocessHandle.waitForExit} observes that same range so a
 *   consumer-owned teardown ladder can hold each tier on real quiescence; each
 *   provider documents its signalling and observability limits.
 * - Disposal of the service terminates all still-running managed processes
 *   and awaits their exit.
 * - {@link spawnTerminal} owns terminal allocation, text transport,
 *   foreground groups, signalling, and whole-session quiescence behind one
 *   awaited termination method; readiness and persistent-shell policy stay
 *   in the PTY consumer. Its output stream ends after queued terminal output
 *   when the top-level process exits.
 */
export class SubprocessRuntime extends Service {
    constructor(ctx) {
        super(ctx, 'subprocess');
    }
    /**
     * Start an authorized plugin service that may outlive the current Harness
     * process. Providers must bind the declaration to their own approval store;
     * the base seam fails closed when no such provider is available.
     * @param _spec - Exact process request whose non-secret launch identity is approved.
     * @param _declaration - Stable plugin, version, service, purpose and launch fingerprint.
     * @returns Provider-owned handle for the authorized persistent range.
     */
    spawnPersistent(_spec, _declaration) {
        throw new Error('subprocess: persistent service authorization is unavailable');
    }
}
export default SubprocessRuntime;
/** Executable lookup completed without finding an executable file. */
export class SubprocessExecutableNotFoundError extends Error {
    /**
     * @param message - provider-specific lookup diagnostic.
     * @param options - original provider failure, when available.
     */
    constructor(message, options) {
        super(message, options);
        this.name = 'SubprocessExecutableNotFoundError';
    }
}
//# sourceMappingURL=index.js.map