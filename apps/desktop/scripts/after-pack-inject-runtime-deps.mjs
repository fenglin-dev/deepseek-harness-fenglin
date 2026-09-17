import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const require = createRequire(import.meta.url)
const here = path.dirname(fileURLToPath(import.meta.url))

/** electron-builder afterPack: ensure dsh-subprocess runtime peers exist in app.asar. */
export default async function afterPack(context) {
  const appOutDir = context.appOutDir
  const asarPath = path.join(appOutDir, 'resources', 'app.asar')
  if (!existsSync(asarPath)) return

  const repoRoot = path.resolve(here, '../../../..')
  const candidates = [
    path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules'),
    path.join(repoRoot, 'apps/desktop/node_modules'),
    path.join(repoRoot, 'node_modules'),
    path.join(appOutDir, 'resources', 'harness/node_modules'),
  ]
  // Prefer monorepo node_modules that actually contain the workspace packages.
  const modulesRoot = candidates.find(root =>
    existsSync(path.join(root, '@deepseek-ai/cordis/package.json'))
    || existsSync(path.join(root, '@deepseek-ai/cordis')),
  )
  const script = path.join(here, 'inject-asar-runtime-deps.cjs')
  const roots = modulesRoot ? [modulesRoot, ...candidates] : candidates
  const unique = [...new Set(roots)]
  for (const root of unique) {
    const result = spawnSync(process.execPath, [script, asarPath, root], {
      encoding: 'utf8',
      stdio: 'inherit',
    })
    if (result.status === 0) return
  }
  throw new Error('desktop: failed to inject dsh-subprocess runtime peers into app.asar')
}
