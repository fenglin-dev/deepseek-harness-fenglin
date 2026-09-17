# Agent Note: Centralize Desktop data-home authority

Status: implemented

English | [中文](2026-09-17-desktop-data-home-authority.zh.md)

## Problem

Desktop data-home rules were split between pure filesystem functions and Electron host orchestration. First-run setup, the Settings chooser, and startup recovery each had to understand directory classification, opaque selection identifiers, expiry, renderer ownership, final revalidation, source and target overlap, copy versus reuse preparation, setup publication, and restart ordering. Several tests therefore inspected `main.ts` source strings instead of exercising the behavior through one interface.

## Decision

`DesktopDataHomeAuthority` owns every Desktop-initiated data-home lifecycle. It discovers official and community sources, creates bounded chooser sessions, issues and consumes opaque selections, revalidates paths at submission, prepares fresh, imported, copied, or reused homes, atomically publishes the setup record, and decides whether a complete restart is required. The Electron host remains a presentation adapter: it owns sandboxed windows, native dialogs, sender identity checks, localized confirmation, and focus behavior, then delegates each business decision to the authority.

Chooser selections are short-lived capabilities rather than paths supplied directly by a renderer. Settings and recovery selections are bound to one renderer id and expected selection kind. A chooser session separately binds custom targets and explicitly confirmed legacy community sources, then repeats filesystem classification immediately before accepting the final choice. Publication stops active Profile-owned persistent services before writing the setup record and schedules restart only after the write succeeds.

The existing filesystem functions remain internal implementation collaborators because they provide focused path, copy, identity, and setup primitives. Their on-disk schemas and allowlists are unchanged. Startup initialization, runtime chooser changes, Settings switches, and recovery switches now share the same authority instead of reproducing the protocol in `main.ts`.

## Alternatives considered

**Move only the opaque-token maps.** Rejected because callers would still compose final revalidation, overlap, preparation, publication, and restart ordering.

**Move the Electron windows and dialogs into the authority.** Rejected because native presentation and sender identity are Electron adapter concerns; importing them would make the business interface harder to exercise without adding depth.

**Accept renderer-provided paths at switch time.** Rejected because it would weaken the existing bounded-selection and final-revalidation guarantees.

## Consequences

The Electron entry point no longer imports low-level data-home mutation rules or stores selection capabilities. Interface tests cover target changes after selection, explicit legacy-community confirmation, fresh initialization, renderer-bound switching, setup publication, and restart ordering. UI tests retain only adapter assertions and no longer duplicate the authority's implementation as source-string expectations. Existing data, setup records, source categories, and user-visible chooser behavior remain compatible.
