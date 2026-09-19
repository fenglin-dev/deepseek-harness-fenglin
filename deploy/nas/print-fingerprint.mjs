import { X509Certificate } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = '/data/caddy/certificates'
const hostname = (process.env.NAS_HOSTNAME ?? 'harness.local').toLowerCase()

async function certificateFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await certificateFiles(path))
    else if (entry.isFile() && entry.name.endsWith('.crt')) files.push(path)
  }
  return files
}

const matchesHostname = certificate => {
  const names = certificate.subjectAltName?.split(',').map(value => value.trim()) ?? []
  return names.some(value => value.toLowerCase() === `dns:${hostname}`)
    || certificate.subject.split('\n').some(value => value.trim().toLowerCase() === `cn=${hostname}`)
}

let certificate
for (const path of await certificateFiles(root)) {
  const candidate = new X509Certificate(await readFile(path))
  if (matchesHostname(candidate)) { certificate = candidate; break }
}
if (certificate === undefined) {
  console.error(`No Caddy leaf certificate found for ${hostname}. Start the HTTPS service first.`)
  process.exitCode = 1
} else {
  console.log(`NAS hostname: ${hostname}`)
  console.log(`TLS SHA-256: ${certificate.fingerprint256}`)
  console.log(`Valid until: ${certificate.validTo}`)
}
