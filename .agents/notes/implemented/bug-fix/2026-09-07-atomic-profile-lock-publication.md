# Agent Note: Atomic Profile lock publication

Status: implemented

English | [中文](2026-09-07-atomic-profile-lock-publication.zh.md)

## Problem

Creating a Profile mutation lock before writing its owner leaves an empty lock if the process terminates between those operations. Deleting every empty lock can admit two writers while a live owner is still initializing it. [Issue 16](https://github.com/flaqai/open-deepseek-harness-desktop/issues/16) reports interrupted plugin operations and pnpm connection timeouts.

## Decision

The snapshot implementation writes and synchronizes an owner-only temporary file beside the lock, then publishes it with an exclusive hard link. Lease promotion uses atomic rename while the existing owner holds the lock. Failed publication removes the temporary name and preserves the existing owner. Malformed owners remain protected and produce an actionable error; missing leases receive a distinct error. Filesystems without hard-link support fail closed.

The pnpm network implementation retains its dispatcher and proxy/TLS settings. The portable network benchmark records both Node's Undici version and the version embedded in pnpm's implementation, when identifiable. A Windows-specific fetch change requires affected-machine evidence.

## Alternatives considered

**Immediately delete malformed locks.** This cannot distinguish an interrupted owner from a live legacy process writing its lock.

**Replace pnpm fetch and omit its dispatcher.** This discards configured routing and certificate behavior. A successful request on one machine does not establish equivalence.

## Consequences

New owner publication does not expose incomplete JSON. Existing malformed locks require all DSH instances to be closed before an operator moves the lock aside. A forced exit can leave an unreferenced temporary file; it does not reserve the Profile. Focused tests cover competing acquisition, failed lease publication, malformed owners, dead legacy PIDs and token-preserving release. Native Windows validation and the reported network timeout remain outstanding.
