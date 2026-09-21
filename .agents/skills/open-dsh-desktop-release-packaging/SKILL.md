---
name: open-dsh-desktop-release-packaging
description: Check the release download route, prepare, build, monitor, download, verify, and optionally publish Open DeepSeek Harness Desktop releases to GitHub and CNB. Use for release or packaging branches, Windows-first cross-platform runs, packaging-fix retries, local artifact handoff, bilingual Release notes, or publishing the exact verified installers. Packaging preparation includes a filled bilingual Release-notes draft; tags, uploads, and public Releases require fresh explicit authorization.
---

# Open DSH Desktop release packaging

Package one source revision into Windows x64, macOS arm64/x64, and Linux x64 installers, then prove that every local file came from a successful run and matches the workflow checksum. Optionally prepare bilingual notes and publish that exact local set.

## Before changing Git state

Read [references/current-release-state.md](references/current-release-state.md) for the most recently completed release, then run the release Doctor. The machine-readable plan under `<git-common-dir>/odsh-release-state/<version>.plan.json` is the active release ledger and version lock. Preserve its target version unless the user explicitly asks to change that version in the current conversation; requests to retry, rebuild, synchronize, package, upload, or publish do not authorize a version change. The generated sibling Markdown file is a human-readable snapshot, not a second source of truth.

Read [references/release-runbook.md](references/release-runbook.md). Inspect the main checkout and every worktree before choosing the release base. Preserve unrelated dirty changes and identify unmerged work rather than assuming that every worktree belongs in the release.

Choose the requested endpoint before starting:

- download and verify only;
- download, verify, and prepare bilingual Release notes;
- download, verify, prepare notes, and publish to GitHub plus CNB after review.

When the user asks to prepare or start packaging without choosing an endpoint, use **download, verify, and prepare bilingual Release notes**. Use download-only only when the user explicitly asks for artifacts without notes or for a packaging-only diagnostic retry. For packaging preparation, notes, or publication, also read [references/release-publication.md](references/release-publication.md) and [references/release-notes.md](references/release-notes.md).

Treat these as separate authorizations:

- editing or committing the release version;
- pushing release or packaging-fix branches;
- creating or pushing a tag;
- creating a GitHub Release or uploading public assets to GitHub and CNB.

An earlier permission to push a packaging-fix branch does not authorize a tag or Release.

## Required invariants

- Use `.github/workflows/desktop-packages.yml`; do not substitute a local cross-build for the native runners.
- Keep optional Python and Office runtimes out of `.github/workflows/desktop-packages.yml` and the desktop installer checksum set. Managed Python comes from the dedicated runtime-assets repository; the official Office engine comes from its official npm package. Desktop qualification consumes neither payload and cannot fail because an optional runtime build fails.
- On macOS, packaging entry scripts preserve one explicit proxy route and otherwise import enabled fixed proxies from `scutil --proxy` for their `gh`, `curl`, and `aria2c` children. No script assumes a fixed local proxy port or silently retries through a different route. Source `scripts/configure-cli-proxy.sh` before standalone `gh`, npm, or pnpm commands in the same release shell. Clash Verge's Global mode controls traffic after it enters Clash; System Proxy alone does not guarantee that CLI clients use it. Set `ODSH_USE_SYSTEM_PROXY=0` only when the user explicitly wants a direct route or supplies another proxy.
- Before changing release state or dispatching native builds, measure a non-expired desktop Actions artifact through its signed download address with `scripts/check-release-download-speed.sh`. Report the artifact, run, measured rate, and configured floor. The default floor is `1.0 MiB/s`; a failed or unavailable exact-node check stops preparation unless the user explicitly chooses another floor or waives the check.
- Run `windows-x64` first. After it qualifies, dispatch `macos` and `linux-x64` together with the Windows run's verified bundled-plugin snapshot. Different targets may run in parallel; the same target and branch remain serialized.
- Before dispatching package qualification, verify that `.github/workflows/desktop-packages.yml` declares `permissions: contents: read` and has no release-publication step. Dispatch only inputs the workflow actually declares; package qualification does not publish a GitHub Release.
- Native builds must retain and relocate the full prebuilt preset Profile. Verify its final installed resource inventory after copying and signing, plus ordinary isolated startup and offline plugin maintenance. Missing resources or integrity failures block acceptance; see the prebuilt-resource checks in the runbook.
- Every accepted platform run must use the same final Git commit. If a packaging fix changes the commit, rebuild every platform already accepted from the older commit.
- The workflow resolves current stable registry-backed bundled plugins. When separate platform runs are used, compare the complete `bundled-plugin-snapshot` artifact contents; mismatched snapshots are not one coherent release set.
- The local handoff directory is exactly `<primary-checkout>/release/<version>/`, where `<primary-checkout>` is the main checkout that owns the repository's Git common directory. It never follows a temporary release or fix worktree. In this workspace that resolves to `/Users/6677h/StudioProjects/flaq-deepseek-harness/open-deepseek-harness-desktop/release/<version>/`. The directory is flat and contains exactly seven installers plus `SHA256SUMS`; it contains no platform subdirectories, run metadata, snapshot metadata, `.DS_Store`, or other files. Activated handoffs are directory-read-only. An explicit same-version replacement archives the previous exact directory under `release/.archive/` before one atomic activation.
- A GitHub Release contains ten project-uploaded assets: the eight-file desktop handoff plus the versioned workspace-runtime catalog and its Sigstore bundle. Its page shows twelve entries after GitHub adds source ZIP and TAR archives. Keep the two metadata files outside the exact desktop handoff and do not upload replacements for GitHub's generated source archives.
- A green build is not a downloaded deliverable. Download the named artifacts, verify the CI checksums, and report exact local paths.
- CNB publication is downstream of the verified GitHub Release: the repository sync workflow mirrors the seven installers plus the two signed runtime-metadata files and writes the anonymous checksum-bearing update index. It is one authorized dual-target operation, but it is not atomic across providers.
- Every CNB sync selects exactly one GitHub Release tag. A manual retry must pass that reviewed tag through the workflow's `target_tag` input; never enumerate recent Releases or use a multi-Release backfill to retry one publication. The optional `delete_tags` input is destructive recovery only and requires the user's exact approved tag list.
- Before asking for final publication authorization, verify `CNB_SYNC_ENABLED=true`, confirm the `CNB_TOKEN` secret name is configured, and confirm the sync workflow is available on the default branch. A draft or GitHub prerelease is intentionally ineligible for CNB distribution; resolve the intended Release state before publishing.
- Do not call publication complete until the CNB sync run succeeds and the anonymous index exposes the exact tag, installer names, sizes, and SHA-256 values from the verified local set. A GitHub success followed by a CNB failure is a partial publication, not a success.
- Before GitHub publication, dispatch the workspace-runtime metadata workflow and preserve its two-file Actions artifact locally. That workflow signs metadata but never mutates a Release or triggers CNB. GitHub publication then creates one Draft, uploads and verifies one asset at a time, and publishes only after all ten identities match. An interrupted matching Draft is recoverable only through the explicit `--resume-draft` path; never clobber an existing same-name asset.
- Verify the completed CNB mirror with `scripts/verify-cnb-desktop-release.mjs --metadata-directory <directory>`; its anonymous index, seven installer downloads and two metadata downloads must match the local files. The index defaults to a six-hour lifetime so a delayed hourly workflow does not create an avoidable update outage.
- macOS qualification requires the final DMG and ZIP to pass `apps/desktop/scripts/smoke-macos-package.mjs` on each matching native runner before upload. Follow the macOS startup checks in the runbook; valid signatures and matching checksums alone do not establish launchability.
- Never adopt a partial file from `gh` temporary storage or pair a resumable signed URL with a guessed artifact filename. A ZIP central directory can look plausible while its payload belongs to another artifact.

## Execution

Run the release Doctor before step 1. It validates every worktree, the remote source SHA, notes, release identity, workflow permissions, disk space, publication configuration, and the real Actions artifact route before it creates the plan:

```sh
.agents/skills/open-dsh-desktop-release-packaging/scripts/release-doctor.mjs \
  --release-state <stable-or-prerelease> \
  --previous-tag <previous-public-tag> \
  flaqai/open-deepseek-harness-desktop
```

The Doctor performs the network preflight below as its final expensive check. For a route-only recheck, run:

```sh
.agents/skills/open-dsh-desktop-release-packaging/scripts/check-release-download-speed.sh \
  flaqai/open-deepseek-harness-desktop
```

The preflight prints `release network: adopted macOS system proxy` when it imports a fixed macOS proxy. If it remains slow, compare `env | grep -i proxy` with `scutil --proxy`; do not infer the CLI route from browser speed or Clash Verge's Global-mode label.

Exit status 75 means the measured route is below `ODSH_MIN_DOWNLOAD_MIBPS`. Tell the user the measured rate and threshold, stop the workflow, and retain any existing resumable staging directory. Do not lower the floor or resume automatically. The user may choose another network/proxy/node or explicitly set another floor. The download helper repeats this check against each large artifact and stops an active transfer after the aggregate rate remains below the floor for the configured sustained window.

Exit status 74 means the route could not produce enough valid samples after refreshing the signed URL; it is a transport failure, not evidence that the route is below the speed floor. Retry the same resumable operation after checking the proxy or node. TLS and API read failures never become a synthetic zero-speed result.

For an explicitly requested macOS-only repair, use `target=macos` and `refresh_plugins=false` to retain the committed plugin archives. Download with `scripts/download-desktop-release.sh --macos-only <owner/repo> <run-id>` into the primary checkout's `release/<version>/`. This partial handoff contains four macOS installers and their `SHA256SUMS`; verify it with `scripts/verify-release-directory.sh --macos-only <directory>`. Do not present this subset as a rebuilt eight-file release or overwrite the full Release checksum file with its four-entry checksum file. Retained Windows/Linux assets keep their original workflow run ID and checksum evidence.

1. Confirm the version, base branch, final source commit, expected branch names, remote, and publication boundary.
2. Create `release/<version>` from the confirmed base. Change the desktop version and every release-bound compatibility document required by repository gates, then run proportionate checks. Immediately derive the tag, title, and a complete bilingual notes draft from the source delta, write `.artifacts/release-notes/<tag>.md`, and show the draft to the user. Omit claims that still require native workflow or bundled-plugin snapshot evidence; do not leave placeholders for the user to fill. Committing and pushing remain separate authorizations.
3. Create or update the packaging-fix branch from that release revision. Reuse old Windows fixes only after proving whether they are already ancestors of the release.
4. Push only the authorized branch, run the release Doctor, then run [scripts/package-desktop-release.sh](scripts/package-desktop-release.sh) with the repository. It refuses a missing or mismatched Doctor plan, checks the remote branch, free space and the same route against GitHub API, Actions storage, the runtime repository and official npm; dispatches Windows first; dispatches macOS and Linux together only after Windows succeeds; then downloads and verifies the result. The plan records release-level truth; the adjacent v2 orchestration JSON is a low-level resumable journal that prevents duplicate dispatches and retains the last 100 retry records. Use `--retry-stage <stage>` for a failed stage and its dependents. `--restart` archives only the entire journal, never the release plan.
5. On failure, inspect the recorded run and failed logs, implement the narrow fix on the packaging-fix branch, push, and retry or explicitly restart the orchestration after the source SHA changes. Do not accept skipped smoke tests or checksum jobs as success.
6. The orchestrator calls [scripts/download-desktop-release.sh](scripts/download-desktop-release.sh) after all three targets succeed. The helper uses a stable system-temporary staging directory, resumes verified artifact IDs, compares the three source SHAs and bundled-plugin snapshots, resolves the primary checkout through Git's common directory, then atomically creates the flat `<primary-checkout>/release/<version>/` directory. Do not replace it with an ad-hoc downloader or place the final handoff under the active release worktree.
7. Re-run [scripts/verify-release-directory.sh](scripts/verify-release-directory.sh) before handoff. It rejects a missing installer, an extra file, a nested directory, an incorrect checksum, or a malformed ZIP.
8. Confirm the Git checkout is clean and report the initial network preflight, any download-time speed stop, the three accepted workflow runs, and the helper's common source SHA and snapshot digest.
9. Refresh the prepared bilingual notes with the accepted bundled-plugin snapshot, native qualification, exact asset names, and confirmed compatibility guidance. Re-run the notes validator against the previous actual public Release and final source SHA. Show the complete final Chinese and English body and the notes path to the user; never hand them an empty template or ask them to reconstruct the change list. If publication was requested, prepare and verify the signed two-file runtime metadata artifact, then show the final tag, SHA, title, ten project asset paths and checksums, GitHub destination, CNB destination, and intended Release state before obtaining fresh explicit authorization immediately before the dual-target publication flow.

Do not run Playwright or `test:web` as part of this workflow unless the user separately requests them or a packaging failure specifically requires them.

## Completion report

Lead with the outcome. Include the measured release-node speed and floor, release and fix branch names, final commit, commits created, exact checks run, workflow run links, local artifact directory, per-file checksum result, bilingual notes path, and any non-blocking workflow warning. During preparation, include the tag, title, and complete Chinese and English draft in the handoff. State explicitly whether `master`, tags, or a public Release was pushed or created. For publication, report the GitHub and CNB URLs, tag target, prerelease/latest state, CNB sync run and index revision, and remote identity verification for both providers. If only one provider completed, call the result partial and name the remaining recovery action.
