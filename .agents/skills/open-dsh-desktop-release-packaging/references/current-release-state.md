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

Last observed: `2026-09-19 23:09:42 CST`

| Item | Recorded value | State |
| --- | --- | --- |
| `master` | local version-lock update | pending commit; `origin/master` contains the preceding merged fixes |
| Packaging branch | synchronized to the preceding `master` | pushed; synchronize again after the version-lock commit |
| Release branch | older release preparation | stale; do not package until synchronized to the final source |
| Release notes | `.artifacts/release-notes/odsh-v0.1.6-alpha.2.md` | not prepared for the current source |

## Network preflight

| Item | Recorded value |
| --- | --- |
| Adopted route | HTTP, HTTPS, and SOCKS through `127.0.0.1:7890` |
| Required floor | `1.0 MiB/s` |
| Last result | failed before a valid speed measurement: `curl exit 35`, HTTP `000` |
| Dispatch permission | blocked until the exact artifact route passes, or the user explicitly waives or changes the floor |

## Platform delivery matrix

These rows describe artifacts built from the final source for this locked version, not older runs with the same or a nearby version.

| Platform | Workflow run | Build | Native qualification | Downloaded locally | Exact-set verified | Public on GitHub | Public on CNB |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Windows x64 | none | not started | not started | no | no | no | no |
| macOS arm64/x64 | none | not started | not started | no | no | no | no |
| Linux x64 | none | not started | not started | no | no | no | no |

## Publication state

- GitHub tag: not created.
- GitHub Release: not found when checked on `2026-09-19`; no platform assets are public there.
- CNB anonymous update index: reachable through the recorded proxy but contains no `0.1.6-alpha.2` entry; no platform is publicly distributed through the update index.
- Local handoff directory: not created or verified for this cycle.
- Publication authorization: not granted by this ledger. Obtain fresh explicit authorization immediately before tag creation, asset upload, or public Release publication.

## Updating this ledger

Update this file after each material transition. Record only observed facts:

- final source SHA and branch synchronization;
- network measurement and floor;
- each platform run ID, head SHA, result, and native qualification;
- bundled-plugin snapshot identity;
- local download directory and exact-set verification;
- GitHub tag, Release state, asset visibility, and URL;
- CNB sync run, Release/index visibility, revision, expiry, and URL.

Use explicit states such as `not started`, `running`, `succeeded`, `failed`, `downloaded`, `verified`, and `public`. Keep each platform independent; one public platform does not make the release fully public.
