---
name: open-dsh-desktop-release-packaging
description: Prepare, build, monitor, download, and verify Open DeepSeek Harness Desktop release installers through the repository's GitHub Actions workflow. Use for release or packaging branches, Windows-first cross-platform package runs, packaging-fix retries, and local artifact handoff. Do not create tags or publish a GitHub Release unless the user explicitly requests that separate action.
---

# Open DSH Desktop release packaging

Package one source revision into Windows x64, macOS arm64/x64, and Linux x64 installers, then prove that every local file came from a successful run and matches the workflow checksum.

## Before changing Git state

Read [references/release-runbook.md](references/release-runbook.md). Inspect the main checkout and every worktree before choosing the release base. Preserve unrelated dirty changes and identify unmerged work rather than assuming that every worktree belongs in the release.

Treat these as separate authorizations:

- editing or committing the release version;
- pushing release or packaging-fix branches;
- creating or pushing a tag;
- creating a GitHub Release or uploading public assets.

An earlier permission to push a packaging-fix branch does not authorize a tag or Release.

## Required invariants

- Use `.github/workflows/desktop-packages.yml`; do not substitute a local cross-build for the native runners.
- Run `windows-x64` first, then `macos`, then `linux-x64` when the user requests the established staged flow.
- Keep `publish=false` during package qualification.
- Every accepted platform run must use the same final Git commit. If a packaging fix changes the commit, rebuild every platform already accepted from the older commit.
- The workflow resolves current stable registry-backed bundled plugins. When separate platform runs are used, compare the complete `bundled-plugin-snapshot` artifact contents; mismatched snapshots are not one coherent release set.
- The local handoff directory is exactly `release/<version>/`. It is flat and contains exactly seven installers plus `SHA256SUMS`; it contains no platform subdirectories, run metadata, snapshot metadata, or other files.
- A GitHub Release shows ten assets because GitHub adds source ZIP and TAR archives to the eight uploaded files. Do not download those generated source archives into the local handoff directory or upload replacements for them.
- A green build is not a downloaded deliverable. Download the named artifacts, verify the CI checksums, and report exact local paths.
- Never adopt a partial file from `gh` temporary storage or pair a resumable signed URL with a guessed artifact filename. A ZIP central directory can look plausible while its payload belongs to another artifact.

## Execution

1. Confirm the version, base branch, final source commit, expected branch names, remote, and publication boundary.
2. Create `release/<version>` from the confirmed base. Change only `apps/desktop/package.json` when that is the sole desktop version owner, then run proportionate checks and commit.
3. Create or update the packaging-fix branch from that release revision. Reuse old Windows fixes only after proving whether they are already ancestors of the release.
4. Push only the authorized branches and dispatch the workflow sequentially. Capture each run ID and head SHA.
5. Watch each run to completion. On failure, inspect failed logs, implement the narrow fix on the packaging-fix branch, push, and retry. Do not accept skipped smoke tests or checksum jobs as success.
6. After all three targets succeed, download them together with [scripts/download-desktop-release.sh](scripts/download-desktop-release.sh). The helper compares the three source SHAs and bundled-plugin snapshots in temporary storage, then atomically creates the flat `release/<version>/` directory.
7. Re-run [scripts/verify-release-directory.sh](scripts/verify-release-directory.sh) before handoff. It rejects a missing installer, an extra file, a nested directory, an incorrect checksum, or a malformed ZIP.
8. Confirm the Git checkout is clean and report the three accepted workflow runs and the helper's common source SHA and snapshot digest.

Do not run Playwright or `test:web` as part of this workflow unless the user separately requests them or a packaging failure specifically requires them.

## Completion report

Lead with the outcome. Include the release and fix branch names, final commit, commits created, exact checks run, workflow run links, local artifact directory, per-file checksum result, and any non-blocking workflow warning. State explicitly whether `master`, tags, or a GitHub Release were pushed or created.
