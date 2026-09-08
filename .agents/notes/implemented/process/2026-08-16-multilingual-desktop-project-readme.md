# Agent Note: Multilingual desktop project README

Status: implemented

English | [中文](2026-08-16-multilingual-desktop-project-readme.zh.md)

## Problem

The downstream repository extends DeepSeek Harness with a desktop host and product-facing configuration, session, theme, plugin, Skill, and source-update surfaces. The upstream-oriented root README neither identifies this distribution nor gives international users a stable overview of its implemented capabilities, platform limits, security model, or relationship to optional providers.

## Decision

The root README presents Open DeepSeek Harness Desktop as an independent, community-maintained MIT distribution and identifies the official upstream without implying endorsement. English and Simplified Chinese remain the complete authoritative pair. Thirteen additional localized README entry points provide a translated project overview, source-run instructions, accurate platform status, documentation routes, optional FLAQ.AI context, and a link back to the complete pair.

Every language entry uses the same fifteen-language switcher. The complete README distinguishes implemented desktop behavior from release direction, links detailed behavior to its owning documentation, and keeps platform claims narrow: macOS source execution is exercised, while Windows and Linux installers require packaging and native validation. Provider descriptions state that compatible services are optional, require current compatibility and policy review, and do not imply DeepSeek endorsement.

The root README remains product-first, with a concise inventory and one authoritative home per detail, following the current [documentation standard](../../../../docs/AGENTS.md).

## Alternatives considered

**Translate the complete long README into every language.** Full parity provides more local detail, but multiplies the maintenance surface for fast-changing preview behavior. Concise localized entry points make the project discoverable while English and Simplified Chinese keep one complete reviewed pair.

**Keep only English and Simplified Chinese.** This minimizes maintenance but does not provide a usable first page for the communities named by the project language selector.

**Copy the reference guide's prose and media.** Reuse would blur project ownership and create licensing and freshness obligations. This repository uses the reference only for navigation ideas and writes its own factual copy from local implementation and owning documentation.

## Consequences

Readers can identify the downstream desktop project, its current support boundary, and its extension direction before installing it. Changes to capabilities, launch commands, platform support, security, or provider relationships update the complete English and Simplified Chinese pair first; localized entry points update when their summarized facts change. Additional languages do not weaken the repository's required bilingual pairing gate.
