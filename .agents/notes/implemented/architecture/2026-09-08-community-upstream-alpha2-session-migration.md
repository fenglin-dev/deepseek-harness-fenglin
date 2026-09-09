# Agent Note: Community Desktop integration of upstream 0.1.3-alpha.2

Status: implemented

English | [中文](2026-09-08-community-upstream-alpha2-session-migration.zh.md)

## Problem

Upstream replaces the persistence coordinator with SessionHandle ownership and adjacent session-format migrations. Keeping the old coordinator would create two persistence authorities; removing it without adaptation would reject recoverable Community Desktop sessions.

## Decision

The integration is pinned to `dsh-v0.1.3-alpha.2` (`82a5fd61a7cf5c293cec4bdff68f455398d685e9`), not upstream master. Desktop branding, bundled plugin versions, native titlebar/content isolation, diagnostic recovery, snapshots and external-tool controls remain downstream-owned.

The v0-to-v1 and decoded v1-to-v2 migration stages buffer an empty-identity assistant tool message and its adjacent failed call/result pairs. Only matching `UNKNOWN_TOOL` results with the same turn, step, arguments and source sequence receive deterministic synthetic identities. Ambiguous or incomplete groups fail migration; no event is silently discarded. Existing source files remain untouched by the generation-specific migration writer. The newly generated v2 artifact contains the repaired identities.

The released payload inventory also includes Community Desktop's `external-tools/resolved` audit event, validating its turn, step and Codex/Claude Code tool names. This is a named historical extension, not permission to migrate arbitrary unknown events.

CLI startup retains dependency healing and safe-mode composition while installing upstream's environment proxy before plugin loading. Composition failures dispose the proxy before the desktop recovery retry. Plugin-command completion retains graceful Node exit rather than forced process termination.

## Alternatives considered

The embedded external-tool manifest and Web installation fallback pin both official Providers to `0.1.3-alpha.2`, with registry-verified SHA-512 values. Codex `0.149.1` and Claude Agent SDK `0.3.241` remain unchanged. Updating these local pins does not publish the remote signed manifest or update users' installed tools. A remote publication needs a separate compatibility review for the desktop version line it serves.

**Keep the coordinator.** Rejected because upstream's SessionHandle and exclusive writer lease own persistence; duplicating them would undermine locking and migration.

**Reject every old empty tool identity.** Rejected because a complete adjacent failed sequence provides enough evidence to preserve the conversation without executing a tool.

**Repair arbitrary damaged records or skip unknown events.** Rejected because this could change tool relationships or silently lose recoverable content. The narrowly recognized failure remains distinct from successful tool execution.

Historical packed tool deltas may have empty string IDs or names. The physical reader preserves these strings, and the v1-to-v2 edge expands only these runs into raw timed chunks because v2 compact tool runs require a complete identity. A proven failed-call repair also aligns the matching empty final stream block with the repaired message; earlier deltas, arguments and timestamps remain unchanged. Different content or a missing final block refuses this alignment. Non-string IDs, sequence overlaps and missing tool results remain errors. Regression tests cover both source versions, identity alignment and v2 reopening.

## Consequences

Upgraded sessions use v2 storage and must not be assumed readable by the previous desktop release. Plugin snapshots restore deployment state, not session data. Verification uses synthetic temporary sessions, never users' live configuration. The upstream process-cleanup changes do not establish that Windows out-of-workspace deletion is prevented.

The existing [gateway identity decision](../bug-fix/2026-08-17-empty-gateway-tool-call-identity.md) remains active: it prevents malformed new stream identities, while this migration handles already persisted failures.

## Verification

Focused tests cover deterministic identity recovery, source immutability, v0/v1 migration and v2 reopening, historical external-tool audit events, and rejection of incomplete or unrelated tool results. Storage tests exercise lease contention and recovery. Windows/Linux interactive verification and third-party plugin compatibility remain separate release checks; macOS tests do not establish their results.
