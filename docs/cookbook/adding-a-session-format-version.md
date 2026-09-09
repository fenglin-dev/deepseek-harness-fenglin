# Cookbook: adding a Session log format version

English | [中文](adding-a-session-format-version.zh.md)

## Summary

Use this tutorial to introduce a structural Session log version without rewriting released data. The worked example adds V3 through one V2→V3 edge, then lets independently reviewed changes extend that unreleased edge. Start with a working contributor checkout and read the [package checklist](adding-a-package.md), [format library](../../packages/session/session-format/README.md), and [released-format decision](../../.agents/notes/implemented/architecture/2026-08-31-released-session-format-migrations.md).

## Table of Contents

- [1. Choose the version and release base](#choose-the-version)
- [2. Add an identity edge](#add-an-identity-edge)
- [3. Implement per-artifact stages and validation](#stages-and-validation)
- [4. Update current-version consumers](#current-version-consumers)
- [5. Create snapshot successors](#snapshot-successors)
- [6. Validate the integrated result](#validate)
- [Dev Note](#dev-note)

<a id="choose-the-version"></a>
## 1. Choose the version and release base

Bump the format for a structural change to headers, event envelopes, core event semantics, or surface reconstruction. Ordinary event additions do not require a bump; follow the [versioning rule](../../.agents/notes/implemented/architecture/2026-08-10-session-log-version-mechanism.md). Distinguish the Session format integer from package release versions, SQLite schema versions, projection-unit versions, and protocol-wrapper versions.

Use a shared `release/*` integration base, such as `release/session-log-v3`. The base change adds the V3 writer, codec, catalog wiring, identity migration, and verification. Create each independent child branch from that base and target its PR at the release branch, not another independent child's branch. Each child adds its own structural transformation, validators, consumers, and tests to the same `session-format-v2-to-v3` package. Do not introduce V4 or V5 just to represent review order. Merge reviewed children into the release branch through PRs, then validate the combined result before release. Honor release-branch force-push and deletion protections; do not force-sync it.

Released codecs and migration semantics remain frozen. Do not amend V0→V1 or V1→V2 to implement a new V3 feature. Before V3 ships, its single incoming edge can incorporate the coordinated changes; after release, a structural change needs the next adjacent edge.

Use disposable, isolated Harness homes for unreleased integration testing. An interim V3 file already has the current version, so a later edit to V2→V3 will not migrate that file again. Re-run from unchanged historical input in a fresh test home; never repair this by rewriting a committed generation or reusing a real user's home.

<a id="add-an-identity-edge"></a>
## 2. Add an identity edge

Follow the package checklist to create a library, not a mounted plugin. An identity body conversion is only an initial wiring scaffold; the integrated [V2-to-V3 specification](../../packages/session/session-format-v2-to-v3/README.md#v2-to-v3-specification) defines the actual transformations and preservation rules. Do not treat its structural conversion as an identity edge.

Declare `dsh.sessionFormatMigration` in the package manifest with `from: 2`, `to: 3`, an export path, and the exported migration, source codec, target codec, target-header validator, and target restorer. Reuse `releasedV2SessionFormatCodec` from the preceding edge and depend on that package; do not copy or redefine the released V2 codec. Export the V3 codec and validators from the new package. Add the new edge as a direct dependency of the catalog and add the workspace's TypeScript paths and project references.

Set `SESSION_FORMAT_VERSION` in [core Session types](../../packages/core/session/src/types.ts) to 3, then generate the catalog:

```sh
pnpm run gen-session-format-catalog
```

The [generator](../../scripts/gen-session-format-catalog.ts) requires exactly one adjacent package for every step from zero to the writer version, matching directory/package names, matching adjacent codec exports, and declared dependencies. It rejects gaps, duplicate or extra edges, unknown metadata members, and a catalog that does not share Session through peer plus development dependencies. Fix the declarations rather than hand-editing `generated.ts`. The catalog is build-static; plugin mounting must not determine historical readability.

<a id="stages-and-validation"></a>
## 3. Implement per-artifact stages and validation

Use the [Stage interfaces](../../packages/session/session-format/src/types.ts), not a whole-artifact array-to-array migrator. An immutable `SessionFormatMigration` declaration supplies `migrateHeader`, `validateTargetHeader`, and `createStage`. Every call to `createStage` creates independent state for one source artifact. Keep counters, pending events, and reference maps there; never share a mutable stage across Sessions.

Implement `transformEvent(event, context)`, `transformRun(run, context)`, and `finish(context)`. Emit synchronously through `context.emitEvent` or `context.emitRun`; a call can produce zero, one, or many outputs. Let a stage consume codec-owned compact runs directly, or iterate `run.expand()` without materializing an intermediate array. The caller owns scheduling, and the chain finishes upstream stages before downstream stages.

Treat the inherited cut as a logical event count, not a physical row count. Expose `headerInheritedEventCount` only when it is known before EOF; `finish` returns the exact target cut. A preceding cardinality-changing edge can make that count unavailable at construction. Derive it from validated seed markers when required, and test V0→V1→V2→V3 and V1→V2→V3 with seeded Sessions, not just direct V2 input. Never substitute zero for an unknown cut.

Define each edge's event admission and transformation rules explicitly; the [V2-to-V3 source audit](../../packages/session/session-format-v2-to-v3/README.md#source-audit) owns this edge's policy. The [alpha V0→V1 rule](../../.agents/notes/implemented/architecture/2026-08-31-alpha-historical-unknown-event-refusal.md) owns the preceding edge's policy. Do not generalize either to every edge. A change to structure or event positions requires classifying source events, payload members, and references, and explicitly deciding whether opaque data can remain valid. [Equal-version retention](../../.agents/notes/implemented/architecture/2026-08-30-retain-ignorable-external-session-events.md) alone does not prove a structural transformation safe. Validate target semantics and give each newly accepted case a rejecting counterexample; never widen older edges to hide an unsupported transformation.

Prove strict restoration through `sessionFormatCatalog.createRestore(header, { recovery: 'strict', validation: 'current' })`, feeding rows in order and calling `finish()`. This exercises physical decoding, the complete chain, and installed current Session validation. Production's recoverable/transformed policy is not a replacement for strict fixture and publication verification. Preserve documented historical validation exceptions rather than claiming stricter source validation than the edge actually performs.

<a id="current-version-consumers"></a>
## 4. Update current-version consumers

Trace each current-version consumer, including Session creation/restoration, JSONL filename selection and publication, the catalog's current encoder/restorer, projection-cache generation identity, replay and snapshot normalization, and TypeScript/Python SDK recordings. Use the writer constant where a value means current; keep literal historical versions in released codecs and historical fixtures. Update current documentation and generated references through their owners.

Do not bump unrelated versions automatically. A request wrapper's `sessionFormatVersion` identifies its embedded Session generation; its outer schema version has its own meaning. Projection-unit state versions likewise do not replace the cache's Session-generation identity.

Verify both read and write paths. Header-only listing must not read bodies or publish. Historical read open may return the migrated in-memory artifact without writing; write open must verify and publish only the final current successor before append. The source path, bytes, and inode stay unchanged. A newer or invalid selected generation must not cause fallback to a predecessor. The [preparation decision](../../.agents/notes/implemented/architecture/2026-09-05-read-only-session-migration-preparation.md) owns publication timing.

<a id="snapshot-successors"></a>
## 5. Create snapshot successors

Read [snapshot ownership](../../snapshots/AGENTS.md) and the [snapshot library](../../packages/test-support/session-snapshot/README.md). Select the owning scenario, not an adapter that only references it. For each role, keep the historical file and generate the current successor: `session.v3.jsonl` for the parent and `session.1.v3.jsonl`, `session.2.v3.jsonl`, and so on for children. Never rename `session.v2.jsonl` to V3 or change only its header.

For unchanged replay input, use keyless refresh on the owner, then replay without write-back. This concrete SDK example uses `text-turn`; select the actual affected owner for a feature:

```sh
pnpm run test:snapshot:refresh snapshots/sdk/sdk.snapshot.ts -t text-turn
pnpm run test:snapshot snapshots/sdk/sdk.snapshot.ts -t text-turn
```

Review the new generation, request sidecars, and protocol output together. Verify every predecessor remains byte-identical and that parent/child roles remain contiguous. Selection uses the numerically highest generation, so update shared references to the owner's selected parent. Do not use the packed-layout migrator as a version upgrader. If the model transcript must change, the scenario owner uses live recording under the [testing policy](../testing.md), with its required provider key.

Keep deliberate historical cases explicit through `snapshot.yml`'s `sessionFormat.version` and supported `coverage` names; record and refresh leave their Session fixtures untouched. Update the [corpus policy](../../scripts/session-snapshot-corpus-policy.ts) for the current generation while retaining focused direct-edge, multi-hop, packed-row, retry/failure, and shipped-profile coverage. Check the corpus and both SDK projections; do not mass-refresh unrelated scenarios merely to silence a validation failure.

<a id="validate"></a>
## 6. Validate the integrated result

Run from the repository root. These focused commands check catalog declarations, Stage composition, the new edge, and generation selection:

```sh
pnpm run verify-session-format-catalog
pnpm exec vitest run scripts/gen-session-format-catalog.spec.ts packages/session/session-format/tests packages/session/session-format-v2-to-v3/tests packages/session/session-format-catalog/tests
pnpm run test:snapshot scripts/session-snapshot-corpus.corpus.ts
```

Add the changed JSONL, replay, projection, and SDK tests selected by the actual diff, plus the built publication-Worker smoke when that path changes. Require successful strict migration, identity preservation for the skeleton, malformed and unknown-required-event refusal, deterministic repeated restores, independent concurrent stage state, seeded multi-hop cuts, unchanged predecessors, and no fallback. Report exact commands and failures, not an inferred full-suite result.

Update the [owning Agent Note](../../.agents/notes/implemented/architecture/2026-08-31-released-session-format-migrations.md) rather than adding a redundant decision record. Audit related active notes for supersession; retain independent rationale and leave archived notes frozen. Update bilingual prose together, re-record each changed pair with the repository tool, then run documentation checks:

```sh
pnpm run verify-translation-pairing --write docs/cookbook/adding-a-session-format-version.md
pnpm run test:docs
pnpm run doc-sync
pnpm run lint
git diff --check
```

<a id="dev-note"></a>
## Dev Note

None.
