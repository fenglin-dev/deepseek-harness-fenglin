# Agent Note: Selected-text actions remain draft-only

Status: implemented

English | [中文](2026-08-26-selected-text-actions.zh.md)

## Problem

Read-only conversation and tool output often needs to be copied or carried into another prompt. Existing message-level copy controls do not cover fragments, while using the native selection and then finding a composer loses context and adds repeated navigation.

## Decision

The Web bundle includes one browser-only selection-actions plugin. The layout marks the conversation and details columns as eligible regions; the plugin rejects interactive descendants and every range crossing a region boundary. A primary-pointer selection opens a horizontal toolbar at the range, while context-click opens a vertical rounded menu at the pointer. The two presentations share one captured selection and one action implementation.

Copy writes the exact selected text. Ask connects the current Workspace's blank New Session, fills a localized Markdown-quoted draft, and opens it without sending. Add appends a Markdown quote to the current draft. The add action is absent instead of disabled while the composer cannot accept edits, especially during a pending DSH approval or answer interaction. Every action rechecks its runtime preconditions before writing.

When the trusted Electron preload exposes its narrow restart method, the context menu adds a separated Quick restart row at the bottom. It calls the same guarded desktop lifecycle as Settings and the native menus, so an active plugin mutation can still refuse the restart. The primary-selection toolbar and ordinary browser mode omit this desktop-only action.

## Alternatives considered

**Use only the browser-native context menu:** rejected because Web cannot add application actions to that menu consistently, and it provides no primary-selection toolbar.

**Register the actions inside each message and tool renderer:** rejected because fragment selection spans nested rendered nodes and would duplicate event handling, positioning, and dismissal behavior across independently loaded views.

**Show Add as disabled during pending interactions:** rejected because the unavailable action adds noise precisely while the human must answer the blocking DSH interaction; hiding it leaves only operations that can complete.

## Consequences

- Electron and `dsh web` share selection and draft behavior; Electron alone projects Quick restart from its trusted preload.
- Settings, navigation, editors, inputs, and third-party menus retain native selection and context-menu behavior.
- No model request occurs until the human reviews and submits the resulting draft.
- The first version does not provide touch long-press actions or a third-party action registry.
