#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const API_VERSION = '2026-03-10'
const MAX_OWNERS_PER_RULE = 2
const MAX_PULL_REQUEST_FILES = 3_000
const MAX_PULL_REQUEST_REVIEWS = 3_000
const MAX_COUNTED_REQUESTED_REVIEWERS = 1
const MAX_TIMELINE_EVENTS = 3_000
const PAGE_SIZE = 100
const PULL_REQUEST_REVIEW_STATES = new Set(['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED', 'PENDING'])
const UNCOUNTED_REVIEWER = 'turtle1999'
const WORKFLOW_REVIEW_REQUESTER = 'github-actions[bot]'
const TEST_DIRECTORY_NAMES = new Set(['__snapshots__', '__tests__', 'benches', 'stress-tests', 'test', 'tests'])
const TEST_FILE_MARKER = /\.(?:bench|corpus|e2e|perf|snapshot|spec|stress|test)\.[^./]+$/u
const PYTHON_TEST_FILE = /^(?:test_.+|.+_tests?)\.py$/u
const DOCUMENTATION_FILE = /\.(?:md|yaml)$/iu
const C_STYLE_EXTENSIONS = new Set([
  'c', 'cc', 'cjs', 'cpp', 'cts', 'cxx', 'go', 'h', 'hpp', 'java', 'js', 'jsx',
  'kt', 'kts', 'less', 'mjs', 'mts', 'rs', 'scss', 'swift', 'ts', 'tsx',
])
const BLOCK_COMMENT_EXTENSIONS = new Set(['css'])
const HASH_COMMENT_EXTENSIONS = new Set(['bash', 'ps1', 'py', 'pyi', 'r', 'rb', 'sh', 'toml', 'yml', 'zsh'])
const HTML_COMMENT_EXTENSIONS = new Set(['htm', 'html'])

/**
 * Parse the explicit directory subset accepted from the review ownership file.
 * @param {string} source CODEOWNERS-compatible source text.
 * @returns {Array<{pattern: string, prefix: string, owners: string[]}>} Ordered ownership rules.
 */
export function parseOwnership(source) {
  const rules = []
  const patterns = new Set()
  for (const [index, rawLine] of source.split('\n').entries()) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const [pattern, ...owners] = line.split(/\s+/u)
    const location = `ownership line ${index + 1}`
    if (!/^\/[^*?[\]#!\\]+\/$/u.test(pattern)) {
      throw new Error(`${location}: expected one explicit absolute directory pattern`)
    }
    if (pattern.startsWith('/.')) throw new Error(`${location}: hidden-directory patterns are not allowed`)
    if (patterns.has(pattern)) throw new Error(`${location}: duplicate pattern ${JSON.stringify(pattern)}`)
    if (owners.length === 0) throw new Error(`${location}: expected at least one owner`)
    if (owners.length > MAX_OWNERS_PER_RULE) {
      throw new Error(`${location}: expected at most ${MAX_OWNERS_PER_RULE} owners`)
    }
    const normalizedOwners = []
    const seenOwners = new Set()
    for (const owner of owners) {
      if (!/^@[A-Za-z0-9-]+$/u.test(owner)) {
        throw new Error(`${location}: only individual GitHub users are supported`)
      }
      const key = owner.toLowerCase()
      if (seenOwners.has(key)) throw new Error(`${location}: duplicate owner ${owner}`)
      seenOwners.add(key)
      normalizedOwners.push(owner)
    }
    patterns.add(pattern)
    rules.push({ pattern, prefix: pattern.slice(1), owners: normalizedOwners })
  }
  if (rules.length === 0) throw new Error('ownership file contains no rules')
  return rules
}

/**
 * Normalize a repository-relative path received from GitHub.
 * @param {unknown} value GitHub file path.
 * @returns {string} Slash-normalized repository path.
 */
export function normalizeRepositoryPath(value) {
  if (typeof value !== 'string' || value.length === 0) throw new Error('changed file has no path')
  const normalized = value.replaceAll('\\', '/').replace(/^\.\/+/, '')
  if (
    normalized.startsWith('/')
    || normalized.includes('\0')
    || normalized.split('/').some(segment => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error(`invalid repository path ${JSON.stringify(value)}`)
  }
  return normalized
}

/**
 * Decide whether a repository path belongs only to test evidence or test support.
 * @param {string} value Repository-relative path.
 * @returns {boolean} Whether reviewer routing must ignore the path.
 */
export function isTestPath(value) {
  const file = normalizeRepositoryPath(value)
  const segments = file.split('/')
  if (segments[0] === 'benchmarks' || segments[0] === 'snapshots') return true
  if (segments[0] === 'packages' && segments[1] === 'test-support') return true
  if (segments[0] === 'scripts' && (segments[1] === 'fixtures' || segments[1] === 'snapshots')) return true
  if (segments.some(segment => TEST_DIRECTORY_NAMES.has(segment))) return true
  const basename = segments.at(-1) ?? ''
  return TEST_FILE_MARKER.test(basename) || PYTHON_TEST_FILE.test(basename)
}

/**
 * Decide whether a repository path is documentation excluded from review routing.
 * @param {string} value Repository-relative path.
 * @returns {boolean} Whether the path has an excluded documentation extension.
 */
export function isDocumentationPath(value) {
  return DOCUMENTATION_FILE.test(normalizeRepositoryPath(value))
}

/**
 * Decide whether a complete modified-file patch changes comments only.
 * @param {unknown} value GitHub changed-file record.
 * @returns {boolean} Whether supported comment parsing removes every changed token.
 */
export function isCommentOnlyChange(value) {
  if (!isRecord(value) || value.status !== 'modified' || typeof value.filename !== 'string'
    || typeof value.patch !== 'string' || !Number.isSafeInteger(value.additions)
    || value.additions < 0 || !Number.isSafeInteger(value.deletions) || value.deletions < 0) return false
  const syntax = commentSyntax(value.filename)
  if (syntax === undefined) return false
  if (value.filename.toLowerCase().endsWith('.rs') && /\b(?:br|r)#{0,255}"/u.test(value.patch)) return false
  const hunks = parsePatchHunks(value.patch)
  if (hunks === undefined || hunks.additions !== value.additions || hunks.deletions !== value.deletions) {
    return false
  }
  return hunks.values.every(({ before, after }) =>
    normalizedCode(before, syntax) === normalizedCode(after, syntax))
}

function commentSyntax(filename) {
  const normalized = normalizeRepositoryPath(filename)
  const basename = normalized.slice(normalized.lastIndexOf('/') + 1).toLowerCase()
  const extension = basename.includes('.') ? basename.slice(basename.lastIndexOf('.') + 1) : ''
  const line = []
  const block = []
  if (C_STYLE_EXTENSIONS.has(extension)) {
    line.push('//')
    block.push(['/*', '*/'])
  }
  if (BLOCK_COMMENT_EXTENSIONS.has(extension)) block.push(['/*', '*/'])
  if (HASH_COMMENT_EXTENSIONS.has(extension) || basename === 'dockerfile' || basename.startsWith('dockerfile.')
    || basename === 'makefile' || basename.startsWith('makefile.')) line.push('#')
  if (extension === 'sql') {
    line.push('--')
    block.push(['/*', '*/'])
  }
  if (HTML_COMMENT_EXTENSIONS.has(extension)) block.push(['<!--', '-->'])
  return line.length === 0 && block.length === 0 ? undefined : { line, block }
}

function parsePatchHunks(patch) {
  const values = []
  let current
  let additions = 0
  let deletions = 0
  for (const line of patch.split('\n')) {
    if (line.startsWith('@@')) {
      current = { before: [], after: [] }
      values.push(current)
      continue
    }
    if (current === undefined || line.startsWith('\\ No newline at end of file')) continue
    const prefix = line[0]
    const content = line.slice(1)
    if (prefix === ' ') {
      current.before.push(content)
      current.after.push(content)
    } else if (prefix === '-') {
      current.before.push(content)
      deletions++
    } else if (prefix === '+') {
      current.after.push(content)
      additions++
    }
  }
  return values.length === 0 ? undefined : { values, additions, deletions }
}

function normalizedCode(lines, syntax) {
  return stripComments(lines.join('\n'), syntax)
    .split('\n')
    .map(line => line.trimEnd())
    .filter(line => line.trim().length > 0)
    .join('\n')
}

function stripComments(source, syntax) {
  let result = ''
  let quote
  let blockEnd
  for (let index = 0; index < source.length;) {
    if (blockEnd !== undefined) {
      if (source.startsWith(blockEnd, index)) {
        index += blockEnd.length
        blockEnd = undefined
      } else {
        index++
      }
      continue
    }
    const character = source[index]
    if (quote !== undefined) {
      result += character
      index++
      if (character === '\\' && index < source.length) {
        result += source[index]
        index++
      } else if (character === quote) {
        quote = undefined
      }
      continue
    }
    if (character === '\'' || character === '"' || character === '`') {
      quote = character
      result += character
      index++
      continue
    }
    const block = syntax.block.find(([start]) => source.startsWith(start, index))
    if (block !== undefined) {
      index += block[0].length
      blockEnd = block[1]
      continue
    }
    const line = syntax.line.find(marker => source.startsWith(marker, index))
    const lineStart = index === 0 || source[index - 1] === '\n'
    const hashStartsComment = line !== '#' || lineStart || /\s/u.test(source[index - 1] ?? '')
    if (line !== undefined && hashStartsComment && !(line === '#' && lineStart && source[index + 1] === '!')) {
      const newline = source.indexOf('\n', index + line.length)
      if (newline === -1) break
      result += '\n'
      index = newline + 1
      continue
    }
    result += character
    index++
  }
  return result
}

/**
 * Expand changed-file records into reviewable, test, documentation, and comment-only paths.
 * @param {unknown[]} files Pull-request file records from GitHub.
 * @returns {{changedCodeFiles: string[], reviewableChanges: Array<{paths: string[], changedLines: number}>, excludedTestFiles: string[], excludedDocumentationFiles: string[], excludedCommentOnlyFiles: string[]}} Classified paths and their GitHub-reported changed-line counts.
 */
export function classifyChangedFiles(files) {
  const changedCodeFiles = new Set()
  const reviewableChanges = []
  const excludedTestFiles = new Set()
  const excludedDocumentationFiles = new Set()
  const excludedCommentOnlyFiles = new Set()
  for (const entry of files) {
    if (!isRecord(entry)) throw new Error('changed-file response contains a non-object entry')
    const changedLines = changedLineCount(entry)
    const paths = [normalizeRepositoryPath(entry.filename)]
    const commentOnly = isCommentOnlyChange(entry)
    if (entry.previous_filename !== undefined) {
      paths.unshift(normalizeRepositoryPath(entry.previous_filename))
    }
    const reviewablePaths = []
    for (const file of new Set(paths)) {
      if (isTestPath(file)) excludedTestFiles.add(file)
      else if (isDocumentationPath(file)) excludedDocumentationFiles.add(file)
      else if (commentOnly) excludedCommentOnlyFiles.add(file)
      else {
        changedCodeFiles.add(file)
        reviewablePaths.push(file)
      }
    }
    if (reviewablePaths.length > 0) {
      reviewableChanges.push({ paths: reviewablePaths.sort(), changedLines })
    }
  }
  return {
    changedCodeFiles: [...changedCodeFiles].sort(),
    reviewableChanges,
    excludedTestFiles: [...excludedTestFiles].sort(),
    excludedDocumentationFiles: [...excludedDocumentationFiles].sort(),
    excludedCommentOnlyFiles: [...excludedCommentOnlyFiles].sort(),
  }
}

function changedLineCount(entry) {
  for (const field of ['additions', 'deletions']) {
    if (!Number.isSafeInteger(entry[field]) || entry[field] < 0) {
      throw new Error(`changed-file ${field} must be a non-negative integer`)
    }
  }
  const changedLines = entry.additions + entry.deletions
  if (!Number.isSafeInteger(changedLines)) throw new Error('changed-file LOC exceeds the safe integer range')
  return changedLines
}

/**
 * Match changed paths and rank owners by their reviewable changed LOC.
 * @param {Array<{prefix: string, owners: string[]}>} rules Ordered ownership rules.
 * @param {Array<{paths: string[], changedLines: number}>} reviewableChanges Reviewable GitHub file records.
 * @returns {{matches: Array<{file: string, changedLines: number, owners: string[]}>, reviewers: Array<{login: string, changedLines: number}>}} Routing plan.
 */
export function planReviewers(rules, reviewableChanges) {
  const matches = []
  const reviewers = new Map()
  for (const change of reviewableChanges) {
    const changeOwners = new Map()
    for (const file of change.paths) {
      let owners = []
      for (const rule of rules) {
        if (file.startsWith(rule.prefix)) owners = rule.owners
      }
      matches.push({ file, changedLines: change.changedLines, owners })
      for (const owner of owners) changeOwners.set(owner.toLowerCase(), owner.slice(1))
    }
    for (const [key, login] of changeOwners) {
      const changedLines = (reviewers.get(key)?.changedLines ?? 0) + change.changedLines
      if (!Number.isSafeInteger(changedLines)) throw new Error(`changed LOC for @${login} exceeds the safe integer range`)
      reviewers.set(key, { login, changedLines })
    }
  }
  return {
    matches: matches.sort((left, right) => left.file.localeCompare(right.file, 'en')),
    reviewers: [...reviewers.values()].sort((left, right) => {
      if (left.changedLines !== right.changedLines) return left.changedLines < right.changedLines ? 1 : -1
      return left.login.localeCompare(right.login, 'en')
    }),
  }
}

/**
 * Create a repository-scoped GitHub JSON API caller.
 * @param {{token: string, apiUrl?: string, fetchImpl?: typeof fetch}} options API dependencies.
 * @returns {(path: string, options?: {method?: string, body?: unknown}) => Promise<unknown>} API caller.
 */
export function createGitHubApi({ token, apiUrl = 'https://api.github.com', fetchImpl = globalThis.fetch }) {
  if (!token) throw new Error('GITHUB_TOKEN is not set')
  if (typeof fetchImpl !== 'function') throw new Error('fetch is unavailable')
  const root = apiUrl.replace(/\/+$/u, '')
  return async (path, { method = 'GET', body } = {}) => {
    const response = await fetchImpl(`${root}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'deepseek-harness-request-review',
        'X-GitHub-Api-Version': API_VERSION,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    if (!response.ok) {
      const responseBody = await response.text()
      throw new Error(`GitHub API ${method} ${path} returned ${response.status}: ${JSON.stringify(responseBody)}`)
    }
    if (response.status === 204) return undefined
    return response.json()
  }
}

/**
 * Fetch the complete pull-request file list or fail before routing a partial list.
 * @param {(path: string, options?: {method?: string, body?: unknown}) => Promise<unknown>} api GitHub API caller.
 * @param {string} repository Owner/name repository identifier.
 * @param {number} pullNumber Pull-request number.
 * @param {number} expectedCount Pull-request changed-file count.
 * @returns {Promise<unknown[]>} Complete changed-file records.
 */
export async function listPullRequestFiles(api, repository, pullNumber, expectedCount) {
  if (!Number.isSafeInteger(expectedCount) || expectedCount < 0) {
    throw new Error('pull request changed_files must be a non-negative integer')
  }
  if (expectedCount > MAX_PULL_REQUEST_FILES) {
    throw new Error(`pull request has ${expectedCount} files; GitHub exposes at most ${MAX_PULL_REQUEST_FILES}`)
  }
  const files = []
  for (let page = 1; files.length < expectedCount; page++) {
    const response = await api(`/repos/${repository}/pulls/${pullNumber}/files?per_page=${PAGE_SIZE}&page=${page}`)
    if (!Array.isArray(response) || response.length === 0) {
      throw new Error(`GitHub returned ${files.length} of ${expectedCount} changed files`)
    }
    files.push(...response)
    if (files.length > expectedCount) {
      throw new Error(`GitHub returned ${files.length} files but the pull request reports ${expectedCount}`)
    }
  }
  return files
}

/**
 * Fetch the complete chronological pull-request review list.
 * @param {(path: string, options?: {method?: string, body?: unknown}) => Promise<unknown>} api GitHub API caller.
 * @param {string} repository Owner/name repository identifier.
 * @param {number} pullNumber Pull-request number.
 * @returns {Promise<unknown[]>} Complete review list within the supported limit.
 */
export async function listPullRequestReviews(api, repository, pullNumber) {
  const reviews = []
  for (let page = 1; ; page++) {
    const response = await api(`/repos/${repository}/pulls/${pullNumber}/reviews?per_page=${PAGE_SIZE}&page=${page}`)
    if (!Array.isArray(response)) throw new Error('pull-request reviews response is not an array')
    reviews.push(...response)
    if (response.length < PAGE_SIZE) return reviews
    if (reviews.length >= MAX_PULL_REQUEST_REVIEWS) {
      throw new Error(`pull-request reviews exceed ${MAX_PULL_REQUEST_REVIEWS} entries`)
    }
  }
}

/**
 * Return users whose latest undismissed decisive review approves the pull request.
 * @param {unknown[]} reviews Chronological GitHub pull-request review records.
 * @returns {string[]} Approved reviewer logins in stable order.
 */
export function approvedReviewerLogins(reviews) {
  const approved = new Map()
  for (const review of reviews) {
    if (!isRecord(review) || !isRecord(review.user) || typeof review.user.login !== 'string') {
      throw new Error('pull-request reviews response contains an invalid reviewer')
    }
    if (typeof review.state !== 'string' || !PULL_REQUEST_REVIEW_STATES.has(review.state)) {
      throw new Error('pull-request reviews response contains an invalid state')
    }
    const key = review.user.login.toLowerCase()
    if (review.state === 'APPROVED') approved.set(key, review.user.login)
    else if (review.state === 'CHANGES_REQUESTED') approved.delete(key)
  }
  return [...approved.values()].sort((left, right) => left.localeCompare(right, 'en'))
}

/**
 * Fetch the pull request timeline used to identify workflow-authored review requests.
 * @param {(path: string, options?: {method?: string, body?: unknown}) => Promise<unknown>} api GitHub API caller.
 * @param {string} repository Owner/name repository identifier.
 * @param {number} pullNumber Pull-request number.
 * @returns {Promise<unknown[]>} Complete timeline event list within the supported limit.
 */
export async function listPullRequestTimeline(api, repository, pullNumber) {
  const events = []
  for (let page = 1; ; page++) {
    const response = await api(`/repos/${repository}/issues/${pullNumber}/timeline?per_page=${PAGE_SIZE}&page=${page}`)
    if (!Array.isArray(response)) throw new Error('pull-request timeline response is not an array')
    events.push(...response)
    if (response.length < PAGE_SIZE) return events
    if (events.length >= MAX_TIMELINE_EVENTS) {
      throw new Error(`pull-request timeline exceeds ${MAX_TIMELINE_EVENTS} events`)
    }
  }
}

/** Return current requested reviewers whose latest request came from this workflow identity. */
function workflowRequestedReviewers(events, requestedReviewers) {
  const requested = new Map(requestedReviewers.map(login => [login.toLowerCase(), login]))
  const latestRequester = new Map()
  for (const event of events) {
    if (!isRecord(event) || event.event !== 'review_requested') continue
    if (!isRecord(event.requested_reviewer) || typeof event.requested_reviewer.login !== 'string') continue
    const key = event.requested_reviewer.login.toLowerCase()
    if (!requested.has(key)) continue
    if (!isRecord(event.review_requester) || typeof event.review_requester.login !== 'string') {
      throw new Error('review-request timeline event has no requester login')
    }
    latestRequester.set(key, event.review_requester.login.toLowerCase())
  }
  return [...requested]
    .filter(([key]) => latestRequester.get(key) === WORKFLOW_REVIEW_REQUESTER)
    .map(([, login]) => login)
}

/** Extract and validate individual logins from GitHub's requested-reviewer response. */
function requestedReviewerLogins(response) {
  if (!isRecord(response) || !Array.isArray(response.users)) {
    throw new Error('requested-reviewers response has no users array')
  }
  return response.users.map((user) => {
    if (!isRecord(user) || typeof user.login !== 'string') {
      throw new Error('requested-reviewers response contains an invalid user')
    }
    return user.login
  })
}

/**
 * Print changed paths, reconcile workflow-authored requests with current
 * ownership, and cancel workflow-authored requests on drafts.
 * @param {{event: unknown, ownershipSource: string, api: (path: string, options?: {method?: string, body?: unknown}) => Promise<unknown>, write?: (line: string) => void}} options Runtime inputs.
 * @returns {Promise<{changedCodeFiles: string[], excludedTestFiles: string[], excludedDocumentationFiles: string[], excludedCommentOnlyFiles: string[], requestedReviewers: string[], cancelledReviewers: string[]}>} Applied routing result.
 */
export async function requestReviews({ event, ownershipSource, api, write = line => process.stdout.write(`${line}\n`) }) {
  const pull = pullRequestFromEvent(event)
  write('This is by automated Angry Turtle Cyborg, not a human')
  const files = await listPullRequestFiles(api, pull.repository, pull.number, pull.changedFileCount)
  const { reviewableChanges, ...classified } = classifyChangedFiles(files)
  const plan = planReviewers(parseOwnership(ownershipSource), reviewableChanges)
  writeList(write, 'Changed code files', classified.changedCodeFiles.map(file => JSON.stringify(file)))
  writeList(write, 'Excluded test files', classified.excludedTestFiles.map(file => JSON.stringify(file)))
  writeList(
    write,
    'Excluded documentation files',
    classified.excludedDocumentationFiles.map(file => JSON.stringify(file)),
  )
  writeList(
    write,
    'Excluded comment-only files',
    classified.excludedCommentOnlyFiles.map(file => JSON.stringify(file)),
  )
  writeList(
    write,
    'Owners by changed file',
    plan.matches.map(({ file, changedLines, owners }) =>
      `${JSON.stringify(file)} (${changedLines} LOC): ${owners.length ? owners.join(' ') : '(none)'}`),
  )
  writeList(
    write,
    'Owner relevance by changed LOC',
    plan.reviewers.map(({ login, changedLines }) => `@${login}: ${changedLines}`),
  )

  const ownerCandidates = plan.reviewers.filter(({ login }) => login.toLowerCase() !== pull.author.toLowerCase())
  if (pull.draft) {
    const existing = await api(`/repos/${pull.repository}/pulls/${pull.number}/requested_reviewers`)
    const requestedReviewers = requestedReviewerLogins(existing)
    const reviewers = requestedReviewers.length === 0
      ? []
      : workflowRequestedReviewers(
          await listPullRequestTimeline(api, pull.repository, pull.number),
          requestedReviewers,
        )
    writeList(write, 'Review requests to cancel', reviewers.map(login => `@${login}`))
    if (reviewers.length === 0) return { ...classified, requestedReviewers: [], cancelledReviewers: [] }

    await api(`/repos/${pull.repository}/pulls/${pull.number}/requested_reviewers`, {
      method: 'DELETE',
      body: { reviewers },
    })
    const requestLabel = reviewers.length === 1 ? 'request' : 'requests'
    write(`Cancelled review ${requestLabel} for ${reviewers.map(login => `@${login}`).join(' ')}.`)
    return { ...classified, requestedReviewers: [], cancelledReviewers: reviewers }
  }

  const approvedReviewerKeys = new Set(
    (ownerCandidates.length === 0
      ? []
      : approvedReviewerLogins(await listPullRequestReviews(api, pull.repository, pull.number)))
      .map(login => login.toLowerCase()),
  )
  const approvedOwners = ownerCandidates.filter(({ login }) => approvedReviewerKeys.has(login.toLowerCase()))
  const candidates = ownerCandidates.filter(({ login }) => !approvedReviewerKeys.has(login.toLowerCase()))
  writeList(write, 'Approved owners omitted from review requests', approvedOwners.map(({ login }) => `@${login}`))

  const existing = await api(`/repos/${pull.repository}/pulls/${pull.number}/requested_reviewers`)
  const currentReviewers = requestedReviewerLogins(existing).sort((left, right) => left.localeCompare(right, 'en'))
  const workflowReviewers = currentReviewers.length === 0
    ? []
    : workflowRequestedReviewers(
        await listPullRequestTimeline(api, pull.repository, pull.number),
        currentReviewers,
      )
  const workflowReviewerKeys = new Set(workflowReviewers.map(login => login.toLowerCase()))
  const manualReviewers = currentReviewers.filter(login => !workflowReviewerKeys.has(login.toLowerCase()))
  let retainedCountedSlots = Math.max(
    0,
    MAX_COUNTED_REQUESTED_REVIEWERS
      - manualReviewers.filter(login => login.toLowerCase() !== UNCOUNTED_REVIEWER).length,
  )
  const retainedWorkflowReviewerKeys = new Set()
  for (const { login } of candidates) {
    const key = login.toLowerCase()
    if (!workflowReviewerKeys.has(key)) continue
    if (key === UNCOUNTED_REVIEWER) retainedWorkflowReviewerKeys.add(key)
    else if (retainedCountedSlots > 0) {
      retainedWorkflowReviewerKeys.add(key)
      retainedCountedSlots--
    }
  }
  const reviewersToCancel = workflowReviewers.filter(
    login => !retainedWorkflowReviewerKeys.has(login.toLowerCase()),
  )
  const cancelledReviewerKeys = new Set(reviewersToCancel.map(login => login.toLowerCase()))
  const remainingReviewers = currentReviewers.filter(login => !cancelledReviewerKeys.has(login.toLowerCase()))
  const alreadyRequested = new Set(remainingReviewers.map(login => login.toLowerCase()))
  const availableSlots = Math.max(
    0,
    MAX_COUNTED_REQUESTED_REVIEWERS
      - remainingReviewers.filter(login => login.toLowerCase() !== UNCOUNTED_REVIEWER).length,
  )
  writeList(write, 'Current individual review requests', currentReviewers.map(login => `@${login}`))
  write(`Available counted review request slots: ${availableSlots}.`)
  const reviewers = candidates
    .filter(({ login }) => !alreadyRequested.has(login.toLowerCase()))
    .slice(0, availableSlots)
    .map(({ login }) => login)
  writeList(write, 'Review requests to cancel', reviewersToCancel.map(login => `@${login}`))
  writeList(write, 'Reviewers to request', reviewers.map(login => `@${login}`))
  if (reviewersToCancel.length > 0) {
    await api(`/repos/${pull.repository}/pulls/${pull.number}/requested_reviewers`, {
      method: 'DELETE',
      body: { reviewers: reviewersToCancel },
    })
    const requestLabel = reviewersToCancel.length === 1 ? 'request' : 'requests'
    write(`Cancelled review ${requestLabel} for ${reviewersToCancel.map(login => `@${login}`).join(' ')}.`)
  }

  if (reviewers.length > 0) {
    await api(`/repos/${pull.repository}/pulls/${pull.number}/requested_reviewers`, {
      method: 'POST',
      body: { reviewers },
    })
    write(`Requested ${reviewers.map(login => `@${login}`).join(' ')}.`)
  }
  return { ...classified, requestedReviewers: reviewers, cancelledReviewers: reviewersToCancel }
}

function pullRequestFromEvent(event) {
  if (!isRecord(event) || !isRecord(event.repository) || typeof event.repository.full_name !== 'string') {
    throw new Error('event has no repository.full_name')
  }
  if (!isRecord(event.pull_request) || !isRecord(event.pull_request.user)) {
    throw new Error('event has no pull_request')
  }
  const { pull_request: pull } = event
  if (!Number.isSafeInteger(pull.number) || pull.number <= 0) throw new Error('pull request has no valid number')
  if (typeof pull.draft !== 'boolean') throw new Error('pull request has no draft flag')
  if (typeof pull.user.login !== 'string' || !pull.user.login) throw new Error('pull request has no author login')
  return {
    repository: event.repository.full_name,
    number: pull.number,
    draft: pull.draft,
    author: pull.user.login,
    changedFileCount: pull.changed_files,
  }
}

function writeList(write, title, entries) {
  write(`${title}:`)
  if (entries.length === 0) write('- (none)')
  else for (const entry of entries) write(`- ${entry}`)
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH
  if (!eventPath) throw new Error('GITHUB_EVENT_PATH is not set')
  const event = JSON.parse(readFileSync(eventPath, 'utf8'))
  const ownershipSource = readFileSync(new URL('CODEOWNERS', import.meta.url), 'utf8')
  const api = createGitHubApi({
    token: process.env.GITHUB_TOKEN ?? '',
    apiUrl: process.env.GITHUB_API_URL,
  })
  await requestReviews({ event, ownershipSource, api })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`request-review failed: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
