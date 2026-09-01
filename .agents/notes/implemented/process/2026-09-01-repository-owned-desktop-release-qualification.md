# Agent Note: Repository-owned desktop release qualification

Status: implemented

English | [中文](2026-09-01-repository-owned-desktop-release-qualification.zh.md)

## Problem

Desktop installer qualification spans Git branches, native GitHub Actions runners, platform artifacts, checksums, and a separate publication decision. Ad hoc commands can combine artifacts from different source commits or bundled-plugin resolutions, mistake a green workflow for a local deliverable, or publish a tag without a distinct authorization.

## Decision

The repository provides the [Open DSH Desktop release packaging skill](../../../skills/open-dsh-desktop-release-packaging/SKILL.md) as the maintained qualification workflow. [`.github/workflows/desktop-packages.yml`](../../../../.github/workflows/desktop-packages.yml) remains the source of truth for native builds and artifact names.

Release preparation, branch pushes, tag creation, and GitHub Release publication require separate authorization. Package qualification keeps `publish=false` and does not create a tag.

Every accepted platform artifact set names one final Git commit. Separate platform runs also carry a digest of the resolved bundled-plugin snapshot; artifacts with different source commits or snapshot digests do not form one release set.

Repository-owned helper scripts download only successful workflow runs into temporary storage, verify the workflow checksum for each expected installer, and validate ZIP or DMG structure where the host supports it. They atomically create one flat `release/<version>/` directory containing exactly seven installers and `SHA256SUMS`; any nested directory, missing file, or extra file fails verification. The handoff reports exact local paths rather than treating workflow artifacts as downloaded files.

## Alternatives considered

**Build every platform from one developer machine.** Cross-building does not exercise the native packaging and installed-package checks owned by the workflow runners, so it cannot replace release qualification.

**Accept a successful workflow without downloading artifacts.** A green run proves CI produced artifacts but does not prove that the files handed to the user were downloaded intact or came from the intended run.

**Publish from the qualification workflow by default.** Combining verification with publication makes a packaging request implicitly mutate the public release surface. Publication remains an explicit later action.

## Consequences

Release packaging becomes repeatable and records the source revision, workflow run, bundled-plugin resolution, local artifact path, and checksum result. The local directory has eight project-managed files; GitHub displays ten Release assets because it adds two source archives. The skill and helpers must be updated when workflow inputs, artifact names, or release filenames change, and the helpers intentionally refuse to overwrite an existing destination.
