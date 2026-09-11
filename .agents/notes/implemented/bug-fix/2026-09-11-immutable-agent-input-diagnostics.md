# Agent Note: Immutable agent input diagnostics

Status: implemented

English | [中文](2026-09-11-immutable-agent-input-diagnostics.zh.md)

## Problem

An external plugin can install and activate successfully yet fail every conversation by mutating the deeply frozen messages published through `agent/pre-step`. Dependency and Loader checks cannot observe this contract violation, while the resulting read-only-property error appears only after a user starts a turn.

## Decision

Profile inspection performs a bounded lexical scan of directly enabled external Bundle roots without executing their code or following dependency and source symlinks. A shipped JavaScript file that both subscribes to `agent/pre-step` and directly assigns `text`, `content`, or `messages` produces the advisory `profile.immutable-agent-input-mutation` diagnostic attributed to that Bundle. The classifier maps the corresponding read-only-property TypeError to the same code when runtime evidence is available.

Static evidence never authorizes automatic quarantine because source text does not prove the receiver identity. Diagnostics recommends updating, disabling, or uninstalling the attributed plugin. The offline Diagnostics Lab fixture reproduces the unsafe listener and remains unavailable to startup seeding and online update selection.

## Alternatives considered

**Identify one reported package by name.** A package allowlist would miss the same contract violation in forks or later plugins and would retain stale product policy after an upstream fix.

**Automatically quarantine every lexical match.** Minified or bundled files can place an unrelated field assignment beside an event registration, so source evidence alone cannot safely remove an installed plugin.

**Stop freezing agent input.** Mutable shared messages would let one listener silently alter another listener's view and the model request, weakening the event contract for every plugin.

## Consequences

Doctor and the live plugin inventory can warn before the first affected conversation and name the direct external Bundle without running it. The check is intentionally bounded and may miss dynamically constructed registrations or mutations hidden behind helper calls; an actual matching TypeError remains classifiable. Focused tests pin attribution, false-positive boundaries, read-only error classification, packaged fixture integrity, and restoration of the active Profile after an exercise.
