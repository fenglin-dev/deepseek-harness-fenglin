# Agent Note: Scope the desktop system proxy to Codex

Status: implemented

English | [中文](2026-09-03-desktop-codex-proxy-scope.zh.md)

## Problem

A system PAC can select different routes for ChatGPT, npm metadata, package archives, and Git. Copying the ChatGPT route into the entire Harness environment changes plugin installation traffic without checking its destination. A reported Windows pnpm timeout motivated this review, but that report does not establish this route mismatch as its root cause.

## Decision

This decision replaces the process-wide scope in the [system proxy inheritance note](2026-08-26-desktop-system-proxy-inheritance.md). Electron resolves the ChatGPT endpoint with a three-second deadline and conveys the result through `DSH_DESKTOP_CODEX_PROXY`, leaving conventional proxy variables unchanged. A leading `DIRECT` terminates route selection. Errors and deadlines retain the parent environment; logs omit resolver details and addresses.

The CLI applies this route only to `@deepseek-ai/dsh-subagent-codex` rows through the official Provider's existing `config.env`. It recomputes the defaults after Profile composition on startup and live patch reload. Explicit parent or Provider proxy variables win regardless of key casing. Other Provider configuration and loopback bypasses remain intact. No Profile, pnpm, Git, or Codex configuration file is rewritten.

The common Profile package-manager runner appends code-based timeout, DNS, authentication, TLS, or connection hints and elapsed time. These added hints never copy raw URLs or environment values and distinguish explicit environment settings from an unverified effective route. Original pnpm output remains available and may require redaction before sharing.

## Alternatives considered

**Remove pnpm's dispatcher.** This changes proxy selection, custom certificates, and connection behavior together, so a successful workaround does not isolate a library defect. The embedded pnpm implementation stays unchanged.

**Resolve the npm registry once and use that route for all installations.** Archive and Git destinations can differ from the registry. This would repeat the same PAC routing error.

**Implement a per-request PAC bridge.** That requires independent handling of proxy failover, authentication, bypass rules, and every downloader. This change deliberately limits automatic routing to Codex; package installation retains pnpm and Git configuration.

## Consequences

The [portable A/B runner](../../../../apps/desktop/scripts/proxy-ab/benchmark.mjs) measures both environment policies with the same pnpm binary. A controlled wrong-route fixture observes actual proxy and registry requests, while a separate live mode probes a fixed public npm package. Per-attempt isolated cold stores and independent warm preparation avoid cache-order bias. Reports distinguish failed requests, verified installs, paired-success timing, and cleanup; synthetic success-rate gains are not Internet acceleration evidence. The Windows wrapper accepts explicit runtime paths and does not patch an installer.

Plugin operations do not inherit the automatically selected ChatGPT proxy. Users who need a proxy for pnpm must configure it explicitly. This is not complete PAC support: Codex still receives one endpoint-derived route, and changes to system proxy settings require restarting Desktop.

Tests exercise real patch composition, explicit overrides and reload, destination isolation, direct routing, resolver failure and deadline, redacted hints, and a failing package-manager child process. Native Windows timeout reproduction and authenticated proxy, private CA, SOCKS, and end-to-end Codex connectivity remain manual validation requirements; passing these tests does not prove the reported Windows incident resolved.
