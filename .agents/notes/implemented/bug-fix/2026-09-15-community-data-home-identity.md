# Agent Note: Community data-home identity

Status: implemented

English | [中文](2026-09-15-community-data-home-identity.zh.md)

## Problem

The first-run chooser previously treated any directory containing recognizable DSH files as reusable community desktop data. Another desktop distribution can use the same generic files while carrying incompatible Profiles, plugins, or desktop state. Directly reusing official data also allowed desktop-specific mutations to affect the official environment.

## Decision

Official DeepSeek Harness data is import-only in the first-run chooser. Direct reuse remains available for community data only after the main process verifies either this distribution's `.open-deepseek-harness-desktop.json` identity file in the Harness home or a valid legacy `data-home-setup.json` record that points to that home. Homes created, copied, imported, or adopted by this application receive the identity file through an atomic write.

Source selection uses opaque native-picker records, and final confirmation revalidates both the declared source category and its identity. Generic DSH contents, malformed identities, foreign identity schemas, and invalid legacy setup records are rejected. Existing persisted setups that already reuse an official home remain readable for compatibility, but the chooser and renderer protocol cannot create new ones.

## Alternatives considered

**Recognize generic DSH files.** This preserves broad compatibility but cannot distinguish this application from another community desktop distribution.

**Copy every selected directory.** This avoids direct sharing but unnecessarily duplicates a verified community desktop home and removes the user's explicit reuse workflow.

## Consequences

Official imports cannot mutate the source directory. Community copies and direct reuse accept only data identified as belonging to this distribution or covered by its legacy setup record. A legacy community home without either proof must be opened once by a compatible version that records its identity or imported through a supported migration path; adding a marker by hand is not presented as a compatibility guarantee.
