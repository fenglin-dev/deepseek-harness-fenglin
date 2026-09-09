# Agent Note: CI assertions wait for owned completion

Status: implemented

English | [中文](2026-09-08-ci-readiness-and-completion.zh.md)

## Problem

The [empty master PR run](https://github.com/deepseek-harness/deepseek-harness/actions/runs/34206953049) fails while waiting one second for webhook Session creation and five seconds for PowerShell output. Neither test measures a startup latency guarantee. A [separate run](https://github.com/deepseek-harness/deepseek-harness/actions/runs/34207864157) shows the same short-budget problem in a desktop worker readiness test and captures a feedback acknowledgement while the composer still holds the submitted command.

Another [Windows coverage run](https://github.com/deepseek-harness/deepseek-harness/actions/runs/34224004885/job/102053583437) reports a null publint child status and an LSP initialization-marker timeout. Their helpers impose five- and three-second limits inside the lane's 90-second test budget. These cases verify publication contents and cancellation behavior rather than cold-start latency.

## Decision

The [webhook browser test](../../../../apps/web/tests/github-ready-review.e2e.ts) observes the model request caused by delivery before checking Session registration. The [feedback test](../../../../apps/web/tests/feedback-command.e2e.ts) waits for the empty composer and enabled attachment control before comparing ARIA output. Matching consecutive snapshots cannot prove that the command RPC has settled: its event stream can publish the acknowledgement first.

Community Desktop uses its [supervised activation and recovery](../architecture/2026-09-09-community-alpha15-runtime-and-connection.md) instead of the upstream standalone desktop worker. Its tests dispose transaction managers before removing private roots. The [PowerShell tests](../../../../packages/shell/pwsh-local/tests/executor.spec.ts) register each helper-created Context before plugin initialization and dispose those Contexts before deleting temporary directories. The background-input case awaits process completion before checking complete output, completed status, and exit code. Consuming reads remain covered by their separate streaming tests.

The [publint runner tests](../../../../scripts/publint-all.spec.ts) pass the active test budget to their child and check launch errors and termination signals before interpreting its exit code. The [LSP instance test](../../../../packages/lsp/lsp-stdio/tests/instance.spec.ts) uses the same budget for its fixture marker, observes the actual pending `didOpen` write before aborting, and captures the query's rejection before waiting for readiness. Its [server fixture](../../../../packages/lsp/lsp-stdio/tests/fixture-server.ts) publishes the marker after pausing stdin. Teardown captures the instance list, Context, and directory before its first await.

The [subagent teardown decision](2026-09-07-subagent-teardown-test-budgets.md) owns lifecycle cleanup budgets. The [persistent PowerShell decision](2026-09-07-pwsh-ci-observable-completion.md) owns exact versus inferred terminal readiness; a one-shot process's completion promise has different semantics.

## Alternatives considered

**Larger independent waits.** Rejected where a completion promise already exists. A separate polling deadline continues to compete with the execution lane's budget.

**Refresh the feedback golden.** Rejected: the populated composer and disabled attachment control describe an in-flight submission. The settled expected UI remains the intended behavior.

**Serialize CI or retry these tests.** Rejected: neither establishes the missing completion condition or releases a blocked child after assertion failure.

## Consequences

Readiness and output assertions preserve their original content and ownership checks. Webhook preflight, command-response, PowerShell output, publint startup, and LSP initialization delays are observed through completion waits. The execution lane bounds test bodies and cleanup hooks separately; native Windows execution remains necessary to verify PowerShell and process cleanup there.
