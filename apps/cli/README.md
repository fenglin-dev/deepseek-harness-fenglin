# `@deepseek-ai/dsh`

English | [中文](README.zh.md)

The `dsh` command is the sole supported Node application launcher: profiles are ordered stacks of plugin-bundle patch layers under the user's own overrides. SDK and ACP are profiles, not separate public bins. The Python runtime wheel packages this same command; the SDK defaults to `sdk`, and the minimal example selects `sdk-minimal`. [`src/args.ts`](src/args.ts) owns the command grammar, and [`src/bin.ts`](src/bin.ts) loads only the selected runner. Invalid commands, options from another mode, and fatal configuration or boot failures exit nonzero.

## Entry modes

| Command | Purpose |
|---|---|
| `dsh <name>` / `dsh --profile <name>` | Boot the named profile under `$DSH_HOME/profiles/<name>`. |
| `dsh --profile <name> --from-default-profile <template>` | Create a new custom profile from a shipped template, then boot it. |
| `dsh --profile acp` | Serve automation clients over ACP stdio until disconnect. |
| `dsh --profile headless "job"` | Run one fresh persisted session, print the final answer, and exit. |
| `dsh --profile sdk` | Serve SDK clients over JSON-RPC stdio until shutdown or disconnect. |
| `dsh --profile sdk-minimal` | Serve SDK clients with the standalone minimal agent tree. |
| `dsh web` | Boot the Web profile. |
| `dsh plugin --profile <name> <pnpm args>` | Manage a profile's plugins by forwarding to pnpm in the profile directory. |
| `dsh plugin --profile <name> approve-build <package-name>` | Allow one reviewed registry dependency lifecycle script without overriding an explicit denial. |
| `dsh plugin --profile <name> doctor [--repair]` | Inspect shared Host dependency identity, or repair and quarantine conflicts. |

The invoking directory is the default workspace root. The `web`, `headless`, `sdk`, `sdk-minimal`, and `acp` profiles auto-initialize on first use from shipped templates. Create another profile at an unused, non-shipped name with `--from-default-profile`, or initialize a base-backed profile through `dsh plugin`. The `desktop` name is reserved for the Electron-owned profile, so the CLI rejects boot, config-dump, and plugin-management requests for it.

## Plugin changes

With explicit Community Desktop transaction authorization, mutating plugin commands verify a same-disk candidate and hand activation to the desktop process. `batch` keeps build approval and retry in one transaction; `transaction status`, `activate`, `commit`, and `rollback` operate only on validated journal IDs and managed plugin state. Candidate-owned bundled archive references move back to the durable Desktop home across native and pnpm-normalized path separators; a later transaction repairs an older deleted-candidate reference only when the matching retained archive exists. The caller holds the existing Profile lock, and pnpm registers its worker PID before running package code. Standalone CLI commands retain their ordinary synchronous behavior. See [Desktop](../desktop/README.md#plugin-changes) for readiness and rollback behavior.

Profile plugin operations keep the pnpm cache in `$DSH_HOME/.pnpm-store` (default `~/.dsh/.pnpm-store`), including repair and snapshot restore. A local dependency tree using the same store format keeps its installed files and build results while its cache locator is atomically rebound. Shared old caches are not moved or deleted. Different store formats and external virtual stores retain pnpm's compatibility checks. Uncached packages still need their original local archives or network access; changing the cache location does not make an offline snapshot complete.

## App arguments

The launcher parses only its own flags and hands everything after them to the booted profile, where any injected app plugin may parse the shared immutable snapshot ([`dsh-cmdline`](../../packages/boot/cmdline/README.md)). The first token the launcher does not recognize starts the app's arguments:

```sh
dsh --profile web --port 8080       # --port belongs to the web app
dsh --profile tui --resume <id>     # example, assuming the tui profile is installed; --resume belongs to the terminal app
dsh --profile headless "run the tests"
dsh --profile web --help            # the web app's flags, not the launcher's
dsh --help                          # the launcher's own help
```

<a id="profiles"></a>
## Profiles

A profile directory holds a `package.json` (out-of-tree plugin dependencies plus the profile manifest `dsh.profile` with its ordered `bundles` list) and a `cordis.patch.yml` (the user's own patch layer). `dsh-hmr`, when enabled in YAML, watches the profile manifest and both profile and home patch files, then recomposes all layers through one serialized reload. Without HMR, changes apply on restart. Edits arriving during watcher registration use the same nonfatal reload reporting as later edits. [Plugin Manager](../../packages/boot/plugin-manager/README.md) shares package operations and the profile write lock with `dsh plugin`; package updates retain disabled bundle selections. CLI package commands inherit authentication variables and terminal descriptors, including interactive build approval; service calls retain their scrubbed environment and captured diagnostics.

The tree composes over an empty root:
- each bundle's patch in `dsh.profile.bundles` order
- then the profile's `cordis.patch.yml`, then the home-level `$DSH_HOME/cordis.patch.yml`
- then `--patch` overlays

Bundles named in `dsh.profile.bundles` resolve from the dsh installation first (`@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, `@deepseek-ai/dsh-headless`, `@deepseek-ai/dsh-sdk-app`, `@deepseek-ai/dsh-sdk-minimal`, `@deepseek-ai/dsh-acp-app`), then from the profile's own `node_modules`, where pnpm installs out-of-tree plugins.

Before a profile composes, the launcher checks identity-sensitive Host packages for plugin-installed shadow copies. Compatible declarations converge to the installation-owned copies through Harness-managed pnpm `link:` overrides; incompatible or still-conflicting root plugins are removed from the active profile and recorded under `$DSH_HOME/quarantine/profile-plugins.json`. If convergence or quarantine cannot leave a clean dependency tree, startup fails instead of loading a mixed runtime. The same check runs after `dsh plugin` changes, so Electron, `dsh web`, and other profile launches share the policy.

On Windows, pnpm can briefly lose its atomic directory swap when antivirus software or indexing holds one of pnpm's generated `node_modules/*_tmp_<pid>_<sequence>` directories. `dsh plugin` retries only that exact `ERR_PNPM_EPERM` rename failure three times with bounded backoff. Other permission errors remain terminal, and a destination that stays locked after the retry budget still reports the original pnpm diagnostic so the user can stop the process that owns the files.

`doctor` without an option is read-only and exits `0` when healthy or `2` when conflicts exist. `--repair` exits `10` after lossless convergence, `11` after quarantine, and `1` when the profile cannot be made safe. A quarantined plugin can be retried with `doctor --retry <quarantine-id>`; its original dependency specifier and bundle position are restored only if the ordinary health policy succeeds.

Market-owned commands do not inherit Desktop transaction authorization: they update the active Profile synchronously under its write lock and retain automatic snapshots. Desktop-owned Web generations carry a separate launch marker; inherited same-home Web replacements exit without starting a second service, leaving restart to Supervisor.

Plugin commands preserve their result as the process exit code and let Node drain pending output and native handles before exiting.

Plugin commands and normal startup prepare the installation-owned module fallback before dependency diagnostics. A fresh Profile can therefore resolve bundled Host services before its first launch; unavailable third-party dependencies still receive the ordinary diagnostic.

Use `--dump-default-config` and `--dump-config` to inspect the composed tree without booting it.

The [CLI behavior reference](reference/README.md) owns exact layer precedence, flags, shutdown behavior, deployment defaults, and source execution. The [startup and reload failure table](../../packages/boot/app-boot/README.md#startup-and-reload-failures) compares optional and required plugin failures with configuration HMR.

## Optional overlays

`config/examples/` ships opt-in overlays for GitHub review webhooks, session-local Schedule, memory MCP servers, and runtime Cordis tools. They are never part of a default profile; the [user guides](../../docs/user/guide/index.md) and [developer practice guides](../../docs/user/develop/practice/index.md) own setup and safety instructions.

## Development

Production runs require built package and frontend artifacts. From the repository root, run `pnpm run build` separately, then use `pnpm dsh <args...>` to run the TypeScript entry and forward every argument; the [source-execution reference](reference/README.md#source-execution) owns the module-resolution contract.

The `@deepseek-ai/dsh/profile-boot` export provides the shared profile lifecycle to the Desktop host. A resolved application profile supplies its own installation anchor for runtime package resolution while retaining the Harness home patch, proxy environment, telemetry switch, patch reload, and bounded shutdown.

The [Web failure matrix](tests/profiles/web/tests/web-failure-matrix.expected.e2e.ts) runs the built CLI through startup failures and native configuration HMR with `awaitWriteFinish` enabled in `test:expected`. It verifies authenticated HTTP responses, diagnostics, recovery, process exits, and disposal without model API calls; the [startup acceptance](tests/profiles/web/tests/web-best-effort-startup.expected.e2e.ts) also covers the shipped required Web dependencies and port conflicts.
