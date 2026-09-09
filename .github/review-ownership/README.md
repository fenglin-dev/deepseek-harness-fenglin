# Automated review requests

## Summary

The [`request-review` workflow](../workflows/request-review.yml) reads the CODEOWNERS-compatible [ownership map](CODEOWNERS) from the trusted default branch. It classifies changed files, requests missing owners for reviewable code, and cancels its outstanding requests when a pull request becomes a draft. The ownership map is outside GitHub's native CODEOWNERS locations, so GitHub does not apply it directly.

## Table of Contents

- [Routing](#routing)
- [Review exclusions](#review-exclusions)
- [Security](#security)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="routing"></a>

## Routing

Pull requests run the workflow when opened, synchronized, reopened, marked ready for review, or converted to a draft. The scanner fetches the complete pull-request file list, evaluates both paths of a rename, and fails instead of routing from a partial list. GitHub exposes at most 3,000 files for this API.

For a non-draft pull request, the workflow keeps at most one current individual review request other than `@turtle1999`; an existing request for `@turtle1999` does not consume that slot. Each run adds at most one reviewer. An existing non-turtle request leaves no slot, so the workflow does not add anyone, including `@turtle1999`. Existing individual requests consume the slot even when made by people outside the ownership map. When more candidates remain than the available counted slot can cover, the workflow ranks them by the total GitHub-reported additions plus deletions in reviewable changed-file records that match each owner. A rename contributes its changed LOC once to an owner even when both paths match that owner. Higher changed LOC ranks first, and login order resolves ties.

Before selecting a new reviewer, a non-draft run fetches the pull request's complete chronological review list. An owner's latest undismissed decisive review is `APPROVED` or `CHANGES_REQUESTED`; comments and pending reviews do not replace that decision. An approved owner remains omitted after later synchronize events, while a later changes-requested review makes the owner eligible again. The workflow fails before mutation when the list reaches the supported 3,000-review limit or contains an invalid record.

On every run with current review requests, the workflow reads the pull-request timeline. A current reviewer is workflow-authored only when the latest matching `review_requested` event names `github-actions[bot]` as `review_requester`; a request without an attributable event is preserved. On a non-draft pull request, the workflow cancels workflow-authored reviewers that no longer match the current candidates and excess workflow-authored non-turtle reviewers above the counted limit. Current relevance order decides which matching workflow reviewer remains when the limit shrinks. It then fills any slot left by the planned cancellations. On a draft, it cancels every current workflow-authored request. Requests made by people remain unchanged in both states. An attributable event with invalid provenance fails before mutation, and the workflow also fails without cancellation when the timeline exceeds 3,000 events.

The ownership map accepts explicit absolute directory patterns and one or two individual GitHub users per pattern. It rejects wildcards, hidden-directory patterns, teams, more than two owners, and duplicate patterns or owners. Matching follows CODEOWNERS last-match semantics. The scanner prints the changed code, excluded test, documentation, and comment-only files; per-file owner matches and LOC; the aggregate owner relevance ranking; approved owners omitted from new requests; current individual requests and the available counted slot after planned cancellations; and the reviewers it will request or cancel before it mutates review requests. Unmatched files remain visible in the log. The pull-request author, approved owners, and users who remain requested are omitted from new requests.

The policy test measures non-test tracked lines under matched directories and requires `@turtle1999` to own no more than one third of that eligible owned codebase.

<a id="review-exclusions"></a>

## Review exclusions

Review routing excludes the repository's unit, end-to-end, expected-output, snapshot, benchmark, performance, stress, corpus, native, and Python test conventions. This includes `test`, `tests`, `__tests__`, `__snapshots__`, `benches`, and `stress-tests` directories; the top-level `benchmarks` and `snapshots` trees; `packages/test-support`; `scripts/fixtures` and `scripts/snapshots`; recognized test filename suffixes; and Python `test_*.py` or `*_test.py` files.

Test infrastructure that can alter how evidence is produced remains reviewable, including `vitest*.config.ts` and gate implementations under `scripts`. A production file named `test.ts`, `spec.ts`, or `snapshot.ts` is not excluded solely by that name.

Files ending in `.md` or `.yaml`, with case-insensitive extension matching, are documentation and never contribute owners. A `.yml` file remains reviewable unless another exclusion applies.

For a modified file with a supported source extension, the scanner compares the pre-change and post-change text after removing parsed comments. It excludes the file only when GitHub supplies a patch whose counted additions and deletions prove that the patch is complete and the remaining code is identical. The parser recognizes C-style line and block comments, hash comments, SQL comments, CSS block comments, and HTML comments for their declared extensions. Renames, unsupported languages, missing or partial patches, and uncertain comment forms remain reviewable.

<a id="security"></a>

## Security

The write-capable `pull_request_target` job checks out only the repository default branch. It does not check out or execute pull-request code and does not use repository secrets. Pull-request filenames are treated as API data and escaped in logs.

Ownership changes take effect only after they merge into the default branch. This prevents an untrusted pull request from changing the routing program or its owner assignments for its own run.

<a id="verification"></a>

## Verification

Run `pnpm run test:request-review` for ownership parsing, file classification, complete-patch checks, comment parsing, changed-LOC ranking, pagination, approval-state reduction, logging order, non-draft reconciliation, draft cancellation, reviewer provenance, reviewer filtering, and API behavior. [Workflow tests](../../scripts/ci-workflow.spec.ts) pin the trusted checkout, permissions, events, and command. The repository gate graph runs both checks in CI.

<a id="dev-note"></a>

## Dev Note

The [review-routing decision](../../.agents/notes/implemented/process/2026-09-08-trusted-changed-file-review-routing.md) records the security model, test exclusions, and alternatives.
