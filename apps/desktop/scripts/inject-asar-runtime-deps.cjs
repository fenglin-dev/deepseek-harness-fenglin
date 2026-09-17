/**
 * Inject workspace runtime peers into a packaged Electron app.asar.
 * New packages live under app.asar.unpacked; packed file offsets stay valid
 * because asar offsets are relative to the end of the header.
 */
const fs = require('node:fs')
const path = require('node:path')

const asarPath = process.argv[2]
const modulesRoot = process.argv[3]
if (!asarPath || !modulesRoot) {
  console.error('usage: inject-asar-runtime-deps.js <app.asar> <node_modules-or-harness-modules>')
  process.exit(2)
}

const packages = [
  '@deepseek-ai/cordis',
  '@deepseek-ai/cosmokit',
  '@deepseek-ai/dsh-http-proxy',
  '@standard-schema/spec',
  'undici',
]

function readAsar(buf) {
  const headerPickleSize = buf.readUInt32LE(4)
  const headerPickle = buf.subarray(8, 8 + headerPickleSize)
  const stringSize = headerPickle.readUInt32LE(4)
  const headerJson = headerPickle.subarray(8, 8 + stringSize).toString('utf8')
  return {
    header: JSON.parse(headerJson),
    headerPickleSize,
    bodyOffset: 8 + headerPickleSize,
  }
}

function writeHeaderPickle(header) {
  const json = Buffer.from(JSON.stringify(header), 'utf8')
  const payloadSize = 4 + json.length
  const paddedPayload = Math.ceil(payloadSize / 4) * 4
  const pickle = Buffer.alloc(4 + paddedPayload)
  pickle.writeUInt32LE(paddedPayload, 0)
  pickle.writeUInt32LE(json.length, 4)
  json.copy(pickle, 8)
  return pickle
}

function buildUnpackedNode(diskRoot) {
  const node = { unpacked: true, files: {} }
  const walk = (rel, into) => {
    const abs = path.join(diskRoot, rel)
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        into.files[entry.name] = { files: {} }
        walk(childRel, into.files[entry.name])
      } else if (entry.isFile()) {
        into.files[entry.name] = { size: fs.statSync(path.join(diskRoot, childRel)).size }
      }
    }
  }
  walk('', node)
  return node
}

function setNested(filesRoot, packageName, node) {
  const parts = packageName.split('/')
  let cursor = { files: filesRoot }
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i]
    if (!cursor.files[part] || !cursor.files[part].files) cursor.files[part] = { files: {} }
    cursor = cursor.files[part]
  }
  cursor.files[parts.at(-1)] = node
}

function resolvePackageRoot(name) {
  const direct = path.join(modulesRoot, name)
  if (fs.existsSync(path.join(direct, 'package.json'))) return direct
  return null
}

const raw = fs.readFileSync(asarPath)
const { header, bodyOffset } = readAsar(raw)
if (!header.files) header.files = {}
if (!header.files['node_modules']) header.files['node_modules'] = { files: {} }
if (!header.files['node_modules'].files) header.files['node_modules'].files = {}

const unpackedRoot = `${asarPath}.unpacked`
fs.mkdirSync(path.join(unpackedRoot, 'node_modules'), { recursive: true })

const injected = []
for (const name of packages) {
  const existing = header.files['node_modules'].files
  const parts = name.split('/')
  let cursor = existing
  let present = true
  for (const part of parts) {
    if (!cursor[part]) { present = false; break }
    cursor = cursor[part].files || {}
    if (part === parts.at(-1)) break
  }
  if (present && cursor) {
    // already referenced in header
  }
  const diskRoot = resolvePackageRoot(name)
  if (!diskRoot) {
    console.warn(`skip missing ${name} under ${modulesRoot}`)
    continue
  }
  const target = path.join(unpackedRoot, 'node_modules', name)
  fs.rmSync(target, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.cpSync(diskRoot, target, { recursive: true, dereference: true })
  setNested(header.files['node_modules'].files, name, buildUnpackedNode(diskRoot))
  injected.push(name)
}

const body = raw.subarray(bodyOffset)
const pickle = writeHeaderPickle(header)
const sizeBuf = Buffer.alloc(8)
sizeBuf.writeUInt32LE(0, 0)
sizeBuf.writeUInt32LE(pickle.length, 4)
fs.writeFileSync(asarPath, Buffer.concat([sizeBuf, pickle, body]))
console.log(JSON.stringify({
  asarPath,
  injected,
  unpackedRoot,
  headerPickle: pickle.length,
  bodyBytes: body.length,
}, null, 2))
