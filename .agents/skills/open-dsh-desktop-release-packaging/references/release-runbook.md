# Desktop release packaging runbook

## Scope

This runbook qualifies native desktop installers. The source of truth is the manually dispatched `.github/workflows/desktop-packages.yml`. Read `release-publication.md` only when the requested endpoint includes notes or a public Release.

## 1. Check the release download route

Before creating a release branch, editing a version, or dispatching a native build, sample a non-expired desktop installer artifact through its GitHub Actions signed download address:

```sh
skill=.agents/skills/open-dsh-desktop-release-packaging

"$skill/scripts/check-release-download-speed.sh" \
  flaqai/open-deepseek-harness-desktop
```

On macOS, packaging entry scripts first normalize explicit upper- or lower-case proxy variables. When none are present, they import enabled fixed HTTP, HTTPS, and SOCKS proxies from `scutil --proxy`; their `gh`, `curl`, and `aria2c` children then follow a Clash Verge System Proxy without requiring TUN mode. Explicit environment variables remain authoritative. Source `scripts/configure-cli-proxy.sh` before standalone `gh`, npm, or pnpm commands in the same release shell. `ODSH_USE_SYSTEM_PROXY=0` disables the import for an intentionally direct route.

Clash Verge's Global mode chooses the route for traffic that has already reached Clash. It does not make every CLI client consume the macOS System Proxy. When a browser is fast but the release-node check is slow, compare `env | grep -i proxy` with `scutil --proxy`, then rerun the same check and require its printed proxy-adoption line and measured rate. Do not lower the speed floor to hide a route mismatch.

The check selects the newest non-expired desktop artifact, preferring the larger artifact when timestamps match, unless `--run-id`, `--artifact-name`, or `--artifact-id` narrows it. It collects two valid samples by default, refreshing the signed URL for every retry, and reports the minimum and average rate. `ODSH_MIN_DOWNLOAD_MIBPS` sets the floor and defaults to `1.0`; zero disables enforcement only after the user explicitly accepts proceeding without a minimum. TLS or API transport failures are retried and exit with status 74 only after the valid-sample budget is exhausted; they are never treated as a zero-speed sample.

Exit status 75 means the route is slower than the configured floor. Report the result and stop before consuming native-runner time. Ask the user to switch network, proxy, or node, or to select a different floor. A missing non-expired artifact means the exact Actions storage route is unverified, not that the network passed.

## 2. Establish the release base

Inspect current state before switching branches:

```sh
git status --short --branch
git worktree list --porcelain
git branch -vv
git log --oneline --decorate -12
```

For every worktree with changes, determine whether the change is already merged, belongs to the requested release, or must remain isolated. Do not move dirty files between worktrees as a shortcut.

Fetch the remote when current remote state matters. Confirm the exact commit intended for the release. If the user requests the latest `master`, do not silently use a local branch that is behind or has unrelated commits.

## 3. Prepare branches and version

The established names are:

```text
release/<version>
fix/windows-packaging-<version>
```

The desktop installer version is owned by `apps/desktop/package.json`. Verify the current repository before editing; do not assume the root package version must match. Keep the release branch as the final package source. Use the fix branch for packaging investigation and retries, then merge or fast-forward the accepted fix into the release branch when the user requests that target layout.

Before pushing, run the checks selected by the changed surface. For ordinary release preparation, use focused tests, strict TypeScript or desktop build checks, documentation gates when documentation changed, and `git diff --check`. Do not repeat already-passing unrelated suites merely because a commit was created.

As soon as the version and release-bound compatibility files are prepared, derive `odsh-v<version>`, `v<version>`, and the filled bilingual notes file. Present that draft before asking to commit or push. At this stage omit bundled-plugin changes and native qualification claims that still depend on accepted workflows. Refresh the same file after artifact verification; do not maintain a second divergent notes document.

## 4. Dispatch native builds

Use the final packaging branch. Before dispatching, inspect the workflow and require top-level `permissions: contents: read` with no release-publication step. The workflow has no `publish` input; pass only its declared inputs:

The normal entry point is resumable and performs the speed, disk, remote-head, workflow, download and directory checks as one operation:

```sh
.agents/skills/open-dsh-desktop-release-packaging/scripts/package-desktop-release.sh \
  --version <version> \
  flaqai/open-deepseek-harness-desktop
```

Its state is stored at `<git-common-dir>/odsh-release-state/<version>.json`. Re-running resumes recorded runs and transfers; it does not dispatch duplicates. If the source revision intentionally changes, use `--restart` only after the new branch is pushed. This archives the old state with a timestamp. The orchestrator never creates tags, GitHub Releases, or CNB uploads.

The manual equivalent begins with Windows:

```sh
skill=.agents/skills/open-dsh-desktop-release-packaging
source "$skill/scripts/configure-cli-proxy.sh"

gh workflow run desktop-packages.yml \
  --ref <branch> \
  -f target=windows-x64 \
  -f refresh_plugins=false
```

Find the new run and verify its `headSha` equals the intended commit:

```sh
gh run list \
  --workflow desktop-packages.yml \
  --branch <branch> \
  --event workflow_dispatch \
  --limit 5 \
  --json databaseId,headSha,status,conclusion,url,createdAt
```

Then monitor it:

```sh
gh run watch <run-id> --exit-status
```

After Windows qualifies, dispatch `macos` and `linux-x64` with the successful Windows run ID as `bundled_plugin_run_id`. Both platform runs then verify that the snapshot came from the exact same source commit and reuse it instead of resolving registry versions again. They may run in parallel because Windows has already acted as the first native gate:

```sh
gh workflow run desktop-packages.yml \
  --ref <branch> \
  -f target=macos \
  -f refresh_plugins=false \
  -f bundled_plugin_run_id=<windows-run-id>

gh workflow run desktop-packages.yml \
  --ref <branch> \
  -f target=linux-x64 \
  -f refresh_plugins=false \
  -f bundled_plugin_run_id=<windows-run-id>
```

The accepted jobs are:

- packaged-resource contract verification before bundled plugin resolution or native packaging;
- bundled plugin resolution;
- native package build;
- Windows installed-package smoke test for Windows;
- final DMG and ZIP Helper-layout, signature, and native Electron startup checks for each macOS architecture;
- SHA-256 checksum generation;
- artifact upload.

If a run fails:

```sh
gh run view <run-id> --log-failed
```

Fix the actual failure on the packaging-fix branch. After any source commit changes, previous platform artifacts are stale even if their earlier run was green.

The resource contract in `apps/desktop/scripts/packaged-resource-contract.json` is the fast gate shared by all targets. When a packaged file or `extraResources` destination changes, update that contract and its test in the same commit. A native runner must not be used to discover a missing static resource that the contract can reject on Ubuntu first.

## 5. Bundled plugin consistency

### Prebuilt resource qualification

Each native target builds its complete preset Profile using the packaged Node, pnpm and verified official archives. Retain the resulting `desktop-prebuilt-<platform>-<arch>` resource; do not replace it with a private plugin patch, a build-machine pnpm store, or user configuration. The manifest records the runtime identity, plugin snapshot digest, build approvals and checksummed inventory. Internal links are recipes recreated at deployment; external build-machine links are forbidden.

Copy to a different path containing spaces, run read-only Doctor, start the ordinary Harness, verify its client HTTP response, and perform offline plugin removal before accepting the template. Check `verify-prebuilt-profile.mjs <installed-resources>` after electron-builder resource copying and signing, not only before packaging. The macOS and Windows smoke scripts and Linux workflow include this inventory check. Never bypass a missing-file check by regenerating the manifest from incomplete installed resources.

For full startup qualification, use a newly created private directory with `--dsh-package-smoke-root=<absolute-directory>` and a separate `DSH_HOME`. Record both readiness markers, HTTP reachability, continued Electron survival, and clean exit. Verify a second launch does not repeat template deployment. Test interruption before activation and confirm completed files are reused only after the prior owner has exited. Keep installation time, template deployment time, server/client readiness, package size, installed size and temporary peak space separate. Missing native platform evidence remains unverified; local `.app` qualification does not replace final DMG/ZIP or installer qualification.

### macOS native startup qualification

Keep `CFBundleName` consistent with `productName` and the packaged Helper executable names. Prefer electron-builder's generated `CFBundleName`; display-only branding belongs in `CFBundleDisplayName`. Electron reads `CFBundleName` before JavaScript starts to locate its Helper, so a mismatch can terminate with `SIGTRAP` and `Unable to find helper app` even after the user approves Gatekeeper and deep signature verification passes.

Run `node --test apps/desktop/scripts/smoke-macos-package.test.mjs`, then `node apps/desktop/scripts/smoke-macos-package.mjs <final.dmg> <final.zip>` on each matching native macOS runner. The script checks extracted final artifacts rather than the build directory, verifies all four Helpers and deep signatures, and requires `--dsh-native-smoke` to report `DSH_NATIVE_SMOKE_READY` and exit successfully within 15 seconds. This dedicated entry waits for Electron readiness before importing any stateful desktop modules; it uses a temporary user-data directory. A packaged application can ignore `--version` and start normally, so that flag is not a substitute. Never set `ELECTRON_RUN_AS_NODE` for this probe; it would bypass the failing native path. A failure blocks artifact upload and checksums; fix before accepting the build.

The native probe establishes Electron initialization, not Harness or UI readiness. Before publication, also launch the extracted application with isolated test data, inspect newly appended logs for `dsh web:`, `client ready`, and `event-dispatch is ready`, verify its client URL responds and Electron remains alive, then quit cleanly. Record the tested architecture and distinguish any untested platform; a developer Electron launch is not a packaged-app test. Do not disable SIP or Gatekeeper as a workaround for a Helper-name defect.

The first workflow run resolves registry-backed entries at their current stable version and passes one offline snapshot to that run's native builders. Pass that run as `bundled_plugin_run_id` to later same-commit platform runs. A mismatched source commit is rejected before packaging. Independent runs without this input can still resolve different snapshots if a plugin publishes between them.

The download helper computes one complete content digest for each run's `bundled-plugin-snapshot` artifact in temporary storage. The three digests must match. If they differ, do not combine those artifacts into one release. Re-run the stale targets close together, or use one `target=all` run when a single shared snapshot is more important than staged platform diagnosis.

## 6. Download one flat release set

After Windows, macOS, and Linux have successful runs, pass all three run IDs to one helper. It derives the version from `apps/desktop/package.json`, verifies the runs in temporary storage, resolves the main checkout through Git's common directory, and atomically creates the ignored `<primary-checkout>/release/<version>/` directory. Running the helper from a release or fix worktree does not change this destination. In this workspace the root is `/Users/6677h/StudioProjects/flaq-deepseek-harness/open-deepseek-harness-desktop/release/`:

```sh
skill=.agents/skills/open-dsh-desktop-release-packaging

"$skill/scripts/download-desktop-release.sh" \
  flaqai/open-deepseek-harness-desktop \
  <windows-run-id> \
  <macos-run-id> \
  <linux-run-id>
```

The resulting directory is flat and contains exactly these eight files:

```text
DeepSeek-Harness-linux-x64.deb
DeepSeek-Harness-linux-x64.rpm
DeepSeek-Harness-macos-arm64.dmg
DeepSeek-Harness-macos-arm64.zip
DeepSeek-Harness-macos-x64.dmg
DeepSeek-Harness-macos-x64.zip
DeepSeek-Harness-windows-x64.exe
SHA256SUMS
```

GitHub displays ten Release assets because it adds `Source code (zip)` and `Source code (tar.gz)` automatically. Those generated archives are not files in the local handoff directory and are not uploaded by this workflow.

The helper requires all three runs to name the same source commit and bundled-plugin snapshot. It validates each run conclusion, exact artifact ID, expected filename, and workflow checksum; validates ZIP payloads and optionally DMGs on macOS; combines the seven checksum entries; and refuses to replace an existing release directory.

Downloads use a stable directory below the system temporary directory, keyed by repository, run IDs, and version. Before each large incomplete artifact starts or resumes, the helper measures that exact artifact's signed route against `ODSH_MIN_DOWNLOAD_MIBPS`. With `aria2c`, a monitor observes aggregate download telemetry after a 15-second warmup and exits with status 75 when it remains below the floor for 30 seconds; `ODSH_LOW_SPEED_WARMUP_SECONDS` and `ODSH_LOW_SPEED_WINDOW_SECONDS` change those windows. With `curl`, the equivalent speed floor and sustained window stop the transfer. A speed stop prints the measured condition and preserves the resumable staging directory; do not lower the floor or resume until the user chooses another network or threshold.

When `aria2c` is present, each archive starts with 16 parallel ranges by default and prints its transfer summary every 10 seconds; `ODSH_DOWNLOAD_SUMMARY_INTERVAL_SECONDS` changes that positive-integer interval. Transport failures refresh the signed URL and reduce concurrency through `16,4,2,1`; the final single-connection attempt uses resumable `curl`. The helper removes `ALL_PROXY` only from the aria2 child so aria2 cannot reject a `socks5h://` value, while keeping the HTTP/HTTPS proxy route used by the other CLI tools. A failed run retains the staging directory, and a retry continues the same artifact ID. Completed archives are reused only when both the API-reported size and ZIP integrity match. Extraction is always non-interactive. A successful atomic handoff removes its staging directory.

Do not delete a retained staging directory just to retry, and do not introduce a one-off download script for large artifacts. Never rename unknown temporary files by process ID, file size, or download order. Never resume one artifact with another artifact's URL. If intentional cleanup is needed later, use the exact retained path printed by the helper after confirming that no retry needs it.

## 7. Final verification

Run the exact-set check again:

```sh
"$skill/scripts/verify-release-directory.sh" "$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")/release/<version>"
```

The verifier requires exactly seven installers and one checksum file at the directory root. Any nested directory, workflow metadata, bundled-plugin snapshot, source archive, partial download, or unrelated file makes verification fail. Artifact-container ZIPs are transport files, not GitHub Release assets. A successful CI run does not imply that a local download exists.

## 8. Publication boundary

The packaging workflow does not run on tag pushes and never publishes a Release. Publication uses the eight files already verified in `<primary-checkout>/release/<version>/`; it does not rebuild or replace them. Do not create a tag, create a GitHub Release, or upload assets until the user explicitly selects publication, reviews the notes and asset plan, and gives fresh authorization immediately before the external mutation. Packaging authorization alone is insufficient.
