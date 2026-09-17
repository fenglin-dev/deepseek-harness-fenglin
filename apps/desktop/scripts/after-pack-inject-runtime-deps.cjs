const path = require('node:path')
const fs = require('node:fs')
const { spawnSync } = require('node:child_process')

const here = __dirname
const repoRoot = path.resolve(here, '../../../..')

/** electron-builder afterPack: ensure dsh-subprocess runtime peers exist in app.asar. */
module.exports = async function afterPack(context) {
  const appOutDir = context.appOutDir
  const asarPath = path.join(appOutDir, 'resources', 'app.asar')
  if (!fs.existsSync(asarPath)) return
  const script = path.join(here, 'inject-asar-runtime-deps.cjs')
  const candidates = [
    path.join(repoRoot, 'apps/desktop/node_modules'),
    path.join(repoRoot, 'node_modules'),
    path.join(appOutDir, 'resources', 'harness/node_modules'),
  ]
  for (const root of candidates) {
    const result = spawnSync(process.execPath, [script, asarPath, root], {
      encoding: 'utf8',
      stdio: 'inherit',
    })
    if (result.status === 0) return
  }
  console.warn('desktop afterPack: runtime peer injection did not find packages; continuing')
}
