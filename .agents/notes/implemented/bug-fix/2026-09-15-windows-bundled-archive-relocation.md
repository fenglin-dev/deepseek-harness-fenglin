# Agent Note: Windows bundled archive relocation

Status: implemented

English | [中文](2026-09-15-windows-bundled-archive-relocation.zh.md)

## Problem

pnpm serializes Windows `file:` archive specifications with forward slashes. Candidate activation compared those strings with a native backslash prefix, so bundled plugin references could keep the temporary `plugin-transactions/<profile>/<id>/candidate` path after the candidate directory was deleted. Later plugin installations then failed while resolving an existing bundled dependency, even though the requested package had no fault.

## Decision

Archive relocation parses POSIX and Windows paths according to the path text instead of comparing a native separator prefix. It rewrites direct `.tgz` children in manifest values and pnpm metadata keys or values, while unrelated local, Git, registry, and nested paths remain literal.

Candidate preparation also recognizes archive references owned by an older validated transaction ID. It changes a stale reference to the durable `bundled-plugins` directory only when the matching retained archive is a regular file. The repair occurs inside the new candidate, so a failed retry leaves the active Profile unchanged; successful validation and activation publish the repaired metadata with the requested plugin.

A registry add that exits successfully without declaring and materializing the requested package still fails verification. Such a candidate is rolled back instead of being handed to Desktop for activation and restart.

## Alternatives considered

**Replace every `plugin-transactions` substring.** Rejected because user-owned local paths may contain the same text. Relocation accepts only a direct archive below the exact managed transaction layout and a valid transaction ID.

**Edit the active Profile before retrying pnpm.** Rejected because a failed repair or install would mutate the running Profile outside candidate rollback. Repairing the candidate retains the existing transaction guarantee.

**Reinstall every bundled plugin.** Rejected because the verified archives already exist in the durable home. Reinstalling adds unnecessary package-manager work and may require network access.

## Consequences

Windows candidate activation no longer leaves pnpm-normalized archive paths pointing at deleted transaction directories. Profiles created by affected builds repair themselves on the next managed plugin mutation when their retained archives are present. Missing or indirect archives still fail without guessing a replacement, and no third-party plugin source is modified.
