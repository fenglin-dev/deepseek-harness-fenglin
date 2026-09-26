
import { readFileSync } from 'node:fs'
import { SourceTextModule } from 'node:vm'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (p.endsWith('.js')) out.push(p)
  }
  return out
}

const root = process.argv[2]
const files = walk(root)
let bad = 0
for (const f of files) {
  try {
    const src = readFileSync(f, 'utf8')
    new SourceTextModule(src, { identifier: f })
  } catch (e) {
    bad++
    console.log('BAD', f)
    console.log(String(e).slice(0, 400))
  }
}
console.log('checked', files.length, 'bad', bad)
