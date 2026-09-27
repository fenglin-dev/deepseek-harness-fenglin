/** Record exact native installer sizes only after their qualification steps pass. */

import { appendFile, stat } from 'node:fs/promises'
import { basename } from 'node:path'
import { pathToFileURL } from 'node:url'

export async function reportPackageSizes(paths, summaryFile) {
  if (paths.length === 0) throw new Error('report-package-sizes: expected installer paths')
  const files = []
  for (const path of paths) {
    const info = await stat(path)
    if (!info.isFile() || info.size === 0) throw new Error(`report-package-sizes: empty or non-file installer ${path}`)
    files.push({ name: basename(path), bytes: info.size })
  }
  for (const file of files) console.log(`${file.name}: ${file.bytes} bytes (${(file.bytes / 1048576).toFixed(1)} MiB)`)
  if (summaryFile) {
    const rows = files.map(file => `| ${file.name} | ${file.bytes} | ${(file.bytes / 1048576).toFixed(1)} |`)
    await appendFile(summaryFile, `\n### Qualified desktop installer sizes\n\n| Installer | Bytes | MiB |\n| --- | ---: | ---: |\n${rows.join('\n')}\n`)
  }
  return files
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await reportPackageSizes(process.argv.slice(2), process.env.GITHUB_STEP_SUMMARY)
}
