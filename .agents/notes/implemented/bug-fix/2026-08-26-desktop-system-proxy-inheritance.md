# Agent Note: Pass the desktop system proxy to managed Harness processes

Status: implemented

English | [中文](2026-08-26-desktop-system-proxy-inheritance.zh.md)

## Problem

Electron uses the operating system proxy automatically, but the desktop-owned Harness process and its managed product subagents inherit only process environment variables. A user can therefore load the desktop UI through the system proxy while the package-local Codex app-server attempts direct WebSocket connections, repeatedly times out, and falls back to a slower transport. The installed Codex package and native platform payload remain healthy, so reinstalling the connector does not correct this network mismatch.

## Decision

After Electron becomes ready, the desktop host resolves the ChatGPT Codex endpoint. The [Codex-only scope decision](2026-09-03-desktop-codex-proxy-scope.md) limits that route to the official Provider's runtime environment, with loopback bypasses, rather than the entire Harness environment. The published connector needs no source changes and the user's Codex configuration is not rewritten.

Explicit proxy environment variables remain authoritative. A direct route, unsupported proxy route, malformed result, or resolver failure leaves the process environment unchanged. The host logs only whether system proxy inheritance was enabled and never logs the resolved proxy address.

## Alternatives considered

**Modify the published Codex connector.** The desktop installs the official package from npm and cannot replace an already published DeepSeek-scoped version. A later connector can enable Codex's native system-proxy feature, but that does not repair existing installations.

**Copy the system proxy into `~/.codex/config.toml`.** This would make the desktop a second owner of native Codex configuration and could overwrite settings used by Codex CLI and the Codex app.

**Disable WebSocket transport.** HTTPS fallback avoids the repeated handshake delay but gives up the product's preferred transport and does not make other managed network clients follow the desktop route.

## Consequences

Codex receives an endpoint-derived system route when available, while explicit deployment or Provider proxy variables retain priority. Plugin installation retains its own pnpm and Git configuration. One proxy URL cannot express all PAC destination rules; this integration does not claim full PAC support or verified connectivity on every platform.
