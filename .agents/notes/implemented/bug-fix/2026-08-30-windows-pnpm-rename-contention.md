# Agent Note: Retry transient Windows pnpm directory swaps

Status: implemented

English | [中文](2026-08-30-windows-pnpm-rename-contention.zh.md)

## Problem

A plugin install or update can fail on Windows while pnpm atomically replaces a dependency directory. Antivirus software and file indexing can briefly retain a handle to pnpm's generated `node_modules/*_tmp_<pid>_<sequence>` source directory, causing `ERR_PNPM_EPERM` on `rename` even though the Profile, package source, and user permissions are valid. Plugin markets and other callers receive the same failure because they all delegate mutations to `dsh plugin`.

## Decision

The CLI package-manager runner recognizes only a Windows `ERR_PNPM_EPERM` diagnostic that names a `rename`, a `node_modules` path, and pnpm's generated `_tmp_<pid>_<sequence>` suffix. It retries the unchanged pnpm invocation after 500 ms, 1.5 s, and 3 s. A successful retry retains a bounded recovery line for diagnostics. Exhaustion retains the final pnpm output and records that the destination stayed locked.

Ordinary `EPERM` operations, non-Windows failures, rename failures without pnpm's temporary-directory identity, build approvals, network errors, and cancellations do not enter this recovery path.

## Verification

CLI unit coverage pins the platform and diagnostic requirements, the complete retry schedule, exhaustion, unrelated permission failures, Unicode and spaced Windows paths, and a real packaged pnpm-entry subprocess that fails once before succeeding. The existing packaged-entry test continues to pin argument preservation.

## Alternatives considered

**Retry every pnpm failure.** Rejected because permanent permission, package, policy, integrity, and configuration failures would become slower and less clear without becoming recoverable.

**Teach each plugin market or client UI to retry.** Rejected because every supported surface delegates installation to the CLI; placing recovery there covers old and new market versions, direct client actions, and command-line use without duplicating classifiers.

**Stop the active Harness for every plugin mutation.** Rejected because ordinary JavaScript plugin installation supports live operation, stopping the process would also remove the market UI that initiated the request, and the reported pure-JavaScript dependency failure can be transient. Persistent locks remain explicit after the bounded retry budget.

## Consequences

Transient Windows filesystem contention adds at most 5 seconds before success or a final failure. The narrow classifier avoids hiding real access-control problems, while all CLI-backed plugin installation and update paths receive the same recovery behavior. A native module or another process that keeps a persistent handle still requires the user to disable the plugin or stop the owning process before retrying.
