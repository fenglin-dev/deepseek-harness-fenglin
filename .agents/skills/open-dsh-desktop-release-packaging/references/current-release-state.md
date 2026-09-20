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

Last observed: `2026-09-20 16:09:03 CST`

| Item | Recorded value | State |
| --- | --- | --- |
| `master` | `origin/master` | pushed; selected source candidate for the rebuild |
| Packaging branch | `origin/fix/windows-packaging-0.1.6-alpha.2` | still points to the previous qualified source; synchronization not started |
| Release branch | `origin/release/0.1.6-alpha.2` | still points to the previous qualified source; synchronization not started |
| Release notes | `.artifacts/release-notes/odsh-v0.1.6-alpha.2.md` | early bilingual draft refreshed for `origin/master`; native qualification claims removed pending the rebuild |

## Network preflight

| Item | Recorded value |
| --- | --- |
| Adopted route | HTTP, HTTPS, and SOCKS through `127.0.0.1:7890` |
| Required floor | `1.0 MiB/s` |
| Last result | passed at `1.18 MiB/s` minimum and `1.52 MiB/s` average; sampled `desktop-linux-x64` from run `35458153656` (`47824896` bytes in `30.00s`) |
| Dispatch permission | allowed by the rebuild network preflight; no new workflow dispatched yet |

## Platform delivery matrix

These rows describe artifacts built from the final source for this locked version, not older runs with the same or a nearby version.

| Platform | Workflow run | Build | Native qualification | Downloaded locally | Exact-set verified | Public on GitHub | Public on CNB |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Windows x64 | previous run [35455508915](https://github.com/flaqai/open-deepseek-harness-desktop/actions/runs/35455508915) | stale after source advanced | previous installed-package smoke succeeded; rebuild not started | previous set retained | pending rebuild | no | no |
| macOS arm64/x64 | previous run [35456891164](https://github.com/flaqai/open-deepseek-harness-desktop/actions/runs/35456891164) | stale after source advanced | previous final DMG and ZIP smoke succeeded; rebuild not started | previous set retained | pending rebuild | no | no |
| Linux x64 | previous run [35458153656](https://github.com/flaqai/open-deepseek-harness-desktop/actions/runs/35458153656) | stale after source advanced | previous packaged-resource and package smoke succeeded; rebuild not started | previous set retained | pending rebuild | no | no |

## Publication state

- GitHub tag: not created.
- GitHub tag and Release: `odsh-v0.1.6-alpha.2` not found when checked on `2026-09-20`; no platform assets are public there.
- CNB anonymous update index: reachable through the recorded proxy but contains no `0.1.6-alpha.2` entry; no platform is publicly distributed through the update index.
- Bundled-plugin snapshot: previous qualified digest `fe0d9405f880cd2f0450e757f8c93d1a9328e5c3f173ac1a54fe2bed054640a8`; the rebuild has not resolved its snapshot.
- Local handoff directory: `/Users/6677h/StudioProjects/flaq-deepseek-harness/open-deepseek-harness-desktop/release/0.1.6-alpha.2`; it contains the previous exact set and must not be presented or published as the new `origin/master` candidate.
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
