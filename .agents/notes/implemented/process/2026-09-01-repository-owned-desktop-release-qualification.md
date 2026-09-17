# Agent Note: Repository-owned desktop release qualification

Status: implemented

English | [中文](2026-09-01-repository-owned-desktop-release-qualification.zh.md)

## Problem

Desktop installer qualification spans Git branches, native GitHub Actions runners, platform artifacts, checksums, and a separate publication decision. Ad hoc commands can combine artifacts from different source commits or bundled-plugin resolutions, mistake a green workflow for a local deliverable, or publish a tag without a distinct authorization.

## Decision

The repository provides the [Open DSH Desktop release packaging skill](../../../skills/open-dsh-desktop-release-packaging/SKILL.md) as the maintained qualification workflow. [`.github/workflows/desktop-packages.yml`](../../../../.github/workflows/desktop-packages.yml) remains the source of truth for native builds and artifact names.

Qualification starts by sampling a non-expired desktop artifact through its GitHub Actions signed storage address. The measured rate and configured floor are reported before a release branch or native build starts. A missing exact-node sample or a rate below the default `1.0 MiB/s` floor stops preparation until the user changes the network route, explicitly chooses another floor, or waives enforcement.

Release preparation, branch pushes, tag creation, and GitHub Release publication require separate authorization. Package qualification keeps `publish=false` and does not create a tag.

Every accepted platform artifact set names one final Git commit. Separate platform runs also carry a digest of the resolved bundled-plugin snapshot; artifacts with different source commits or snapshot digests do not form one release set.

Repository-owned helper scripts download only successful workflow runs into temporary storage, verify the workflow checksum for each expected installer, and validate ZIP or DMG structure where the host supports it. Each large transfer repeats the signed-route check, and the active `aria2c` transfer stops after its aggregate telemetry remains below the configured floor for a sustained window. A speed stop preserves the exact artifact's resumable data and requires a user-selected network or floor before retry. The helpers atomically create one flat `release/<version>/` directory containing exactly seven installers and `SHA256SUMS`; any nested directory, missing file, or extra file fails verification. The handoff reports exact local paths rather than treating workflow artifacts as downloaded files.

Authorized GitHub publication first creates a Draft, uploads and verifies each asset separately, and publishes only when all eight identities match. Recovery of an interrupted Draft is explicit and reuses only matching remote assets. CNB synchronization publishes an anonymous index with a six-hour lifetime, and a repository verifier compares that index and every public download size with the exact local seven-installer set.

## Alternatives considered

**Build every platform from one developer machine.** Cross-building does not exercise the native packaging and installed-package checks owned by the workflow runners, so it cannot replace release qualification.

**Accept a successful workflow without downloading artifacts.** A green run proves CI produced artifacts but does not prove that the files handed to the user were downloaded intact or came from the intended run.

**Publish from the qualification workflow by default.** Combining verification with publication makes a packaging request implicitly mutate the public release surface. Publication remains an explicit later action.

**Test GitHub's main website instead of the artifact address.** The installers come from a signed Actions storage address, commonly backed by Azure Blob, so GitHub page latency does not establish the route that carries release bytes.

**Let every slow transfer continue.** A resumable download avoids data loss, but multi-gigabyte release collection can consume hours and repeatedly outlive signed URLs. A measured stop lets the user choose the route and time cost before work continues.

**Upload every GitHub asset in one opaque command.** A failure can leave a useful Draft but gives no controlled way to distinguish complete files from missing or mismatched files. Per-file upload and verification makes recovery observable without allowing destructive replacement.

## Consequences

Release packaging becomes repeatable and records the download route's observed speed and floor, source revision, workflow run, bundled-plugin resolution, local artifact path, checksum result, GitHub upload progress, and CNB public identity. The preflight consumes a bounded artifact sample, and a volatile route can stop an otherwise valid resumable transfer until the user chooses how to proceed. The local directory has eight project-managed files; GitHub displays ten Release assets because it adds two source archives. The skill and helpers must be updated when workflow inputs, artifact names, release filenames, download telemetry, or public index fields change, and the helpers intentionally refuse to overwrite an existing destination or a mismatched Draft asset.
