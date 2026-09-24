#!/usr/bin/env node

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const SCHEMA = 'open-deepseek-harness-desktop/package-orchestration/v2'
const LEGACY_SCHEMA = 'open-deepseek-harness-desktop/package-orchestration/v1'
const STAGES = new Set(['windows', 'macos', 'linux', 'download'])

function usage() {
  console.error('usage: release-package-state.mjs <init|get|set|retry|show> <state-file> [...args]')
  process.exit(2)
}

const [, , command, statePath, ...args] = process.argv
if (!command || !statePath) usage()

function validate(state) {
  if (state === null || typeof state !== 'object' || Array.isArray(state) || state.schema !== SCHEMA) {
    throw new Error('release orchestration state uses an unsupported schema')
  }
  for (const key of ['version', 'repository', 'branch', 'sourceSha', 'createdAt', 'updatedAt']) {
    if (typeof state[key] !== 'string' || state[key] === '') throw new Error(`release orchestration state has invalid ${key}`)
  }
  if (state.stages === null || typeof state.stages !== 'object' || Array.isArray(state.stages)) {
    throw new Error('release orchestration state has invalid stages')
  }
  if (Object.keys(state.stages).some(stage => !STAGES.has(stage))) throw new Error('release orchestration state has unknown stages')
  if (state.retries === null || typeof state.retries !== 'object' || Array.isArray(state.retries)) {
    throw new Error('release orchestration state has invalid retry counters')
  }
  for (const [stage, count] of Object.entries(state.retries)) {
    if (!STAGES.has(stage) || !Number.isSafeInteger(count) || count < 0) throw new Error('release orchestration state has invalid retry counter')
  }
  if (!Array.isArray(state.history) || state.history.length > 100) throw new Error('release orchestration state has invalid history')
  return state
}

function migrate(state) {
  if (state?.schema !== LEGACY_SCHEMA) return state
  return { ...state, schema: SCHEMA, retries: {}, history: [], migratedAt: new Date().toISOString() }
}

async function readState() {
  return validate(migrate(JSON.parse(await readFile(statePath, 'utf8'))))
}

async function writeState(state) {
  validate(state)
  await mkdir(dirname(statePath), { recursive: true })
  const temporary = `${statePath}.tmp-${process.pid}-${Date.now()}`
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
  await rename(temporary, statePath)
}

function setPath(state, path, value) {
  const keys = path.split('.')
  if (keys.some(key => key === '' || key === '__proto__' || key === 'prototype' || key === 'constructor')) {
    throw new Error(`invalid release state property ${path}`)
  }
  let target = state
  for (const key of keys.slice(0, -1)) {
    if (target[key] === undefined) target[key] = {}
    if (target[key] === null || typeof target[key] !== 'object' || Array.isArray(target[key])) {
      throw new Error(`release state property ${key} is not an object`)
    }
    target = target[key]
  }
  target[keys.at(-1)] = value
}

if (command === 'init') {
  const [version, repository, branch, sourceSha] = args
  if (!version || !repository || !branch || !sourceSha) usage()
  let state
  try { state = await readState() } catch (error) { if (error?.code !== 'ENOENT') throw error }
  if (state) {
    for (const [key, expected] of Object.entries({ version, repository, branch, sourceSha })) {
      if (state[key] !== expected) {
        throw new Error(`release state ${key} is ${JSON.stringify(state[key])}, expected ${JSON.stringify(expected)}; use --restart to archive it`)
      }
    }
    await writeState(state)
  } else {
    const now = new Date().toISOString()
    await writeState({
      schema: SCHEMA, version, repository, branch, sourceSha,
      createdAt: now, updatedAt: now, stages: {}, retries: {}, history: [],
    })
  }
} else if (command === 'get') {
  if (args.length !== 1) usage()
  const state = await readState()
  const value = args[0].split('.').reduce((current, key) => current?.[key], state)
  if (value !== undefined && value !== null) process.stdout.write(typeof value === 'object' ? JSON.stringify(value) : String(value))
} else if (command === 'set') {
  if (args.length === 0 || args.length % 2 !== 0) usage()
  const state = await readState()
  for (let index = 0; index < args.length; index += 2) setPath(state, args[index], args[index + 1])
  state.updatedAt = new Date().toISOString()
  await writeState(state)
} else if (command === 'retry') {
  if (args.length === 0 || args.some(stage => !STAGES.has(stage))) usage()
  const state = await readState()
  const archivedAt = new Date().toISOString()
  for (const stage of [...new Set(args)]) {
    const previous = state.stages[stage]
    if (previous !== undefined) state.history.push({ stage, previous, archivedAt })
    delete state.stages[stage]
    state.retries[stage] = (state.retries[stage] ?? 0) + 1
  }
  state.history = state.history.slice(-100)
  state.updatedAt = archivedAt
  await writeState(state)
} else if (command === 'show') {
  process.stdout.write(`${JSON.stringify(await readState(), null, 2)}\n`)
} else usage()
