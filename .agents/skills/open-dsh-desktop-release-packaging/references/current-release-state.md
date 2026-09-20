# Current desktop release state

This file is the authoritative ledger for the active desktop packaging cycle. Read it before changing release Git state, dispatching package workflows, downloading artifacts, or publishing.

## Version lock

- Target version: `0.1.6-alpha.2`
- Tag: `odsh-v0.1.6-alpha.2`
- Title: `v0.1.6-alpha.2`
- Release branch: `release/0.1.6-alpha.2`
- Packaging branch: `fix/windows-packaging-0.1.6-alpha.2`
- Lock rule: preserve this version and identity until the user explicitly requests a version change. A request to retry, rebuild, synchronize, package, upload, or publish preserves this lock.

## Recorded source state

Last observed: `2026-09-20 01:53:16 CST`

| Item | Recorded value | State |
| --- | --- | --- |
| `master` | `origin/master` | pushed |
| Packaging branch | `origin/fix/windows-packaging-0.1.6-alpha.2` | pushed; final source for all accepted platform runs |
| Release branch | `origin/release/0.1.6-alpha.2` | synchronized and pushed |
| Release notes | `.artifacts/release-notes/odsh-v0.1.6-alpha.2.md` | refreshed after native qualification |

## Network preflight

| Item | Recorded value |
| --- | --- |
| Adopted route | HTTP, HTTPS, and SOCKS through `127.0.0.1:7890` |
| Required floor | `1.0 MiB/s` |
| Last result | passed at `6.42 MiB/s`; sampled `desktop-linux-x64` from run `35109607670` (`33554432` bytes in `4.98s`) |
| Dispatch permission | allowed by network preflight; no workflow dispatched during this retry-only check |

## Platform delivery matrix

These rows describe artifacts built from the final source for this locked version, not older runs with the same or a nearby version.

| Platform | Workflow run | Build | Native qualification | Downloaded locally | Exact-set verified | Public on GitHub | Public on CNB |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Windows x64 | [35455508915](https://github.com/flaqai/open-deepseek-harness-desktop/actions/runs/35455508915) | succeeded | installed-package smoke succeeded, including first start, guarded upgrade, restart, and uninstall | downloaded | verified | no | no |
| macOS arm64/x64 | [35456891164](https://github.com/flaqai/open-deepseek-harness-desktop/actions/runs/35456891164) | succeeded for both architectures | final DMG and ZIP smoke succeeded for arm64 and x64 | downloaded | verified | no | no |
| Linux x64 | [35458153656](https://github.com/flaqai/open-deepseek-harness-desktop/actions/runs/35458153656) | succeeded | packaged resources and Linux package smoke succeeded | downloaded | verified | no | no |

## Publication state

- GitHub tag: not created.
- GitHub Release: not found when checked on `2026-09-19`; no platform assets are public there.
- CNB anonymous update index: reachable through the recorded proxy but contains no `0.1.6-alpha.2` entry; no platform is publicly distributed through the update index.
- Bundled-plugin snapshot: `fe0d9405f880cd2f0450e757f8c93d1a9328e5c3f173ac1a54fe2bed054640a8`; identical across accepted platform runs.
- Local handoff directory: `/Users/6677h/StudioProjects/flaq-deepseek-harness/open-deepseek-harness-desktop/release/0.1.6-alpha.2`; exact seven installers plus `SHA256SUMS` verified.
- Publication authorization: not granted by this ledger. Obtain fresh explicit authorization immediately before tag creation, asset upload, or public Release publication.

## Updating this ledger

Update this file after each material transition. Record only observed facts:

- final source branch, immutable workflow run, and branch synchronization;
- network measurement and floor;
- each platform run ID, head SHA, result, and native qualification;
- bundled-plugin snapshot identity;
- local download directory and exact-set verification;
- GitHub tag, Release state, asset visibility, and URL;
- CNB sync run, Release/index visibility, revision, expiry, and URL.

Use explicit states such as `not started`, `running`, `succeeded`, `failed`, `downloaded`, `verified`, and `public`. Keep each platform independent; one public platform does not make the release fully public.
