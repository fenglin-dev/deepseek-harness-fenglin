# Open DSH Runtime Context

Open DSH Desktop can operate against either the Harness on the current computer or a separately owned Harness on a NAS. These terms distinguish where runtime-owned data and execution live from the Desktop device that presents them.

## Language

**Runtime**:
The Harness instance that owns plugins, model settings, sessions, and workspaces for the current Desktop session.
_Avoid_: Server, backend

**Local Runtime**:
The Runtime owned and executed by the current Desktop computer.
_Avoid_: Local server, local backend

**NAS Runtime**:
A Runtime owned and executed by a paired NAS deployment; it is not a remote directory for the Local Runtime.
_Avoid_: Remote data directory, shared Profile

**Runtime Selection**:
The durable choice between the Local Runtime and one saved NAS Runtime, applied by restarting Desktop rather than by silently falling back or hot-switching.
_Avoid_: Active server

**Paired Device**:
A Desktop installation with its own revocable credential for one NAS Runtime.
_Avoid_: User, account

**NAS Wire Protocol**:
The versioned fixed-route JSON messages exchanged by a NAS Runtime and Desktop for health, pairing, and Paired Device management.
_Avoid_: NAS API, Desktop bridge

**Pairing Ceremony**:
The user-visible sequence that inspects a NAS Runtime certificate, confirms its fingerprint, and exchanges a one-time code for one Paired Device credential.
_Avoid_: Login, trust checkbox

## Release Language

**Package Qualification**:
The evidence-backed decision that one platform installer satisfies the required release checks. A completed qualification is changed only by a failed required check, not by a later observability failure.
_Avoid_: Successful build, green workflow

**Smoke Evidence**:
Bounded, non-sensitive facts retained from a package qualification run to explain its phases and outcome. Missing or degraded Smoke Evidence does not change the Package Qualification result.
_Avoid_: User data archive, full diagnostic dump
