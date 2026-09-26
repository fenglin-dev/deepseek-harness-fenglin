
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { SourceTextModule } from 'node:vm'
import { join } from 'node:path'

function walk(dir, out = []) {
  let names
  try { names = readdirSync(dir) } catch { return out }
  for (const name of names) {
    if (name === 'node_modules') continue
    const p = join(dir, name)
    try {
      if (statSync(p).isDirectory()) walk(p, out)
      else if (p.endsWith('.js') || p.endsWith('.mjs')) out.push(p)
    } catch {}
  }
  return out
}

const files = []
for (const dir of process.argv.slice(2)) walk(dir, files)
let bad = 0
for (const f of files) {
  try {
    const src = readFileSync(f, 'utf8')
    new SourceTextModule(src, { identifier: f })
  } catch (e) {
    bad++
    console.log('BAD', f)
    console.log(String(e).slice(0, 300))
  }
}
console.log('checked', files.length, 'bad', bad)
