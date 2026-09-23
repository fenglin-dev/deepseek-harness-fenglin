/**
 * Reject lockfile entries that bind ordinary npm packages to one interchangeable
 * public registry host instead of relying on their pinned content integrity.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const STANDARD_NPM_REGISTRY_PREFIXES = [
  'https://registry.npmjs.org/',
  'https://registry.npmmirror.com/',
] as const

/**
 * Find remote tarball resolutions that prevent safe registry substitution.
 * @param lockfileText - Text of a pnpm lockfile.
 * @returns Human-readable violations with one-based source lines.
 */
export function collectLockfileRegistryPortabilityViolations(lockfileText: string): string[] {
  const violations: string[] = []
  for (const [index, line] of lockfileText.split('\n').entries()) {
    const tarball = /(?:^|[, {])tarball:\s+([^,}\s]+)/.exec(line)?.[1]
    if (tarball === undefined || !tarball.startsWith('https://')) continue
    const lineNumber = index + 1
    if (!/(?:^|[, {])integrity:\s+[^,}\s]+/.test(line)) {
      violations.push(`line ${String(lineNumber)} records a remote tarball without integrity`)
      continue
    }
    if (STANDARD_NPM_REGISTRY_PREFIXES.some(prefix => tarball.startsWith(prefix))) {
      violations.push(
        `line ${String(lineNumber)} pins a standard npm registry tarball URL (${tarball}); retain integrity and omit tarball`,
      )
    }
  }
  return violations
}

if (import.meta.main) {
  const root = resolve(import.meta.dirname, '..')
  const violations = collectLockfileRegistryPortabilityViolations(readFileSync(resolve(root, 'pnpm-lock.yaml'), 'utf8'))
  if (violations.length > 0) {
    console.error(`verify-lockfile-registry-portability: ${String(violations.length)} violation(s):`)
    for (const violation of violations) console.error(`  ${violation}`)
    process.exitCode = 1
  } else {
    console.log('verify-lockfile-registry-portability: remote tarballs retain integrity without pinning standard npm registry hosts.')
  }
}
