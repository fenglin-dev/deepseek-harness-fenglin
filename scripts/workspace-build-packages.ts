import { globSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'

/**
 * Resolve build workspace patterns through package manifests.
 *
 * Directory globs alone also match ignored `lib` and `node_modules` residue
 * left behind after a package is removed. Requiring package.json keeps tsdown
 * from treating those stale directories as live packages on long-lived
 * developer and release worktrees.
 */
export function workspaceBuildPackages(root: string, patterns: readonly string[]): string[] {
  const manifests = patterns.flatMap(pattern => globSync(`${pattern}/package.json`, { cwd: root }))
  return [...new Set(manifests.map((manifest) => {
    return relative(root, dirname(resolve(root, manifest))).split(sep).join('/')
  }))].sort()
}
