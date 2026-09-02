---
description: "Community desktop brand occupants for the sidebar and conversation hero, active only in community-desktop builds."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-brand-community-desktop

English | [中文](README.zh.md)

## Summary

This package fills the sidebar and conversation Hero brand slots only when `DSH_CLIENT_BUILD_PROFILE` is `community-desktop`. It keeps the community desktop identity separate from official upstream artifacts, owns no user state, and leaves upstream base components unchanged.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Compose this package into the community desktop Web bundle and build with `DSH_CLIENT_BUILD_PROFILE=community-desktop`. Other profiles load no community brand occupants, so official builds can supply their own package through the same slots.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

The client entry registers the riding-whale mark and community product name through the sidebar and conversation Hero slots. Registration is profile-gated and lifecycle-bound, so HMR or disposal withdraws the complete occupant set without leaving a mixed brand.

No invariant companion is published because this package contributes only stateless brand slot renderers.

<a id="model-experience"></a>
## Model Experience

None, as Community desktop presentation occupants; registers nothing model-facing.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- The browser title is selected independently through `DSH_CLIENT_TITLE` at build time.
- Alternative deployments must provide a different slot occupant package rather than configure this package at runtime.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

Keep community assets and profile checks in this package; do not patch upstream sidebar or conversation components for branding.

</details>
