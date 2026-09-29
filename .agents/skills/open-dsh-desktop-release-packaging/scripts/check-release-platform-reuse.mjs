#!/usr/bin/env node

import { execFileSync } from 'node:child_process'

const SHA = /^[0-9a-f]{40}$/u
const PLATFORMS = new Set(['windows', 'macos', 'linux'])
const PLATFORM_ONLY = new Map([
  ['apps/desktop/electron-builder.yml', ['windows']],
  ['apps/desktop/electron-builder.macos.yml', ['macos']],
  ['apps/desktop/electron-builder.linux.yml', ['linux']],
  ['apps/desktop/scripts/prepare-windows-runtime.mjs', ['windows']],
  ['apps/desktop/scripts/prepare-unix-runtime.mjs', ['macos', 'linux']],
  ['apps/desktop/scripts/sign-macos-adhoc.cjs', ['macos']],
  ['apps/desktop/scripts/smoke-windows-package.ps1', ['windows']],
  ['apps/desktop/scripts/smoke-windows-unpacked.mjs', ['windows']],
])

export function affectedPlatforms(path) {
  // Release orchestration code is not copied into any installer.
  if (path.startsWith('.agents/skills/open-dsh-desktop-release-packaging/')) return []
  const explicit = PLATFORM_ONLY.get(path)
  if (explicit !== undefined) return explicit
  // These scripts qualify final macOS artifacts, but electron-builder excludes
  // them from app.asar and extraResources on every target.
  if (/^apps\/desktop\/scripts\/smoke-macos-package(?:\.test)?\.mjs$/u.test(path)) return ['macos']
  return ['windows', 'macos', 'linux']
}

export function checkPlatformReuse(platform, oldSha, sourceSha, run = execFileSync) {
  if (!PLATFORMS.has(platform) || !SHA.test(oldSha) || !SHA.test(sourceSha)) {
    throw new Error('expected a platform and two full Git commit IDs')
  }
  if (oldSha === sourceSha) return { changed: [], affected: [] }
  try {
    run('git', ['merge-base', '--is-ancestor', oldSha, sourceSha], { stdio: 'pipe' })
  } catch {
    throw new Error(`cannot reuse ${platform}: ${oldSha} is not an available ancestor of ${sourceSha}`)
  }
  const changed = run('git', ['diff', '--name-only', '--no-renames', `${oldSha}..${sourceSha}`], { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean)
  const affected = changed.filter(path => affectedPlatforms(path).includes(platform))
  if (affected.length > 0) {
    throw new Error(`cannot reuse ${platform}: source changes affect it: ${affected.join(', ')}`)
  }
  return { changed, affected }
}

if (process.argv[1]?.endsWith('/check-release-platform-reuse.mjs')) {
  const [, , platform, oldSha, sourceSha] = process.argv
  try {
    const result = checkPlatformReuse(platform, oldSha, sourceSha)
    console.log(`release reuse: ${platform} from ${oldSha} is compatible with ${sourceSha} (${result.changed.length} changed paths checked)`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
