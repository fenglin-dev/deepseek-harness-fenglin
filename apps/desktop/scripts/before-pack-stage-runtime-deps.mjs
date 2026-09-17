import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../../../..')

const peers = [
  ['@deepseek-ai/cordis', 'vendor/cordis'],
  ['@deepseek-ai/cosmokit', 'vendor/cosmokit'],
  ['@deepseek-ai/dsh-http-proxy', 'packages/util/http-proxy'],
]

function findPackageDir(name, hintRel) {
  const candidates = [
    path.join(repoRoot, 'apps/desktop/node_modules', name),
    path.join(repoRoot, 'node_modules', name),
  ]
  if (hintRel) candidates.unshift(path.join(repoRoot, hintRel))
  return candidates.find(dir => fs.existsSync(path.join(dir, 'package.json')))
}

/** electron-builder beforePack: stage workspace peers into desktop node_modules for asar collection. */
export default async function beforePack() {
  const desktopModules = path.join(repoRoot, 'apps/desktop/node_modules/@deepseek-ai')
  fs.mkdirSync(desktopModules, { recursive: true })
  for (const [name, hint] of peers) {
    const src = findPackageDir(name, hint)
    if (!src) {
      console.warn(`desktop beforePack: missing ${name}`)
      continue
    }
    const destParent = name.includes('/')
      ? path.join(repoRoot, 'apps/desktop/node_modules', path.dirname(name))
      : path.join(repoRoot, 'apps/desktop/node_modules')
    const dest = path.join(repoRoot, 'apps/desktop/node_modules', name)
    fs.mkdirSync(destParent, { recursive: true })
    try { fs.rmSync(dest, { recursive: true, force: true }) } catch {}
    fs.cpSync(src, dest, { recursive: true, dereference: true })
    console.log(`desktop beforePack: staged ${name} from ${src}`)
  }
  // undici + schema if present in monorepo
  for (const [name, srcRel] of [
    ['undici', 'node_modules/undici'],
    ['@standard-schema/spec', 'node_modules/@standard-schema/spec'],
  ]) {
    const src = path.join(repoRoot, srcRel)
    if (!fs.existsSync(path.join(src, 'package.json'))) continue
    const dest = path.join(repoRoot, 'apps/desktop/node_modules', name)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    try { fs.rmSync(dest, { recursive: true, force: true }) } catch {}
    fs.cpSync(src, dest, { recursive: true, dereference: true })
    console.log(`desktop beforePack: staged ${name}`)
  }
}
