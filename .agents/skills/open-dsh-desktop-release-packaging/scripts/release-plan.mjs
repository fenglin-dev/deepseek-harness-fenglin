#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const SCHEMA = 'open-deepseek-harness-desktop/release-plan/v1'
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u
const REPOSITORY = /^[^/\s]+\/[^/\s]+$/u
const SHA = /^[0-9a-f]{40}$/u
const RELEASE_STATE = new Set(['stable', 'prerelease'])
const STATUS = new Set(['pending', 'running', 'succeeded', 'failed', 'verified', 'public', 'not-applicable'])

function usage() {
  console.error('usage: release-plan.mjs <init|validate|get|set|render|show|digest> <plan-file> [...args]')
  process.exit(2)
}

function expectString(value, name, pattern) {
  if (typeof value !== 'string' || value.length === 0 || (pattern !== undefined && !pattern.test(value))) {
    throw new TypeError(`release plan: invalid ${name}`)
  }
  return value
}

function expectStatus(value, name) {
  if (!STATUS.has(value)) throw new TypeError(`release plan: invalid ${name}`)
}

function validate(plan) {
  if (plan === null || typeof plan !== 'object' || Array.isArray(plan)) throw new TypeError('release plan: expected an object')
  if (plan.schema !== SCHEMA) throw new TypeError('release plan: unsupported schema')
  const version = expectString(plan.identity?.version, 'version', VERSION)
  if (plan.identity.tag !== `odsh-v${version}` || plan.identity.title !== `v${version}`) {
    throw new TypeError('release plan: tag and title must derive from the version')
  }
  if (!RELEASE_STATE.has(plan.identity.releaseState)) throw new TypeError('release plan: invalid Release state')
  expectString(plan.repositories?.github, 'GitHub repository', REPOSITORY)
  expectString(plan.repositories?.cnb, 'CNB repository', REPOSITORY)
  expectString(plan.repositories?.runtime, 'runtime repository', REPOSITORY)
  expectString(plan.source?.branch, 'source branch')
  expectString(plan.source?.sha, 'source SHA', SHA)
  if (plan.branches?.release !== `release/${version}` || plan.branches?.packaging !== `fix/windows-packaging-${version}`) {
    throw new TypeError('release plan: release branch names do not match the version')
  }
  expectString(plan.previousRelease?.tag, 'previous public Release tag')
  if (plan.notes?.path !== `.artifacts/release-notes/odsh-v${version}.md`) {
    throw new TypeError('release plan: notes path does not match the version')
  }
  expectStatus(plan.notes?.status, 'notes status')
  if (typeof plan.network?.minimumMibps !== 'number' || !Number.isFinite(plan.network.minimumMibps)
    || plan.network.minimumMibps < 0) throw new TypeError('release plan: invalid download speed floor')
  expectStatus(plan.network?.status, 'network status')
  expectStatus(plan.bundledPlugins?.status, 'bundled plugin status')
  expectStatus(plan.runtimeCatalog?.status, 'runtime catalog status')
  expectStatus(plan.artifacts?.status, 'artifact status')
  for (const platform of ['windows', 'macos', 'linux']) expectStatus(plan.platforms?.[platform]?.status, `${platform} status`)
  expectStatus(plan.publication?.github?.status, 'GitHub publication status')
  expectStatus(plan.publication?.cnb?.status, 'CNB publication status')
  expectString(plan.createdAt, 'created timestamp')
  expectString(plan.updatedAt, 'updated timestamp')
  return plan
}

async function readPlan(path) {
  return validate(JSON.parse(await readFile(path, 'utf8')))
}

async function writePlan(path, plan) {
  validate(plan)
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}`
  await writeFile(temporary, `${JSON.stringify(plan, undefined, 2)}\n`, { mode: 0o600 })
  await rename(temporary, path)
}

function scalar(value) {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value)) return Number(value)
  return value
}

function setPath(root, path, value) {
  const keys = path.split('.')
  if (keys.some(key => key.length === 0 || key === '__proto__' || key === 'prototype' || key === 'constructor')) {
    throw new TypeError(`release plan: invalid property path ${path}`)
  }
  let target = root
  for (const key of keys.slice(0, -1)) {
    const existing = target[key]
    if (existing === undefined) target[key] = {}
    else if (existing === null || typeof existing !== 'object' || Array.isArray(existing)) {
      throw new TypeError(`release plan: ${keys.slice(0, keys.indexOf(key) + 1).join('.')} is not an object`)
    }
    target = target[key]
  }
  target[keys.at(-1)] = value
}

function getPath(root, path) {
  return path.split('.').reduce((value, key) => value?.[key], root)
}

function cell(value) {
  if (value === undefined || value === null || value === '') return '—'
  return String(value).replaceAll('|', '\\|')
}

function render(plan) {
  const rows = [
    ['Windows x64', plan.platforms.windows],
    ['macOS arm64/x64', plan.platforms.macos],
    ['Linux x64', plan.platforms.linux],
  ]
  return `# Current desktop release state

This file is generated from the machine-readable release plan. Do not edit it directly.

## Release identity

- Version: \`${plan.identity.version}\`
- Tag: \`${plan.identity.tag}\`
- Title: \`${plan.identity.title}\`
- Release state: \`${plan.identity.releaseState}\`
- GitHub repository: \`${plan.repositories.github}\`
- CNB repository: \`${plan.repositories.cnb}\`
- Runtime repository: \`${plan.repositories.runtime}\`
- Source: \`${plan.source.branch}\` at \`${plan.source.sha}\`
- Previous public Release: \`${plan.previousRelease.tag}\`
- Release branch: \`${plan.branches.release}\`
- Packaging branch: \`${plan.branches.packaging}\`

## Preparation

| Item | Status | Evidence |
| --- | --- | --- |
| Bilingual notes | ${cell(plan.notes.status)} | ${cell(plan.notes.path)} |
| Network route | ${cell(plan.network.status)} | ${cell(plan.network.route)}; floor ${cell(plan.network.minimumMibps)} MiB/s |
| Bundled plugins | ${cell(plan.bundledPlugins.status)} | ${cell(plan.bundledPlugins.snapshotDigest)} |
| Runtime catalog | ${cell(plan.runtimeCatalog.status)} | ${cell(plan.runtimeCatalog.digest)} |
| Local artifacts | ${cell(plan.artifacts.status)} | ${cell(plan.artifacts.directory)} |

## Platform qualification

| Platform | Status | Run | Source SHA |
| --- | --- | --- | --- |
${rows.map(([name, state]) => `| ${name} | ${cell(state.status)} | ${cell(state.runId)} | ${cell(state.sourceSha)} |`).join('\n')}

## Publication

| Destination | Status | URL or run |
| --- | --- | --- |
| GitHub | ${cell(plan.publication.github.status)} | ${cell(plan.publication.github.url)} |
| CNB | ${cell(plan.publication.cnb.status)} | ${cell(plan.publication.cnb.url ?? plan.publication.cnb.runId)} |

Last updated: \`${plan.updatedAt}\`
`
}

const [, , command, path, ...args] = process.argv
if (command === undefined || path === undefined) usage()

if (command === 'init') {
  const [version, githubRepository, cnbRepository, runtimeRepository, branch, sourceSha, previousTag, releaseState, minimumMibps = '1'] = args
  if ([version, githubRepository, cnbRepository, runtimeRepository, branch, sourceSha, previousTag, releaseState].some(value => value === undefined)) usage()
  const now = new Date().toISOString()
  let existing
  try { existing = await readPlan(path) } catch (error) { if (error?.code !== 'ENOENT') throw error }
  const identity = { version, tag: `odsh-v${version}`, title: `v${version}`, releaseState }
  const source = { branch, sha: sourceSha }
  const repositories = { github: githubRepository, cnb: cnbRepository, runtime: runtimeRepository }
  if (existing !== undefined) {
    const expected = JSON.stringify({ identity, source, repositories, previousTag })
    const actual = JSON.stringify({ identity: existing.identity, source: existing.source, repositories: existing.repositories,
      previousTag: existing.previousRelease.tag })
    if (actual !== expected) throw new Error('release plan identity changed; archive the existing plan before starting another release')
  } else {
    await writePlan(path, {
      schema: SCHEMA,
      identity,
      repositories,
      source,
      branches: { release: `release/${version}`, packaging: `fix/windows-packaging-${version}` },
      previousRelease: { tag: previousTag },
      notes: { path: `.artifacts/release-notes/odsh-v${version}.md`, status: 'pending' },
      network: { minimumMibps: Number(minimumMibps), status: 'pending' },
      bundledPlugins: { status: 'pending' },
      runtimeCatalog: { status: 'pending' },
      platforms: { windows: { status: 'pending' }, macos: { status: 'pending' }, linux: { status: 'pending' } },
      artifacts: { status: 'pending' },
      publication: { github: { status: 'pending' }, cnb: { status: 'pending' } },
      createdAt: now,
      updatedAt: now,
    })
  }
} else if (command === 'validate') {
  await readPlan(path)
} else if (command === 'get') {
  if (args.length !== 1) usage()
  const value = getPath(await readPlan(path), args[0])
  if (value !== undefined) process.stdout.write(typeof value === 'object' ? JSON.stringify(value) : String(value))
} else if (command === 'set') {
  if (args.length === 0 || args.length % 2 !== 0) usage()
  const plan = await readPlan(path)
  for (let index = 0; index < args.length; index += 2) setPath(plan, args[index], scalar(args[index + 1]))
  plan.updatedAt = new Date().toISOString()
  await writePlan(path, plan)
} else if (command === 'render') {
  const plan = await readPlan(path)
  if (args.length > 1) usage()
  const output = render(plan)
  if (args.length === 0) process.stdout.write(output)
  else await writeFile(args[0], output)
} else if (command === 'show') {
  process.stdout.write(`${JSON.stringify(await readPlan(path), undefined, 2)}\n`)
} else if (command === 'digest') {
  const bytes = await readFile(path)
  validate(JSON.parse(bytes.toString('utf8')))
  process.stdout.write(createHash('sha256').update(bytes).digest('hex'))
} else usage()
