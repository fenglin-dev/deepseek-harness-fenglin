# Agent Note: Explicit desktop plugin transaction authorization

Status: implemented

English | [中文](2026-09-16-market-restart-authorization.zh.md)

## Problem

The resident Harness passed Desktop mutation authorization to market CLI children. A successful child staged rather than updated the active Profile, then the polling transaction manager activated it and stopped Harness before the market finished result verification. Missing activation log lines did not exclude this path; attributing that exit to the market restart button was unsupported.

## Decision

Supervisor strips one-shot transaction ownership, lease, batch and candidate-origin environment values from resident processes. Desktop prepare and resume commands retain explicit authorization. Market commands retain the ordinary CLI lock and automatic snapshot path; successful mutation must precede market result checking. Third-party archives and restart controls remain unmodified.

Automatic restart waits for external writers at one-second intervals for at most fifteen minutes. It rejects unreadable ownership and retained self-owned leases, recovers abandoned journals, and requires journal settlement. Stop cancels the wait and invalidates late completions; deliberate candidate resume bypasses it. Logs distinguish deliberate stops, candidate activation, unexpected exits, writer waiting and recovery.

Supervisor supplies a fresh restart-owner marker per launch. The CLI claims that generation before Profile boot and prevents inherited same-home Web replacements from starting a competing service. The marker is separate from mutation authorization and does not affect other homes, Profiles, or standalone CLI launches.

## Alternatives considered

**Keep implicit staging but postpone activation.** The market reads the active Profile after CLI success, so an unactivated candidate reports success before the requested change is visible.

**Disable the market restart button or patch its source.** Neither fixes inherited transaction authorization. The user requires the original market flow and unmodified archives.

## Consequences

Market operations have snapshot recovery, not Desktop's complete candidate dependency rollback; this change does not alter Desktop rollback policy. The original official restart module reproduced two live HTTP services before the fix and one afterward. In an isolated macOS Profile, unmodified dshmarket 1.47.0 installed a fixture plugin, updated it from 1.0.0 to 2.0.0, removed it, and checked results without a new Harness generation. Its original restart endpoint then produced exactly one new generation. A separate production Electron launch verified client and event-dispatch readiness before and after that endpoint, HTTP 200, and a surviving Electron process. Windows native behavior remains unverified.
