# Agent Note: Versioned custom instructions

Status: implemented

English | [中文](2026-09-20-versioned-custom-instructions.zh.md)

## Problem

Users needed additional prompt guidance that could apply to every conversation or only one Desktop Workspace. Reusing Agent presets would conflate execution capability with user style, while writing instruction files into repositories would mutate user projects and expose local preferences to source control. A plain mutable settings string would also make it impossible to prove which instruction text an earlier model request received or to export diagnostics without an explicit privacy decision.

## Decision

The `custom-instructions` settings namespace owns one immutable revision history for the global scope, one per registered Workspace id, and the Session diagnostic-export preference. First-party Settings and Workspace controls are the only editor surfaces; no Agent or plugin management API is published. Every non-empty save appends a revision, an empty save disables that scope, and deletion of a Workspace discards only its editor history after the authoritative Workspace deletion succeeds.

At `agent/created`, the Host registers settings-backed runtime-context contributors. The global contributor follows Workspace file instructions and the matching Workspace contributor follows global. Workspace identity requires the Session `cwd` to equal a registered Workspace path; sessions without a match receive only global instructions. Contributors read the active revision during request assembly, so edits affect the next admitted model request without rewriting prior events. Runtime-context snapshot ownership records the exact scope, revision id, and text used by each request, preserving resume and Session-detail reconstruction for main sessions, subagents, teams, IM surfaces, and automations that use the same Agent path.

Session diagnostics exclude custom-prompt plaintext unless the user explicitly or previously chose inclusion. The confirmation can remember either inclusion or exclusion exactly as selected. Remembered inclusion carries a warning, and Settings can reset the preference to ask again. Host-side export redaction replaces custom-instruction snapshot sections with a marker retaining revision ids; it never mutates persistence. Ordinary community Desktop settings copy, backup, restore, and migration carry both revisions and the preference.

## Alternatives considered

**Write a project instruction file.** Rejected because an app preference must not mutate repositories or leak through version control.

**Put custom text into Agent presets.** Rejected because presets describe Agent composition and capability, while custom instructions are independently scoped user guidance.

**Store only the latest text.** Rejected because prior Session behavior would become unattributable and diagnostics could not identify the actual revision used.

**Expose a generic prompt-management service to plugins.** Rejected because this is a human preference surface; widening write authority would let unrelated plugins silently alter every future request.

**Always include prompt plaintext in diagnostic exports.** Rejected because diagnostic archives are commonly shared for support and the text can contain private project context.

## Consequences

Prompt precedence is explicit: platform and safety instructions, Agent preset, Workspace file instructions, global custom instruction, then Workspace custom instruction. User custom text cannot override system, safety, or developer authority. Each scope accepts at most 32,000 characters per revision. Historical Session snapshots intentionally retain model-visible text even after a Workspace or editor history is deleted. Exact-path Workspace attribution means sessions opened in an unregistered nested directory receive only the global scope until a broader Workspace mapping policy is deliberately designed.
