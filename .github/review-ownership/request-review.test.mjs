import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

import {
  approvedReviewerLogins,
  classifyChangedFiles,
  createGitHubApi,
  isCommentOnlyChange,
  isDocumentationPath,
  isTestPath,
  listPullRequestFiles,
  listPullRequestReviews,
  listPullRequestTimeline,
  normalizeRepositoryPath,
  parseOwnership,
  planReviewers,
  requestReviews,
} from './request-review.mjs'

const ownershipSource = readFileSync(new URL('CODEOWNERS', import.meta.url), 'utf8')

const pullRequestEvent = ({ author = 'author', changedFiles = 1, draft = false } = {}) => ({
  repository: { full_name: 'deepseek-harness/deepseek-harness' },
  pull_request: {
    number: 42,
    draft,
    changed_files: changedFiles,
    user: { login: author },
  },
})

test('loads the repository ownership policy without test-only directory rules', () => {
  const rules = parseOwnership(ownershipSource)
  const ownersByPattern = new Map(rules.map(rule => [rule.pattern, rule.owners]))
  assert.equal(rules.length, 57)
  assert.equal(rules.some(rule => rule.pattern === '/benchmarks/'), false)
  assert.equal(rules.some(rule => rule.pattern === '/scripts/'), false)
  assert.equal(rules.some(rule => rule.pattern === '/snapshots/'), false)
  assert.equal(rules.some(rule => rule.pattern === '/packages/test-support/'), false)
  assert.deepEqual(ownersByPattern.get('/apps/cli/'), ['@turtle1999'])
  assert.deepEqual(ownersByPattern.get('/docs/'), ['@turtle1999'])
  assert.deepEqual(ownersByPattern.get('/packages/core/'), ['@turtle1999', '@mektpoy'])
  assert.deepEqual(ownersByPattern.get('/packages/llm/'), ['@LegGasai'])
  assert.deepEqual(ownersByPattern.get('/packages/preset/'), ['@LegGasai', '@turtle1999'])
  assert.deepEqual(ownersByPattern.get('/packages/session/'), ['@turtle1999', '@mektpoy'])
  assert.deepEqual(ownersByPattern.get('/packages/subagent/'), ['@Dudu-0223'])
  assert.deepEqual(ownersByPattern.get('/packages/web/'), ['@imccyu'])
  assert.deepEqual(ownersByPattern.get('/python/'), ['@LegGasai'])
  assert.deepEqual(ownersByPattern.get('/website/'), ['@LegGasai'])
  assert.equal(rules.every(rule => rule.owners.length <= 2), true)
  for (const excludedOwner of ['@tianyicui', '@kermeanx', '@pkh-xht']) {
    assert.equal(rules.some(rule => rule.owners.some(owner => owner.toLowerCase() === excludedOwner)), false)
  }
})

test('keeps turtle below one third of the eligible owned codebase', () => {
  const rules = parseOwnership(ownershipSource)
  const trackedFiles = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(file => file && existsSync(file))
  let ownedLines = 0
  let turtleLines = 0
  for (const file of trackedFiles) {
    if (isTestPath(file) || isDocumentationPath(file)) continue
    const owners = planReviewers(rules, [{ paths: [file], changedLines: 0 }]).matches[0]?.owners ?? []
    if (owners.length === 0) continue
    const content = readFileSync(file)
    const lines = content.length === 0
      ? 0
      : content.reduce((count, byte) => count + (byte === 10 ? 1 : 0), 0) + (content.at(-1) === 10 ? 0 : 1)
    ownedLines += lines
    if (owners.includes('@turtle1999')) turtleLines += lines
  }
  assert.ok(
    turtleLines * 3 <= ownedLines,
    `@turtle1999 owns ${turtleLines} of ${ownedLines} eligible owned lines`,
  )
})

test('rejects ownership forms the requester cannot apply safely', () => {
  for (const [source, message] of [
    ['', /contains no rules/u],
    ['* @owner\n', /explicit absolute directory/u],
    ['/.github/ @owner\n', /hidden-directory/u],
    ['/packages/*/ @owner\n', /explicit absolute directory/u],
    ['/packages/core/\n', /at least one owner/u],
    ['/packages/core/ @org/team\n', /individual GitHub users/u],
    ['/packages/core/ @one @two @three\n', /at most 2 owners/u],
    ['/packages/core/ @owner @OWNER\n', /duplicate owner/u],
    ['/packages/core/ @owner\n/packages/core/ @other\n', /duplicate pattern/u],
  ]) {
    assert.throws(() => parseOwnership(source), message)
  }
})

test('recognizes every repository test location and filename convention', () => {
  for (const file of [
    'apps/cli/tests/args.spec.ts',
    'apps/cli/tests/harness.ts',
    'apps/web/stress-tests/reasoning-chunks.stress.ts',
    'benchmarks/session-open/workload.ts',
    'native/landlock-run/test/entry.test.js',
    'packages/core/agent/__tests__/agent.ts',
    'packages/core/agent/benches/agent.rs',
    'packages/core/agent/src/agent.compat.spec.ts',
    'packages/core/agent/src/__snapshots__/agent.ts.snap',
    'packages/session-query/session-query/tests/test-service.ts',
    'packages/test-support/session-snapshot/src/index.ts',
    'python/sdk/src/test_client.py',
    'python/sdk/src/client_test.py',
    'scripts/fixtures/translation-prompt/response.txt',
    'scripts/session-snapshot-corpus.corpus.ts',
    'scripts/snapshots/translation-prompt-v4/request-response.expected.json',
    'snapshots/session/headless.snapshot.ts',
  ]) {
    assert.equal(isTestPath(file), true, file)
  }
})

test('does not confuse production names with tests', () => {
  for (const file of [
    'apps/cli/src/testing.ts',
    'packages/core/agent/src/contest.ts',
    'packages/session/session-format/src/snapshot.ts',
    'packages/session/session-format/src/spec.ts',
    'packages/session/session-format/src/test.ts',
    'scripts/run-gates.ts',
    'vitest.config.ts',
    'vitest.bench.config.ts',
    'vitest.e2e.config.ts',
    'vitest.snapshot.config.ts',
    'vitest.web.perf.config.ts',
    'website/docs.ts',
  ]) {
    assert.equal(isTestPath(file), false, file)
  }
})

test('excludes Markdown and YAML documentation extensions', () => {
  for (const file of [
    'README.md',
    'docs/architecture.MD',
    'packages/subagent/subagent/guide.yaml',
    'profiles/example.YAML',
  ]) {
    assert.equal(isDocumentationPath(file), true, file)
  }
  for (const file of [
    '.github/workflows/request-review.yml',
    'packages/subagent/subagent/src/index.ts',
    'website/docs.ts',
  ]) {
    assert.equal(isDocumentationPath(file), false, file)
  }
})

test('detects comment-only changes only from complete supported patches', () => {
  for (const file of [
    {
      filename: 'packages/core/agent/src/index.ts',
      status: 'modified', additions: 1, deletions: 1,
      patch: '@@ -1,2 +1,2 @@\n-// old note\n+// new note\n const value = "https://example.com"',
    },
    {
      filename: 'python/sdk/src/client.py',
      status: 'modified', additions: 1, deletions: 1,
      patch: '@@ -1 +1 @@\n-value = 1  # old note\n+value = 1  # new note',
    },
    {
      filename: 'native/landlock-run/src/main.rs',
      status: 'modified', additions: 1, deletions: 1,
      patch: '@@ -1 +1 @@\n-let value = 1; /* old note */\n+let value = 1; /* new note */',
    },
  ]) {
    assert.equal(isCommentOnlyChange(file), true, file.filename)
  }

  for (const file of [
    {
      filename: 'packages/core/agent/src/index.ts',
      status: 'modified', additions: 1, deletions: 1,
      patch: '@@ -1 +1 @@\n-const value = 1 // note\n+const value = 2 // note',
    },
    {
      filename: 'packages/core/agent/src/index.ts',
      status: 'modified', additions: 2, deletions: 1,
      patch: '@@ -1 +1 @@\n-// old note\n+// new note',
    },
    {
      filename: 'packages/core/agent/src/data.json',
      status: 'modified', additions: 1, deletions: 1,
      patch: '@@ -1 +1 @@\n-{"value":1}\n+{"value":2}',
    },
    {
      filename: 'native/landlock-run/src/main.rs',
      status: 'modified', additions: 1, deletions: 1,
      patch: '@@ -1 +1 @@\n-let value = r#"https://old.example"#;\n+let value = r#"https://new.example"#;',
    },
    {
      filename: 'packages/core/agent/src/index.ts',
      status: 'renamed', additions: 1, deletions: 1,
      patch: '@@ -1 +1 @@\n-// old note\n+// new note',
    },
  ]) {
    assert.equal(isCommentOnlyChange(file), false, file.filename)
  }
})

test('normalizes separators and rejects paths that are not repository-relative', () => {
  assert.equal(normalizeRepositoryPath('./packages\\core\\agent\\src\\index.ts'), 'packages/core/agent/src/index.ts')
  for (const file of ['', '/absolute.ts', '../escape.ts', 'packages//empty.ts', 'packages/./same.ts']) {
    assert.throws(() => normalizeRepositoryPath(file), /path/u, file)
  }
})

test('classifies both sides of a rename independently', () => {
  assert.deepEqual(
    classifyChangedFiles([
      {
        filename: 'packages/core/agent/tests/moved.spec.ts',
        previous_filename: 'packages/core/agent/src/moved.ts',
        additions: 3,
        deletions: 2,
      },
      {
        filename: 'packages/client/store/src/restored.ts',
        previous_filename: 'packages/client/store/tests/restored.spec.ts',
        additions: 2,
        deletions: 1,
      },
      { filename: 'packages/core/agent/README.md', additions: 1, deletions: 0 },
      {
        filename: 'packages/core/agent/src/commented.ts',
        status: 'modified', additions: 1, deletions: 1,
        patch: '@@ -1 +1 @@\n-// old note\n+// new note',
      },
    ]),
    {
      changedCodeFiles: [
        'packages/client/store/src/restored.ts',
        'packages/core/agent/src/moved.ts',
      ],
      reviewableChanges: [
        { paths: ['packages/core/agent/src/moved.ts'], changedLines: 5 },
        { paths: ['packages/client/store/src/restored.ts'], changedLines: 3 },
      ],
      excludedTestFiles: [
        'packages/client/store/tests/restored.spec.ts',
        'packages/core/agent/tests/moved.spec.ts',
      ],
      excludedDocumentationFiles: ['packages/core/agent/README.md'],
      excludedCommentOnlyFiles: ['packages/core/agent/src/commented.ts'],
    },
  )
})

test('uses the last matching ownership rule and ranks owners by changed LOC', () => {
  const rules = parseOwnership('/packages/ @broad\n/packages/core/ @core @second\n')
  assert.deepEqual(
    planReviewers(rules, [
      { paths: ['AGENTS.md'], changedLines: 1 },
      { paths: ['packages/core/agent/src/index.ts'], changedLines: 8 },
      { paths: ['packages/fs/fs/src/index.ts'], changedLines: 3 },
    ]),
    {
      matches: [
        { file: 'AGENTS.md', changedLines: 1, owners: [] },
        { file: 'packages/core/agent/src/index.ts', changedLines: 8, owners: ['@core', '@second'] },
        { file: 'packages/fs/fs/src/index.ts', changedLines: 3, owners: ['@broad'] },
      ],
      reviewers: [
        { login: 'core', changedLines: 8 },
        { login: 'second', changedLines: 8 },
        { login: 'broad', changedLines: 3 },
      ],
    },
  )
})

test('counts each changed-file record once per owner across rename paths', () => {
  const rules = parseOwnership('/packages/a/ @same @a\n/packages/b/ @same @b\n/packages/c/ @c\n')
  const plan = planReviewers(rules, [
    { paths: ['packages/a/old.ts', 'packages/b/new.ts'], changedLines: 10 },
    { paths: ['packages/a/other.ts'], changedLines: 5 },
    { paths: ['packages/c/tiny.ts'], changedLines: 1 },
  ])
  assert.deepEqual(plan.reviewers, [
    { login: 'a', changedLines: 15 },
    { login: 'same', changedLines: 15 },
    { login: 'b', changedLines: 10 },
    { login: 'c', changedLines: 1 },
  ])
})

test('rejects invalid changed-file LOC', () => {
  for (const file of [
    { filename: 'packages/core/index.ts', deletions: 0 },
    { filename: 'packages/core/index.ts', additions: -1, deletions: 0 },
    { filename: 'packages/core/index.ts', additions: Number.MAX_SAFE_INTEGER, deletions: 1 },
  ]) {
    assert.throws(() => classifyChangedFiles([file]), /changed-file|LOC/u)
  }
})

test('fetches every declared changed file across pages', async () => {
  const calls = []
  const pageOne = Array.from({ length: 100 }, (_, index) => ({ filename: `packages/core/file-${index}.ts` }))
  const pageTwo = [{ filename: 'packages/core/file-100.ts' }]
  const api = async (path) => {
    calls.push(path)
    return calls.length === 1 ? pageOne : pageTwo
  }
  const files = await listPullRequestFiles(api, 'owner/repo', 42, 101)
  assert.equal(files.length, 101)
  assert.deepEqual(calls, [
    '/repos/owner/repo/pulls/42/files?per_page=100&page=1',
    '/repos/owner/repo/pulls/42/files?per_page=100&page=2',
  ])
})

test('fails closed when GitHub cannot provide the complete file list', async () => {
  let calls = 0
  await assert.rejects(
    listPullRequestFiles(async () => {
      calls++
      return calls === 1 ? [{ filename: 'one.ts' }] : []
    }, 'owner/repo', 42, 2),
    /returned 1 of 2/u,
  )
  await assert.rejects(
    listPullRequestFiles(async () => [], 'owner/repo', 42, 3_001),
    /at most 3000/u,
  )
})

test('fetches pull-request reviews across pages', async () => {
  const calls = []
  const pageOne = Array.from({ length: 100 }, (_, index) => ({
    user: { login: `reviewer-${index}` },
    state: 'COMMENTED',
  }))
  const pageTwo = [{ user: { login: 'approver' }, state: 'APPROVED' }]
  const reviews = await listPullRequestReviews(async (path) => {
    calls.push(path)
    return calls.length === 1 ? pageOne : pageTwo
  }, 'owner/repo', 42)

  assert.equal(reviews.length, 101)
  assert.deepEqual(calls, [
    '/repos/owner/repo/pulls/42/reviews?per_page=100&page=1',
    '/repos/owner/repo/pulls/42/reviews?per_page=100&page=2',
  ])
})

test('tracks each reviewer\'s latest undismissed approval decision', () => {
  assert.deepEqual(approvedReviewerLogins([
    { user: { login: 'commented-after' }, state: 'APPROVED' },
    { user: { login: 'commented-after' }, state: 'COMMENTED' },
    { user: { login: 'changes-after' }, state: 'APPROVED' },
    { user: { login: 'changes-after' }, state: 'CHANGES_REQUESTED' },
    { user: { login: 'dismissed' }, state: 'DISMISSED' },
    { user: { login: 'approved-after' }, state: 'CHANGES_REQUESTED' },
    { user: { login: 'approved-after' }, state: 'APPROVED' },
    { user: { login: 'pending-after' }, state: 'APPROVED' },
    { user: { login: 'pending-after' }, state: 'PENDING' },
  ]), ['approved-after', 'commented-after', 'pending-after'])

  assert.throws(
    () => approvedReviewerLogins([{ user: { login: 'reviewer' }, state: 'UNKNOWN' }]),
    /invalid state/u,
  )
  assert.throws(() => approvedReviewerLogins([{ state: 'APPROVED' }]), /invalid reviewer/u)
})

test('fails closed when the pull-request review list exceeds its limit', async () => {
  let calls = 0
  await assert.rejects(
    listPullRequestReviews(async () => {
      calls++
      return Array.from({ length: 100 }, () => ({ user: { login: 'reviewer' }, state: 'COMMENTED' }))
    }, 'owner/repo', 42),
    /exceed 3000 entries/u,
  )
  assert.equal(calls, 30)
})

test('fails closed when the review-request timeline exceeds its limit', async () => {
  let calls = 0
  await assert.rejects(
    listPullRequestTimeline(async () => {
      calls++
      return Array.from({ length: 100 }, () => ({ event: 'commented' }))
    }, 'owner/repo', 42),
    /exceeds 3000 events/u,
  )
  assert.equal(calls, 30)
})

test('prints changed code files and requests the highest-ranked counted owner', async () => {
  const trace = []
  const files = [
    { filename: 'packages/core/agent/src/index.ts', additions: 70, deletions: 10 },
    { filename: 'packages/preset/agent-presets/src/index.ts', additions: 5, deletions: 5 },
    { filename: 'packages/client/store/src/index.ts', additions: 2, deletions: 0 },
    { filename: 'packages/subagent/subagent/src/index.ts', additions: 40, deletions: 0 },
    { filename: 'packages/core/agent/tests/index.spec.ts', additions: 100, deletions: 0 },
    { filename: 'AGENTS.md', additions: 200, deletions: 0 },
  ]
  const api = async (path, options = {}) => {
    trace.push({ type: 'api', path, options })
    if (path.endsWith('/files?per_page=100&page=1')) return files
    if (path.endsWith('/reviews?per_page=100&page=1')) return []
    if (path.endsWith('/requested_reviewers') && options.method !== 'POST') {
      return { users: [], teams: [] }
    }
    if (path.endsWith('/requested_reviewers') && options.method === 'POST') return {}
    throw new Error(`unexpected API path ${path}`)
  }

  const result = await requestReviews({
    event: pullRequestEvent({ author: 'turtle1999', changedFiles: files.length }),
    ownershipSource,
    api,
    write: line => trace.push({ type: 'log', line }),
  })

  assert.deepEqual(result, {
    changedCodeFiles: [
      'packages/client/store/src/index.ts',
      'packages/core/agent/src/index.ts',
      'packages/preset/agent-presets/src/index.ts',
      'packages/subagent/subagent/src/index.ts',
    ],
    excludedTestFiles: ['packages/core/agent/tests/index.spec.ts'],
    excludedDocumentationFiles: ['AGENTS.md'],
    excludedCommentOnlyFiles: [],
    requestedReviewers: ['mektpoy'],
    cancelledReviewers: [],
  })
  assert.equal(trace[0].type, 'log')
  assert.equal(trace[0].line, 'This is by automated Angry Turtle Cyborg, not a human')
  const changedHeading = trace.findIndex(item => item.type === 'log' && item.line === 'Changed code files:')
  const relevanceHeading = trace.findIndex(item => item.type === 'log' && item.line === 'Owner relevance by changed LOC:')
  const post = trace.findIndex(item => item.type === 'api' && item.options.method === 'POST')
  assert.ok(changedHeading >= 0 && changedHeading < relevanceHeading && relevanceHeading < post)
  assert.deepEqual(trace.slice(relevanceHeading, relevanceHeading + 6).map(item => item.line), [
    'Owner relevance by changed LOC:',
    '- @turtle1999: 90',
    '- @mektpoy: 80',
    '- @Dudu-0223: 40',
    '- @LegGasai: 10',
    '- @imccyu: 2',
  ])
  assert.deepEqual(trace[post], {
    type: 'api',
    path: '/repos/deepseek-harness/deepseek-harness/pulls/42/requested_reviewers',
    options: {
      method: 'POST',
      body: { reviewers: ['mektpoy'] },
    },
  })
})

test('does not request an owner again after that owner approves', async () => {
  const calls = []
  const output = []
  const result = await requestReviews({
    event: pullRequestEvent(),
    ownershipSource: '/packages/typert/ @imccyu\n',
    api: async (path, options = {}) => {
      calls.push({ path, options })
      if (path.endsWith('/files?per_page=100&page=1')) {
        return [{ filename: 'packages/typert/generator/src/analyzer.ts', additions: 150, deletions: 47 }]
      }
      if (path.endsWith('/reviews?per_page=100&page=1')) {
        return [
          { user: { login: 'imccyu' }, state: 'APPROVED' },
          { user: { login: 'imccyu' }, state: 'COMMENTED' },
        ]
      }
      if (path.endsWith('/requested_reviewers') && options.method === undefined) {
        return { users: [], teams: [] }
      }
      throw new Error(`unexpected API path ${path}`)
    },
    write: line => output.push(line),
  })

  assert.deepEqual(result.requestedReviewers, [])
  assert.equal(calls.some(call => call.options.method === 'POST'), false)
  const approvedHeading = output.indexOf('Approved owners omitted from review requests:')
  assert.ok(approvedHeading >= 0)
  assert.equal(output[approvedHeading + 1], '- @imccyu')
})

test('fills the counted slot with the next owner after omitting an approved owner', async () => {
  const calls = []
  const result = await requestReviews({
    event: pullRequestEvent(),
    ownershipSource: '/packages/core/ @imccyu @mektpoy\n',
    api: async (path, options = {}) => {
      calls.push({ path, options })
      if (path.endsWith('/files?per_page=100&page=1')) {
        return [{ filename: 'packages/core/agent/src/index.ts', additions: 20, deletions: 10 }]
      }
      if (path.endsWith('/reviews?per_page=100&page=1')) {
        return [{ user: { login: 'imccyu' }, state: 'APPROVED' }]
      }
      if (path.endsWith('/requested_reviewers') && options.method === undefined) {
        return { users: [], teams: [] }
      }
      if (path.endsWith('/requested_reviewers') && options.method === 'POST') return {}
      throw new Error(`unexpected API path ${path}`)
    },
    write: () => {},
  })

  assert.deepEqual(result.requestedReviewers, ['mektpoy'])
  assert.deepEqual(calls.find(call => call.options.method === 'POST'), {
    path: '/repos/deepseek-harness/deepseek-harness/pulls/42/requested_reviewers',
    options: { method: 'POST', body: { reviewers: ['mektpoy'] } },
  })
})

test('does not add another counted owner when one is already requested', async () => {
  const calls = []
  const output = []
  const result = await requestReviews({
    event: pullRequestEvent(),
    ownershipSource: '/packages/core/ @mektpoy\n',
    api: async (path, options = {}) => {
      calls.push({ path, options })
      if (path.endsWith('/files?per_page=100&page=1')) {
        return [{ filename: 'packages/core/agent/src/index.ts', additions: 20, deletions: 10 }]
      }
      if (path.endsWith('/reviews?per_page=100&page=1')) return []
      if (path.endsWith('/requested_reviewers') && options.method === undefined) {
        return { users: [{ login: 'first' }], teams: [] }
      }
      if (path.endsWith('/timeline?per_page=100&page=1')) return []
      throw new Error(`unexpected API path ${path}`)
    },
    write: line => output.push(line),
  })

  assert.deepEqual(result.requestedReviewers, [])
  assert.equal(calls.some(call => call.options.method === 'POST'), false)
  assert.deepEqual(output.slice(-7), [
    'Current individual review requests:',
    '- @first',
    'Available counted review request slots: 0.',
    'Review requests to cancel:',
    '- (none)',
    'Reviewers to request:',
    '- (none)',
  ])
})

test('requests at most one owner per run when turtle ranks first', async () => {
  const calls = []
  const result = await requestReviews({
    event: pullRequestEvent({ author: 'contributor', changedFiles: 2 }),
    ownershipSource: '/packages/core/ @turtle1999\n/packages/client/ @mektpoy\n',
    api: async (path, options = {}) => {
      calls.push({ path, options })
      if (path.endsWith('/files?per_page=100&page=1')) {
        return [
          { filename: 'packages/core/agent/src/index.ts', additions: 25, deletions: 5 },
          { filename: 'packages/client/store/src/index.ts', additions: 8, deletions: 2 },
        ]
      }
      if (path.endsWith('/reviews?per_page=100&page=1')) return []
      if (path.endsWith('/requested_reviewers') && options.method === undefined) {
        return { users: [], teams: [] }
      }
      if (path.endsWith('/requested_reviewers') && options.method === 'POST') return {}
      throw new Error(`unexpected API path ${path}`)
    },
    write: () => {},
  })

  assert.deepEqual(result.requestedReviewers, ['turtle1999'])
  assert.deepEqual(calls.find(call => call.options.method === 'POST'), {
    path: '/repos/deepseek-harness/deepseek-harness/pulls/42/requested_reviewers',
    options: { method: 'POST', body: { reviewers: ['turtle1999'] } },
  })
})

test('does not add turtle when one counted reviewer is already requested', async () => {
  const calls = []
  const result = await requestReviews({
    event: pullRequestEvent({ author: 'contributor' }),
    ownershipSource: '/packages/core/ @turtle1999 @mektpoy\n',
    api: async (path, options = {}) => {
      calls.push({ path, options })
      if (path.endsWith('/files?per_page=100&page=1')) {
        return [{ filename: 'packages/core/agent/src/index.ts', additions: 20, deletions: 10 }]
      }
      if (path.endsWith('/reviews?per_page=100&page=1')) return []
      if (path.endsWith('/requested_reviewers') && options.method === undefined) {
        return { users: [{ login: 'first' }], teams: [] }
      }
      if (path.endsWith('/timeline?per_page=100&page=1')) return []
      throw new Error(`unexpected API path ${path}`)
    },
    write: () => {},
  })

  assert.deepEqual(result.requestedReviewers, [])
  assert.equal(calls.some(call => call.options.method === 'POST'), false)
})

test('keeps the counted slot available when turtle is already requested', async () => {
  const calls = []
  const result = await requestReviews({
    event: pullRequestEvent({ author: 'contributor' }),
    ownershipSource: '/packages/core/ @turtle1999 @mektpoy\n',
    api: async (path, options = {}) => {
      calls.push({ path, options })
      if (path.endsWith('/files?per_page=100&page=1')) {
        return [{ filename: 'packages/core/agent/src/index.ts', additions: 20, deletions: 10 }]
      }
      if (path.endsWith('/reviews?per_page=100&page=1')) return []
      if (path.endsWith('/requested_reviewers') && options.method === undefined) {
        return { users: [{ login: 'turtle1999' }], teams: [] }
      }
      if (path.endsWith('/timeline?per_page=100&page=1')) return []
      if (path.endsWith('/requested_reviewers') && options.method === 'POST') return {}
      throw new Error(`unexpected API path ${path}`)
    },
    write: () => {},
  })

  assert.deepEqual(result.requestedReviewers, ['mektpoy'])
  assert.deepEqual(calls.find(call => call.options.method === 'POST'), {
    path: '/repos/deepseek-harness/deepseek-harness/pulls/42/requested_reviewers',
    options: { method: 'POST', body: { reviewers: ['mektpoy'] } },
  })
})

test('replaces a workflow reviewer that no longer matches current ownership', async () => {
  const trace = []
  const result = await requestReviews({
    event: pullRequestEvent({ author: 'contributor' }),
    ownershipSource: '/packages/core/ @mektpoy\n',
    api: async (path, options = {}) => {
      trace.push({ type: 'api', path, options })
      if (path.endsWith('/files?per_page=100&page=1')) {
        return [{ filename: 'packages/core/agent/src/index.ts', additions: 20, deletions: 10 }]
      }
      if (path.endsWith('/reviews?per_page=100&page=1')) return []
      if (path.endsWith('/requested_reviewers') && options.method === undefined) {
        return { users: [{ login: 'Dudu-0223' }], teams: [] }
      }
      if (path.endsWith('/timeline?per_page=100&page=1')) {
        return [{
          event: 'review_requested',
          requested_reviewer: { login: 'Dudu-0223' },
          review_requester: { login: 'github-actions[bot]' },
        }]
      }
      if (path.endsWith('/requested_reviewers') && options.method === 'DELETE') return {}
      if (path.endsWith('/requested_reviewers') && options.method === 'POST') return {}
      throw new Error(`unexpected API path ${path}`)
    },
    write: line => trace.push({ type: 'log', line }),
  })

  assert.deepEqual(result.requestedReviewers, ['mektpoy'])
  assert.deepEqual(result.cancelledReviewers, ['Dudu-0223'])
  const cancelLog = trace.findIndex(item => item.type === 'log' && item.line === 'Review requests to cancel:')
  const requestLog = trace.findIndex(item => item.type === 'log' && item.line === 'Reviewers to request:')
  const firstMutation = trace.findIndex(item => item.type === 'api' && item.options.method !== undefined)
  assert.ok(cancelLog >= 0 && requestLog >= 0 && cancelLog < firstMutation && requestLog < firstMutation)
  assert.equal(trace[cancelLog + 1].line, '- @Dudu-0223')
  assert.equal(trace[requestLog + 1].line, '- @mektpoy')
  assert.deepEqual(trace.filter(item => item.type === 'api' && item.options.method !== undefined), [
    {
      type: 'api',
      path: '/repos/deepseek-harness/deepseek-harness/pulls/42/requested_reviewers',
      options: { method: 'DELETE', body: { reviewers: ['Dudu-0223'] } },
    },
    {
      type: 'api',
      path: '/repos/deepseek-harness/deepseek-harness/pulls/42/requested_reviewers',
      options: { method: 'POST', body: { reviewers: ['mektpoy'] } },
    },
  ])
})

test('removes excess workflow reviewers using current relevance order', async () => {
  const calls = []
  const result = await requestReviews({
    event: pullRequestEvent({ author: 'contributor', changedFiles: 2 }),
    ownershipSource: '/packages/core/ @mektpoy\n/packages/subagent/ @Dudu-0223\n',
    api: async (path, options = {}) => {
      calls.push({ path, options })
      if (path.endsWith('/files?per_page=100&page=1')) {
        return [
          { filename: 'packages/core/agent/src/index.ts', additions: 25, deletions: 5 },
          { filename: 'packages/subagent/subagent/src/index.ts', additions: 8, deletions: 2 },
        ]
      }
      if (path.endsWith('/reviews?per_page=100&page=1')) return []
      if (path.endsWith('/requested_reviewers') && options.method === undefined) {
        return { users: [{ login: 'Dudu-0223' }, { login: 'mektpoy' }], teams: [] }
      }
      if (path.endsWith('/timeline?per_page=100&page=1')) {
        return ['Dudu-0223', 'mektpoy'].map(login => ({
          event: 'review_requested',
          requested_reviewer: { login },
          review_requester: { login: 'github-actions[bot]' },
        }))
      }
      if (path.endsWith('/requested_reviewers') && options.method === 'DELETE') return {}
      throw new Error(`unexpected API path ${path}`)
    },
    write: () => {},
  })

  assert.deepEqual(result, {
    changedCodeFiles: [
      'packages/core/agent/src/index.ts',
      'packages/subagent/subagent/src/index.ts',
    ],
    excludedTestFiles: [],
    excludedDocumentationFiles: [],
    excludedCommentOnlyFiles: [],
    requestedReviewers: [],
    cancelledReviewers: ['Dudu-0223'],
  })
  assert.deepEqual(calls.find(call => call.options.method === 'DELETE'), {
    path: '/repos/deepseek-harness/deepseek-harness/pulls/42/requested_reviewers',
    options: { method: 'DELETE', body: { reviewers: ['Dudu-0223'] } },
  })
})

test('does not request reviewers for test, documentation, or comment-only changes', async () => {
  const calls = []
  const output = []
  const files = [
    { filename: 'apps/web/tests/chat.e2e.ts', additions: 10, deletions: 0 },
    { filename: 'packages/core/agent/tests/agent.spec.ts', additions: 10, deletions: 0 },
    { filename: 'packages/core/agent/README.md', additions: 10, deletions: 0 },
    { filename: 'packages/core/agent/examples.yaml', additions: 10, deletions: 0 },
    {
      filename: 'packages/core/agent/src/index.ts',
      status: 'modified', additions: 1, deletions: 1,
      patch: '@@ -1 +1 @@\n-// old note\n+// new note',
    },
  ]
  const result = await requestReviews({
    event: pullRequestEvent({ changedFiles: files.length }),
    ownershipSource,
    api: async (path) => {
      calls.push(path)
      if (path.endsWith('/files?per_page=100&page=1')) return files
      if (path.endsWith('/requested_reviewers')) return { users: [], teams: [] }
      throw new Error(`unexpected API path ${path}`)
    },
    write: line => output.push(line),
  })
  assert.deepEqual(result, {
    changedCodeFiles: [],
    excludedTestFiles: files.slice(0, 2).map(file => file.filename),
    excludedDocumentationFiles: files.slice(2, 4).map(file => file.filename),
    excludedCommentOnlyFiles: ['packages/core/agent/src/index.ts'],
    requestedReviewers: [],
    cancelledReviewers: [],
  })
  assert.equal(calls.length, 2)
  assert.deepEqual(output.slice(0, 4), [
    'This is by automated Angry Turtle Cyborg, not a human',
    'Changed code files:',
    '- (none)',
    'Excluded test files:',
  ])
})

test('cancels workflow-authored review requests on draft pull requests', async () => {
  const trace = []
  const files = [
    { filename: 'packages/subagent/subagent/src/index.ts', additions: 10, deletions: 2 },
    { filename: 'packages/subagent/subagent/tests/index.spec.ts', additions: 10, deletions: 0 },
    { filename: 'packages/subagent/subagent/README.md', additions: 10, deletions: 0 },
  ]
  const result = await requestReviews({
    event: pullRequestEvent({ draft: true, changedFiles: files.length }),
    ownershipSource,
    api: async (path, options = {}) => {
      trace.push({ type: 'api', path, options })
      if (path.endsWith('/files?per_page=100&page=1')) return files
      if (path.endsWith('/requested_reviewers') && options.method === undefined) {
        return { users: [{ login: 'Dudu-0223' }, { login: 'manual-reviewer' }], teams: [] }
      }
      if (path.endsWith('/timeline?per_page=100&page=1')) {
        return [
          {
            event: 'review_requested',
            requested_reviewer: { login: 'Dudu-0223' },
            review_requester: { login: 'maintainer' },
          },
          {
            event: 'review_requested',
            requested_reviewer: { login: 'Dudu-0223' },
            review_requester: { login: 'github-actions[bot]' },
          },
          {
            event: 'review_requested',
            requested_reviewer: { login: 'manual-reviewer' },
            review_requester: { login: 'github-actions[bot]' },
          },
          {
            event: 'review_requested',
            requested_reviewer: { login: 'manual-reviewer' },
            review_requester: { login: 'maintainer' },
          },
        ]
      }
      if (path.endsWith('/requested_reviewers') && options.method === 'DELETE') return {}
      throw new Error(`unexpected API path ${path}`)
    },
    write: line => trace.push({ type: 'log', line }),
  })
  assert.deepEqual(result, {
    changedCodeFiles: ['packages/subagent/subagent/src/index.ts'],
    excludedTestFiles: ['packages/subagent/subagent/tests/index.spec.ts'],
    excludedDocumentationFiles: ['packages/subagent/subagent/README.md'],
    excludedCommentOnlyFiles: [],
    requestedReviewers: [],
    cancelledReviewers: ['Dudu-0223'],
  })
  const remove = trace.find(item => item.type === 'api' && item.options.method === 'DELETE')
  assert.deepEqual(remove, {
    type: 'api',
    path: '/repos/deepseek-harness/deepseek-harness/pulls/42/requested_reviewers',
    options: { method: 'DELETE', body: { reviewers: ['Dudu-0223'] } },
  })
  assert.equal(trace.some(item => item.type === 'log' && item.line === '- @manual-reviewer'), false)
  assert.equal(trace.at(-1).line, 'Cancelled review request for @Dudu-0223.')
})

test('sends authenticated JSON and escapes an API error body', async () => {
  const requests = []
  const api = createGitHubApi({
    token: 'secret',
    apiUrl: 'https://github.example/api/v3/',
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    },
  })
  assert.deepEqual(await api('/repos/owner/repo', { method: 'POST', body: { value: 1 } }), { ok: true })
  assert.equal(requests[0].url, 'https://github.example/api/v3/repos/owner/repo')
  assert.equal(requests[0].options.headers.Authorization, 'Bearer secret')
  assert.equal(requests[0].options.headers['X-GitHub-Api-Version'], '2026-03-10')
  assert.equal(requests[0].options.body, '{"value":1}')

  const failing = createGitHubApi({
    token: 'secret',
    fetchImpl: async () => new Response('::error::untrusted\nbody', { status: 422 }),
  })
  await assert.rejects(failing('/failure'), /"::error::untrusted\\nbody"/u)
})
