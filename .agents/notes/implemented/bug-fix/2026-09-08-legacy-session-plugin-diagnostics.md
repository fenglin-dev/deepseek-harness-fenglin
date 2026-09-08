# Agent Note: Legacy Session plugin diagnostics

Status: implemented

English | [中文](2026-09-08-legacy-session-plugin-diagnostics.zh.md)

## Problem

A plugin can activate successfully but fail in an Agent callback when it consumes an incompatible Session API. Successful package installation and Loader activation do not certify conversation usability.

## Decision

Doctor and plugin inventory share a read-only advisory inspector for enabled external bundles declaring the Session peer dependency. A bounded scan identifies iteration of `session.events`, reports package-relative evidence, and never executes plugin code. The classifier also recognizes the corresponding runtime TypeError. The diagnostic UI explains compatible updates and manual removal without asserting automatic isolation. Diagnostics Lab ships an inert, diagnostic-only bundle with the reproduced source pattern and tests the advisory in either an isolated home or the explicitly confirmed current Profile; Restore all removes the retained exercise.

## Alternatives considered

A package-name blacklist would outlive repaired releases and miss other plugins. Automatically quarantining lexical matches would misidentify comments, guarded compatibility paths, or unrelated receiver types. Invoking arbitrary plugin callbacks during startup would introduce side effects and latency.

## Consequences

The advisory cannot prove runtime compatibility and does not change a healthy Doctor exit status. It neither mutates Profile files nor starts repair or installation. The scan skips nested source symlinks, dependency/vendor/test directories and oversized files; limits bound per-package and aggregate source reads. Minified aliases and other API mismatches can be missed. Controlled callback reproduction and isolated installed-package inspection are evidence, not full Windows UI validation.
