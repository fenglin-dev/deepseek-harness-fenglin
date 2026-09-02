---
description: "Contextual copy and conversation-draft actions for selected read-only conversation text."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-selection-actions

English | [中文](README.zh.md)

## Summary

This package adds desktop-oriented Copy, Ask in new conversation, and Add to current conversation actions for text selected inside explicit conversation scopes. It captures immutable text before the popup takes focus and never sends a draft automatically.

## Table of Contents

- [Use the selection actions](#use-the-selection-actions)
- [Understand the safety boundary](#understand-the-safety-boundary)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-the-selection-actions"></a>
## Use the selection actions

A primary-button selection opens a compact toolbar, while right-clicking an eligible selection opens a rounded menu. New-conversation and current-conversation actions write localized Markdown-quoted drafts without submitting them.

-----

<a id="understand-the-safety-boundary"></a>
## Understand the safety boundary

Only ranges wholly contained by `data-selection-actions-scope` are accepted. Inputs, editors, controls, dialogs, menus, settings portals, and the sidebar remain outside the feature. Actions disappear when the target composer or session cannot safely accept a draft.

No invariant companion is published because the browser selection scope and immutable snapshot checks are enforced directly by the feature.

<a id="model-experience"></a>
## Model Experience

None, as Browser-side draft controls; no selected text reaches model context until the human submits the resulting draft.

#### KV Cache effect

None; the package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Touch long-press selection is not handled; the first version targets mouse and trackpad interaction.
- The action list is fixed until a concrete extension consumer and permission model exist.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

Preserve the immutable selection snapshot and explicit scope boundary; do not let popup focus or navigation change the text an action consumes.

</details>
