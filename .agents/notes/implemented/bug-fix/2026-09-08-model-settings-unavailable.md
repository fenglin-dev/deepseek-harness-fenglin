# Agent Note: Unavailable provider settings

Status: implemented

English | [中文](2026-09-08-model-settings-unavailable.zh.md)

## Problem

A provider directory can register before its settings section rejects a stored model without an explicit protocol. The Models page then has selectable directory entries but no schema for their editors. A clickable Add action renders nothing, which resembles lost imported credentials.

## Decision

The Models page derives unavailable sections from its existing directory and settings snapshots. It names these sections in an accessible warning, offers a read-only Retry, and excludes unavailable providers from Add. Healthy provider editors remain usable. Recovery guidance requires a settings backup, correction, and Harness restart; the page neither guesses a protocol nor removes credentials.

## Alternatives considered

Automatically assigning a protocol can route requests incorrectly. Rejecting the whole page also hides independent healthy providers. The warning preserves strict Host validation without introducing a second configuration store.

## Consequences

Component tests cover missing sections, disabled additions, healthy provider access, read-only retry, and editor recovery after the settings mirror refreshes. The warning identifies the section, not the Host exception; detailed causes remain in startup diagnostics. This change does not make invalid provider configurations loadable or verify remote model availability.
