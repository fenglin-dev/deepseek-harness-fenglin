# Domain docs

English | [中文](domain.zh.md)

This repository uses a multi-context domain-documentation layout.

## Before exploring

Read the following sources relevant to the work:

- Root `CONTEXT-MAP.md`, when present, followed by each relevant context's `CONTEXT.md`.
- [`../architecture.md`](../architecture.md) for system composition and extension points.
- [`../glossary.md`](../glossary.md) for repository terminology.
- Relevant active Agent Notes under [`.agents/notes/`](../../.agents/notes/README.md).

Treat `implemented/` Agent Notes as current decisions, `proposed/` notes as pending proposals, and `rejected/` notes as rejected alternatives. Archived notes are frozen history and are not current authority.

If a context file does not exist, proceed silently. The domain-modeling workflows create maps and context files lazily when terminology or decisions are resolved.

## Layout

```text
/
├── CONTEXT-MAP.md
├── apps/
│   └── <app>/CONTEXT.md
├── packages/
│   └── <group>/CONTEXT.md
├── native/CONTEXT.md
├── python/CONTEXT.md
└── website/CONTEXT.md
```

`CONTEXT-MAP.md` lists only contexts that actually exist. Do not create one context per package by default; group packages that share one domain vocabulary and ownership model.

System-wide decisions remain Agent Notes. Context files define terminology and point to relevant Agent Notes instead of duplicating their rationale.

## Use established vocabulary

Use terms from the relevant `CONTEXT.md` and [`../glossary.md`](../glossary.md) in issue titles, proposals, hypotheses, and tests. If a required concept is missing, reconsider the term or record the gap for domain modeling.

## Flag conflicts

If proposed work contradicts an implemented Agent Note, surface the conflict explicitly and link the note instead of silently overriding it.
