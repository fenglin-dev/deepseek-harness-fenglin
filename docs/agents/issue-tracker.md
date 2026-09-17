# Issue tracker: Local Markdown

English | [中文](issue-tracker.zh.md)

Issues and specs for this repository live as local Markdown files under `.scratch/`. This directory is ignored by Git and must not be committed or published.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- Specification: `.scratch/<feature-slug>/spec.md`
- Tickets: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- Number tickets from `01` in dependency order.
- Record triage state with a `Status:` line.
- Append discussion under a `## Comments` heading.

## Remote tracker boundary

Local issue workflows must not read from or write to GitHub Issues or another remote tracker unless the maintainer explicitly requests access to a specific remote item.

A GitHub URL or issue number in background context is not authorization to access or modify it.

## Skill operations

- “Publish to the issue tracker” means create a file under `.scratch/<feature-slug>/`.
- “Fetch the relevant ticket” means read the referenced local Markdown file.
- `to-spec` writes `.scratch/<feature-slug>/spec.md`.
- `to-tickets` writes one file per approved ticket under `.scratch/<feature-slug>/issues/`.
- Never modify or remove an existing specification or ticket without explicit maintainer approval.

## Wayfinding operations

- Map: `.scratch/<effort>/map.md`
- Child ticket: `.scratch/<effort>/issues/<NN>-<slug>.md`
- Blocking relationship: `Blocked by: NN, NN`
- Claim: set `Status: claimed`
- Resolve: append an `## Answer`, set `Status: resolved`, and update the map
