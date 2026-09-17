import { createSocket } from 'node:dgram'

const SERVICE = '_open-dsh._tcp.local'
const GROUP = '224.0.0.251'
const PORT = 5353
const hostname = (process.env.NAS_HOSTNAME ?? 'harness.local').replace(/\.$/u, '')
const displayName = (process.env.NAS_NAME ?? 'Open DSH NAS').slice(0, 80)
const httpsPort = Number(process.env.HTTPS_PORT ?? '443')
const origin = `https://${hostname}${httpsPort === 443 ? '' : `:${String(httpsPort)}`}`

function name(value) {
  const chunks = value.split('.').map((label) => {
    const bytes = Buffer.from(label)
    if (bytes.length > 63) throw new Error(`mDNS label is too long: ${label}`)
    return Buffer.concat([Buffer.from([bytes.length]), bytes])
  })
  return Buffer.concat([...chunks, Buffer.from([0])])
}

function uint16(value) {
  const bytes = Buffer.allocUnsafe(2)
  bytes.writeUInt16BE(value)
  return bytes
}

function uint32(value) {
  const bytes = Buffer.allocUnsafe(4)
  bytes.writeUInt32BE(value)
  return bytes
}

function record(owner, type, data, ttl = 120) {
  return Buffer.concat([name(owner), uint16(type), uint16(0x8001), uint32(ttl), uint16(data.length), data])
}

function txt(values) {
  return Buffer.concat(values.map((value) => {
    const bytes = Buffer.from(value)
    if (bytes.length > 255) throw new Error('mDNS TXT value is too long')
    return Buffer.concat([Buffer.from([bytes.length]), bytes])
  }))
}

const instance = `Open DSH NAS.${SERVICE}`
const response = Buffer.concat([
  Buffer.from([0, 0, 0x84, 0, 0, 0, 0, 3, 0, 0, 0, 0]),
  record(SERVICE, 12, name(instance)),
  record(instance, 33, Buffer.concat([uint16(0), uint16(0), uint16(httpsPort), name(hostname)])),
  record(instance, 16, txt(['dsh-protocol=1', `url=${origin}`, `name=${displayName}`])),
])
const serviceNeedle = name(SERVICE)
const socket = createSocket({ type: 'udp4', reuseAddr: true })

socket.on('message', (message, remote) => {
  if (message.indexOf(serviceNeedle) < 0) return
  socket.send(response, remote.port, remote.address)
})
socket.on('error', (error) => {
  console.error(`dsh nas mDNS: ${error.message}`)
  process.exitCode = 1
  socket.close()
})
socket.bind(PORT, '0.0.0.0', () => {
  socket.addMembership(GROUP)
  socket.setMulticastTTL(255)
  console.log(`dsh nas mDNS: advertising ${origin} as ${displayName}`)
})
