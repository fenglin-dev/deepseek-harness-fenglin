# Agent Note: Exclude documentation and comment-only changes from review routing

Status: implemented

English | [中文](2026-09-08-comment-only-review-routing.zh.md)

## Problem

Directory ownership alone treats documentation and comment edits like executable changes. These edits do not require the automatic code-owner request that protects behavior changes.

GitHub may omit or truncate a file patch. A scanner that assumes every patch is complete can miss executable changes that occur outside the supplied hunks.

## Decision

Review routing classifies every old and new path in this order: test, documentation, comment-only, then reviewable code. Test classification wins when a test path also has a documentation extension. Every filename ending in `.md` or `.yaml`, matched without case sensitivity, is documentation. A `.yml` file is not documentation under this rule.

Comment-only classification applies only to files with `status: modified` and a declared source-comment syntax. The scanner reconstructs the before and after text for each patch hunk, removes comments outside quoted strings, removes empty lines left by comments, and requires the remaining text to be identical.

The scanner counts added and deleted patch lines and compares them with GitHub's file record before accepting a comment-only result. A missing patch, a count mismatch, a rename, an unsupported extension, or a comment form that remains visible to the lexer keeps the file reviewable. This fail-safe result can request an unnecessary review but cannot suppress a known code change.

The supported lexical rules cover C-style line and block comments, hash comments, SQL comments, CSS block comments, and HTML comments for an explicit extension set in the scanner. Comment directives such as JSDoc tags, lint controls, compiler controls, and coverage controls are comments for routing purposes.

## Verification

[Scanner tests](../../../../.github/review-ownership/request-review.test.mjs) cover documentation extensions, supported comment forms, quoted comment markers, executable token changes, incomplete patches, renames, unsupported extensions, exclusion precedence, and the no-request result when every file is excluded.

## Alternatives considered

**Keep every non-test file reviewable.** This requests code owners for documentation and comment maintenance even though the routing policy is intended to identify executable changes.

**Infer arbitrary semantic equivalence.** Proving behavior equivalence across the repository's languages requires language toolchains and still cannot assign one stable meaning to generated files, configuration, or build directives. The scanner performs only lexical comment removal.

**Trust every patch returned by GitHub.** GitHub can omit or truncate patches. Matching the patch's added and deleted line counts to the file record prevents a partial patch from producing a comment-only verdict.

**Fetch and parse every complete file revision.** Per-file content requests multiply API traffic for large pull requests and still require the same language-specific parsing. The changed-file response already carries enough evidence for complete ordinary patches.

## Consequences

Documentation and proven comment-only changes request nobody. The workflow logs them separately from tests so maintainers can audit why owner matching ignored a file.

Unsupported or incomplete inputs remain reviewable. Comment directives do not request owners even when another tool interprets them, because this policy classifies their lexical form rather than downstream tool behavior.
