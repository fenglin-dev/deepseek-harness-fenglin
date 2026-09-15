# Agent Note: Community data-home identity

Status: implemented

English | [中文](2026-09-15-community-data-home-identity.zh.md)

## Problem

The first-run chooser previously treated any directory containing recognizable DSH files as reusable community desktop data. Another desktop distribution can use the same generic files while carrying incompatible Profiles, plugins, or desktop state. Directly reusing official data also allowed desktop-specific mutations to affect the official environment.

## Decision

Official DeepSeek Harness data is import-only in the first-run chooser. The main process accepts community data immediately when it verifies either this distribution's `.open-deepseek-harness-desktop.json` identity file in the Harness home or a valid legacy `data-home-setup.json` record that points to that home. Recognizable DSH data with neither record enters an explicit native confirmation that asks whether it came from an older Open DeepSeek Harness Desktop release. Confirmation issues a short-lived opaque source identity that the main process revalidates on final submission. Direct reuse then adopts the source through an atomic identity write; copying leaves the source unchanged and identifies the target.

Source selection uses opaque native-picker records, and final confirmation revalidates both the declared source category and its identity state. Malformed identities, foreign identity schemas, and invalid legacy setup records are authoritative failures that cannot enter the compatibility confirmation. Existing persisted setups that already reuse an official home remain readable for compatibility, but the chooser and renderer protocol cannot create new ones.

## Alternatives considered

**Silently recognize generic DSH files.** This preserves broad compatibility but cannot distinguish this application from another community desktop distribution or make the compatibility risk visible.

**Copy every selected directory.** This avoids direct sharing but unnecessarily duplicates a verified community desktop home and removes the user's explicit reuse workflow.

## Consequences

Official imports cannot mutate the source directory. A legacy community home without product evidence remains usable after the user explicitly confirms its origin, at the cost that the application cannot independently prove that assertion. Corrupt or foreign evidence still fails closed, and adding a marker by hand is not presented as a compatibility guarantee.
