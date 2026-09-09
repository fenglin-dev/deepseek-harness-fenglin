---
description: "Browser-safe Workspace path helpers for joining relative paths, abbreviating POSIX homes, and deriving display titles."
kind: "package-library"
---

# dsh-util-workspace-path

English | [中文](README.zh.md)

## Summary

Browser-safe path helpers shared by Workspace-facing client and controller packages. The package joins Workspace-relative paths, abbreviates POSIX home directories for display, derives Workspace titles from POSIX or Windows paths, and owns the `dsh-resource://file/…` address grammar that names a workspace file across the Sidebar and the resource model. It has no Cordis service or runtime state.

## Table of Contents

- [File addresses](#file-addresses)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="file-addresses"></a>
## File addresses

A resource address is `dsh-resource://<type>/…`, and the type — the URI host — is the resource protocol key (`file`, or one a plugin declares in `ResourceProtocolMap`); any other scheme is a navigation protocol, defined elsewhere. A file address has one of two scopes. `dsh-resource://file/session/<sessionId>/<path>` names a file by its path relative to that Session's workspace root (`dsh-resource://file/session/abc123/src/notes.txt`), which the Host resolves against the root it holds for the Session. `dsh-resource://file/absolute/<path>` names a file by its absolute path with the leading `/` dropped (`dsh-resource://file/absolute/home/ys/notes.txt` on POSIX, `dsh-resource://file/absolute/C:/x/y.txt` for a Windows drive, `dsh-resource://file/absolute//server/share/y.txt` for a UNC path, whose empty first segment keeps its identity); it carries no Session, so the reader's own Session resolves it, and the Host's workspace confinement still applies. The grammar lives in [`src/file-address.ts`](src/file-address.ts); the path helpers stay in [`src/index.ts`](src/index.ts), which re-exports it.

`sessionFileAddress(sessionId, relativePath)` and `absoluteFileAddress(absolutePath)` build one: `\` becomes `/`, a leading `./` or `/` is dropped, and every id and path segment is component-encoded with `:` kept literal, so `#`, `?`, and spaces in a name survive while a drive letter reads as written. `fileAddressFor(sessionId, cwd, path)` chooses the scope for a path as a caller holds it: a relative path, or an absolute path inside `cwd`, becomes `session`-relative; any other absolute path becomes `absolute`. `parseFileAddress(address)` reads one back through `new URL()`: the scheme must be `dsh-resource` and the host exactly `file`; a `session` address yields `{ scope, sessionId, path }` with the workspace-relative path, an `absolute` address yields `{ scope, path }` with the leading `/` restored (`//` for a UNC path) unless the path starts with a drive letter. It returns `undefined` for another type or scheme, an unknown scope, a missing id or path, a non-URL, or a malformed escape — the caller decides whether that is a failure.

-----

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Resolution is lexical** — it recognizes POSIX absolute paths, Windows drive paths, and UNC paths, preserves the Workspace path's separator when joining a relative path, and does not access a filesystem or canonicalize `.` and `..` segments.
- **Home abbreviation is POSIX-only** — Windows paths remain unchanged because a portable browser cannot infer Windows home-path equivalence safely.


<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. This utility owns no mutable runtime relationship.
