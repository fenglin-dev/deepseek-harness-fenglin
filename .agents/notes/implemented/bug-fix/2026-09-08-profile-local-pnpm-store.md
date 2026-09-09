# Agent Note: Configuration-local pnpm cache

Status: implemented

English | [中文](2026-09-08-profile-local-pnpm-store.zh.md)

## Problem

pnpm's default same-volume cache selection can create a `.pnpm-store` at a drive root when the Profile is outside the user's home volume. Changing only the cache option can reject installed plugins with `ERR_PNPM_UNEXPECTED_STORE`.

## Decision

The CLI package-manager owner selects `.pnpm-store` under the resolved DSH home for plugin operations, repairs and snapshot installation. Explicit process arguments select the store; pnpm and npm configuration environment variables propagate the selection to nested installers. The selected pnpm executable resolves its versioned store path with a 15-second bound.

For a same-format store and a real Profile-local virtual dependency tree, the owner atomically updates only the `.modules.yaml` cache locator. Existing package files, build results, lockfiles and old shared caches remain unchanged. Symlinked metadata is refused. Store-format changes and external virtual stores retain pnpm's ordinary compatibility checks instead of silently rewriting their location.

## Alternatives considered

**Program installation directory:** Program Files can require elevated privileges and a macOS application bundle is signed. The writable configuration home follows the user's chosen data volume.

**Forced reinstall or copying the shared cache:** Reinstallation can interrupt working plugins and need network access; copying an entire shared cache duplicates unrelated projects. Cache rebinding preserves the materialized dependency tree without weakening build approval.

## Consequences

The cache is scoped to one configuration home, not one Profile or application version. Changing homes selects another cache. Old shared caches are not automatically cleaned up, and cache misses still require local archives or authorized network access. The real bundled pnpm regression covers same-format rebinding, frozen offline installation, add/remove and switching homes; malformed metadata and external-store checks remain explicit. Windows drive placement still needs native Windows verification.
