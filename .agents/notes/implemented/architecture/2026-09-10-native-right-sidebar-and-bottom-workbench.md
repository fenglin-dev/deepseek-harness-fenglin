# Agent Note: Native right sidebar with a separate bottom workbench

Status: implemented

English | [中文](2026-09-10-native-right-sidebar-and-bottom-workbench.zh.md)

## Problem

The upstream client and Better Sidebar historically supplied overlapping right-side surfaces. Keeping both implementations would create duplicate tabs, competing layout state, and fragile full-viewport CSS. Removing Better Sidebar entirely would also remove its useful bottom terminal and workbench.

## Decision

The upstream `@deepseek-ai/dsh-client-ui-sidebar-right` package is the only owner of the right sidebar. The layout exposes upstream global main panels, and the Conversation surface is registered as `main.conversation` so panel navigation and right-sidebar visibility share the upstream state model.

Bundled Better Sidebar 0.19.0 uses the official right-sidebar service for compatible right-side contributions and owns only its separate bottom workbench. The desktop client does not scan or rewrite plugin DOM, add plugin-specific title-bar CSS, or mount a second right-sidebar container.

Community extensions remain orthogonal to this ownership boundary: Session actions, plugin discovery, settings-navigation actions, and desktop commands continue to register through their existing slots and services.

## Alternatives considered

**Keep both complete sidebars.** This preserves every historical implementation but produces two owners for the same region and leaves responsive behavior dependent on plugin load order.

**Remove Better Sidebar.** The official sidebar covers the right-side experience more cleanly, but this would discard the bottom terminal and workbench that still provide distinct value.

**Patch Better Sidebar with desktop-specific CSS.** This would only hide individual collisions and would need to be repeated for other full-viewport plugins instead of establishing one layout owner.

## Consequences

The application presents one official right sidebar and one Better Sidebar bottom workbench. Better Sidebar must target a version compatible with the upstream sidebar API; its bundled archive remains version-pinned and integrity-checked. Other plugins can extend the official sidebar without learning desktop title-bar geometry, while bottom-panel behavior remains isolated from right-sidebar selection and navigation.
