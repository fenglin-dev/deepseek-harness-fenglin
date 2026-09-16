# Agent Note: Immutable external-tool compatibility manifests

Status: implemented

English | [中文](2026-09-16-immutable-external-tool-compatibility-manifests.zh.md)

## Problem

The external-tool resolver compared only the desktop core version and removed prerelease suffixes. Releases such as `0.1.5-rc.1` and `0.1.5-rc.2.1` therefore accepted the same rolling signed manifest even though a Provider coordinate reviewed with one build might depend on Host behavior absent from the other. Exact npm package pins prevented following a dist-tag but did not keep a released desktop build bound to the coordinates reviewed for that build.

## Decision

Each desktop release owns one schema-v2 compatibility manifest whose `desktopVersion` is the complete application version, including prerelease and build components. The public filename also contains that complete version. Desktop main requests only that filename and accepts the signed document only when its complete parsed content equals the manifest embedded in the installer. Network, signature, expiry, identity, exact-version, or content mismatch uses a verified cache when valid and otherwise uses the embedded pins.

The repository retains every schema-v2 source manifest under a directory named for its desktop version. The master-only Pages workflow flattens those documents into unique public filenames, compares each existing public file byte-for-byte before publication, and fails instead of replacing different content. One GitHub OIDC attestation covers the retained manifest set. The deployed artifact contains the complete retained set, so adding a desktop version does not remove older version URLs.

Changing a Provider, native runtime, integrity value, or review baseline requires a new desktop application version and a new manifest. The release gate requires the current application version to have a matching source directory and continues to verify the exact registry coordinates and platform packages before packaging.

## Alternatives considered

**Keep one rolling manifest per core version line.** Rejected because prerelease suffixes often identify materially different Host builds, and the older client cannot prove that a later review exercised its own code.

**Use a signed semver range.** Rejected because a range still permits a later publication to reinterpret an already released client. A complete version and immutable content make the selected coordinates an application-build property.

**Use only the installer-embedded manifest.** Rejected because the signed version URL and cache retain an independently verifiable publication record and preserve the existing offline recovery path without granting remote pin changes.

## Consequences

An old desktop build never adopts Provider or runtime coordinates introduced for a later RC, stable release, or rebuild. Maintaining support for a newer external-tool runtime requires another desktop release. Clients compiled against the former rolling endpoint safely fall back to their own embedded pins when that endpoint is unavailable, but they cannot gain schema-v2 immutability without being rebuilt.

## Verification

Desktop tests reject changed coordinates under the same complete version, reject another prerelease on the same core version, verify version-named URLs and attestation subjects, preserve verified-cache fallback, and keep concurrent lookup sharing. Publication tests require the versioned v2 directory, wildcard multi-subject attestation, byte comparison before signing, Pages-only permissions, and no GitHub Release mutation. The registry gate requires the current desktop version's source manifest and verifies its Provider, runtime, optional platform packages, and SHA-512 values.
