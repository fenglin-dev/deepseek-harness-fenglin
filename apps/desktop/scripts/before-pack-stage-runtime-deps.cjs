const path = require('node:path')
const fs = require('node:fs')

const repoRoot = path.resolve(__dirname, '../../../..')

function findPackageDir(name, hintRel) {
  const candidates = [
    path.join(repoRoot, 'apps/desktop/node_modules', name),
    path.join(repoRoot, 'node_modules', name),
  ]
  if (hintRel) candidates.unshift(path.join(repoRoot, hintRel))
  return candidates.find(dir => fs.existsSync(path.join(dir, 'package.json')))
}

/** electron-builder beforePack: stage workspace peers into desktop node_modules. */
module.exports = async function beforePack() {
  const peers = [
    ['@deepseek-ai/cordis', 'vendor/cordis'],
    ['@deepseek-ai/cosmokit', 'vendor/cosmokit'],
    ['@deepseek-ai/dsh-http-proxy', 'packages/util/http-proxy'],
  ]
  for (const [name, hint] of peers) {
    const src = findPackageDir(name, hint)
    if (!src) {
      console.warn(`desktop beforePack: missing ${name}`)
      continue
    }
    const dest = path.join(repoRoot, 'apps/desktop/node_modules', name)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    try { fs.rmSync(dest, { recursive: true, force: true }) } catch {}
    fs.cpSync(src, dest, { recursive: true, dereference: true })
    console.log(`desktop beforePack: staged ${name} from ${src}`)
  }
}
