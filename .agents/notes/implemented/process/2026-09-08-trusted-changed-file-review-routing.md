# Agent Note: Route reviews from trusted changed-file policy

Status: implemented

## Problem

GitHub's native CODEOWNERS behavior requests reviewers whenever a matching path changes. It cannot apply this repository's distinction between reviewable implementation or documentation files and test-only evidence. A native CODEOWNERS file also makes GitHub, rather than an inspected repository program, responsible for the request decision.

Review routing needs an observable changed-file input, explicit owner rules, complete test exclusions, and a write-capable workflow that remains safe for pull requests from forks.

## Decision

The repository keeps a CODEOWNERS-compatible map at [`.github/review-ownership/CODEOWNERS`](../../../../.github/review-ownership/CODEOWNERS), outside GitHub's native CODEOWNERS locations. The map accepts only explicit absolute directory patterns with one or two individual GitHub users. It rejects wildcards, hidden-directory patterns, teams, more than two owners, duplicate patterns, and duplicate owners. Later matching patterns replace earlier matches.

The policy test counts non-test tracked lines in directories that match an ownership rule. It rejects a map in which `@turtle1999` owns more than one third of that eligible owned codebase.

The [`request-review` workflow](../../../../.github/workflows/request-review.yml) runs on `pull_request_target` events for opened, synchronized, reopened, ready-for-review, and converted-to-draft pull requests. Its write-capable job checks out the default branch and executes only the default branch's scanner and ownership map. It does not check out pull-request code or read repository secrets.

The scanner fetches every changed-file record before deciding. It fails if the pull request reports more than GitHub's 3,000-file API limit or if pagination returns an incomplete list. It normalizes repository paths, evaluates old and new paths of a rename independently, and escapes filenames before logging them.

The scanner excludes test-only paths before owner matching. Excluded paths comprise directories named `test`, `tests`, `__tests__`, `__snapshots__`, `benches`, or `stress-tests`; the top-level `benchmarks` and `snapshots` trees; `packages/test-support`; `scripts/fixtures` and `scripts/snapshots`; filenames ending in `.bench.<ext>`, `.corpus.<ext>`, `.e2e.<ext>`, `.perf.<ext>`, `.snapshot.<ext>`, `.spec.<ext>`, `.stress.<ext>`, or `.test.<ext>`; and Python `test_*.py`, `*_test.py`, or `*_tests.py` files. Test infrastructure such as `vitest*.config.ts` and gate implementations remains reviewable because it changes how repository evidence is produced. The [comment-only routing decision](2026-09-08-comment-only-review-routing.md) owns the additional documentation and comment exclusions.

The workflow prints the changed code paths, each exclusion class, per-file owner matches and changed LOC, aggregate owner relevance, approved owners omitted from new requests, current individual requests, the available counted slot after planned cancellations, and final reviewer actions before any review-request mutation. For a non-draft pull request, it fetches the complete chronological review list and reduces each owner's undismissed `APPROVED` and `CHANGES_REQUESTED` reviews to the latest decisive state; `COMMENTED` and `PENDING` reviews leave that state unchanged. It removes the pull-request author, owners with an active approval, and users who remain requested from the matched individual owners. An active approval remains sufficient after later synchronize events, while a later changes-requested review makes the owner eligible again. The review-list operation fails before mutation at 3,000 entries or on an invalid record.

The workflow keeps at most one current individual review request other than `@turtle1999`. An existing request for `@turtle1999` does not consume that slot, but each workflow run adds at most one reviewer. An existing non-turtle request leaves no slot, so the workflow does not add anyone, including `@turtle1999`. Existing individual requests consume the slot even when they do not match the ownership map. An owner's relevance is the sum of GitHub-reported additions and deletions for each reviewable changed-file record whose current or previous path matches that owner. Each record contributes once per owner, including when both paths of a rename match the same owner. Higher changed LOC selects candidates first when the available slot cannot cover the remaining owners; login order resolves equal scores.

When current review requests exist, the workflow reads the complete review-request timeline before mutation. A current reviewer is workflow-authored only when its latest matching `review_requested` event identifies `github-actions[bot]` as `review_requester`; a request without an attributable event is preserved. A non-draft run cancels workflow-authored reviewers that no longer match the current candidates and excess workflow-authored non-turtle reviewers above the counted limit; current relevance order selects which matching workflow reviewer remains. Planned cancellations release capacity before the workflow selects a new reviewer. A draft run cancels every current workflow-authored request. Requests made by people remain unchanged. An attributable event with invalid provenance and timelines above 3,000 events fail before mutation.

## Verification

[Scanner tests](../../../../.github/review-ownership/request-review.test.mjs) cover admitted ownership syntax, rejected syntax, each exclusion class, production-name negative controls, renames, last-match behavior, unmatched files, changed-LOC aggregation and ranking, complete pagination, file and review limits, approval-state reduction, approved-owner suppression and next-owner selection, log-before-mutation ordering, author and existing-reviewer filtering, non-draft reconciliation, draft cancellation provenance, and API failures. [Workflow tests](../../../../scripts/ci-workflow.spec.ts) pin the event set, least permissions, trusted default-branch checkout, absence of pull-request-head references and secrets, and executed command. The gate graph includes both suites in static CI and `check-all`.

## Alternatives considered

**Use native CODEOWNERS.** Native routing cannot ignore test-only changes and offers no repository-owned decision log before requesting reviewers.

**Run under `pull_request` and check out the pull-request head.** A fork workflow does not receive a write-capable token, while granting a write token to code from an untrusted head is unsafe.

**Execute the pull request's scanner or owner map under `pull_request_target`.** This lets an untrusted pull request choose its own write-capable behavior or owners.

**Select capped candidates by login order.** Login order is stable but ignores how much reviewable code changed under each owner's directories. Changed LOC makes the limited requests follow the pull request's strongest ownership relevance while retaining login order for ties.

**Cancel every reviewer that no longer matches.** A person may request a reviewer for reasons outside the ownership map. Only requests attributed to the workflow identity are safe for automated reconciliation.

**Treat an empty current request as an owner who still needs review.** GitHub removes the pending request when the reviewer submits a review. Requesting an owner with an active approval again adds no ownership coverage and creates repeated notifications after later synchronize events.

**Infer arbitrary semantic source changes from patches or language parsers.** GitHub can omit or truncate patches, and the repository spans many languages. The scanner does not try to prove that two programs behave identically. The later [comment-only routing decision](2026-09-08-comment-only-review-routing.md) adds a narrow lexical comparison only when changed-line counts prove that GitHub supplied the complete patch.

## Consequences

Reviewer mutations are reproducible from a trusted policy, the file classifications printed in the workflow log, and review-request provenance in the pull-request timeline. Excluded changes do not request owners, rule and changed-file updates remove obsolete workflow-authored requests on the next run, and draft pull requests do not retain workflow-authored requests. Ownership changes become effective only after merge, so the pull request that changes policy cannot apply its untrusted policy to itself.

The workflow requests at most one reviewer per run, does not repeat a request while that owner has an active approval, keeps no more than one current individual reviewer other than `@turtle1999`, and prefers owners whose matched reviewable files carry more changed LOC. An existing `@turtle1999` request leaves the counted slot available; an existing non-turtle request prevents every additional request. Shared ownership gives each owner the same file-level relevance without counting one renamed file twice for the same owner. GitHub-generated review-request events may not start other workflows that depend on recursively triggered events from `GITHUB_TOKEN`; those workflows must not rely on this request as their only trigger.

Any change that does not match an explicit exclusion remains eligible under an owned directory. Unmatched paths are logged and request nobody. Pull requests above the file, review, or timeline API limit fail without applying a partial reviewer mutation.
