---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-09-17-external-tools-resolved

English | [中文](2026-09-17-external-tools-resolved.zh.md)

## Summary

Adds an ignorable, log-only event that records the Codex and Claude Code tools actually projected into each model request. A bounded Host projection retains only the latest record for duplicate suppression and reconstruction; the event does not enter model history or client-visible conversation content.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

```yaml persistence-change
schemaVersion: 1
id: 2026-09-17-external-tools-resolved
baseline: false
changes:
  - root: "event:external-tools/resolved"
    previous: null
    after: "68bec9ab0213191ac3b19deb41231bd973fb444a25e2085f922fe4277f9a20e5"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibility

The event is additive and marked ignorable. Readers that do not recognize it may skip it under the released Session admission rules, while current readers validate the fixed tool identifiers and numeric turn and step coordinates. Existing sessions contain no such event and continue to reconstruct with a null projection. No existing event envelope, field, or value type changes, so the Session format version remains unchanged and no migration is required.

<a id="verification"></a>
## Verification

Focused Agent Presets, Session projection, and Session format migration tests passed. The V2-to-V3 admission test verifies that the ignorable event is preserved without treating turn and step as sequence references, rejects unknown tool identifiers and malformed payloads, and restores the released V3 artifact. The persistence preview classified this as one additive event root and required no version bump.

<a id="dev-note"></a>
## Dev Note

None.
