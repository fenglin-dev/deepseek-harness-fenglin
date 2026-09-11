import { createServer, connect } from 'node:net'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DownloadNetworkSettingsStore } from '../src/download-network-settings.ts'
import { startPluginDownloadProxy, type PluginDownloadProxy } from '../src/plugin-download-proxy.ts'

const proxies: PluginDownloadProxy[] = []
afterEach(async () => {
  for (const proxy of proxies.splice(0)) await proxy.close()
})

function store(): DownloadNetworkSettingsStore {
  return new DownloadNetworkSettingsStore(join(mkdtempSync(join(tmpdir(), 'dsh-proxy-')), 'settings.json'), {
    available: () => false,
    encrypt: () => { throw new Error('unavailable') },
    decrypt: () => { throw new Error('unavailable') },
  })
}

function request(proxy: PluginDownloadProxy, authority: string, authorization?: string): Promise<string> {
  const url = new URL(proxy.pluginUrl)
  return new Promise((resolve, reject) => {
    const socket = connect(Number(url.port), url.hostname)
    let response = ''
    socket.on('connect', () => {
      const headers = [`CONNECT ${authority} HTTP/1.1`, `Host: ${authority}`]
      if (authorization !== undefined) headers.push(`Proxy-Authorization: ${authorization}`)
      socket.write(`${headers.join('\r\n')}\r\n\r\n`)
    })
    socket.on('data', (chunk) => {
      response += chunk.toString('utf8')
      if (response.includes('\r\n\r\n')) { socket.destroy(); resolve(response) }
    })
    socket.on('error', reject)
  })
}

describe('desktop plugin download proxy', () => {
  it('rejects requests without its operation credential', async () => {
    const proxy = await startPluginDownloadProxy(store(), {})
    proxies.push(proxy)
    await expect(request(proxy, '127.0.0.1:9')).resolves.toMatch(/^HTTP\/1\.1 407/u)
  })

  it('opens an authenticated direct CONNECT tunnel on loopback', async () => {
    const target = createServer((socket) => { socket.on('error', () => {}); socket.write('fixture'); socket.end() })
    await new Promise<void>((resolve, reject) => {
      target.once('error', reject)
      target.listen(0, '127.0.0.1', () => { target.off('error', reject); resolve() })
    })
    try {
      const address = target.address()
      if (address === null || typeof address === 'string') throw new Error('fixture server unavailable')
      const proxy = await startPluginDownloadProxy(store(), {})
      proxies.push(proxy)
      const credentials = Buffer.from(`${proxy.pluginProxyCredentials.username}:${proxy.pluginProxyCredentials.password}`).toString('base64')
      await expect(request(proxy, `127.0.0.1:${address.port}`, `Basic ${credentials}`)).resolves.toMatch(/^HTTP\/1\.1 200/u)
    } finally {
      await new Promise<void>((resolve) => { target.close(() => { resolve() }) })
    }
  })

  it('keeps each accepted operation on its fixed settings revision and rejects an unknown one', async () => {
    const target = createServer((socket) => { socket.on('error', () => {}); socket.end() })
    await new Promise<void>((resolve, reject) => {
      target.once('error', reject)
      target.listen(0, '127.0.0.1', () => { target.off('error', reject); resolve() })
    })
    try {
      const address = target.address()
      if (address === null || typeof address === 'string') throw new Error('fixture server unavailable')
      const settings = store()
      const proxy = await startPluginDownloadProxy(settings, {})
      proxies.push(proxy)
      const token = proxy.pluginProxyCredentials.password
      const retained = settings.update({ target: 'npm', npm: {
        registry: 'npmjs', proxy: { mode: 'custom', url: 'http://127.0.0.1:9' },
      } })
      settings.update({ target: 'npm', npm: { registry: 'npmjs', proxy: { mode: 'direct' } } })
      const retainedRevision = Buffer.from(`plugins-${retained.revision}:${token}`).toString('base64')
      await expect(request(proxy, `127.0.0.1:${address.port}`, `Basic ${retainedRevision}`))
        .resolves.toMatch(/^HTTP\/1\.1 502/u)
      const currentRevision = Buffer.from(`plugins-${settings.read().revision}:${token}`).toString('base64')
      await expect(request(proxy, `127.0.0.1:${address.port}`, `Basic ${currentRevision}`))
        .resolves.toMatch(/^HTTP\/1\.1 200/u)
      const stale = Buffer.from(`plugins-99:${token}`).toString('base64')
      await expect(request(proxy, `127.0.0.1:${address.port}`, `Basic ${stale}`)).resolves.toMatch(/^HTTP\/1\.1 409/u)
    } finally {
      await new Promise<void>((resolve) => { target.close(() => { resolve() }) })
    }
  })

  it('does not silently connect directly when an npm proxy is unreachable', async () => {
    const target = createServer((socket) => { socket.end() })
    await new Promise<void>((resolve, reject) => {
      target.once('error', reject)
      target.listen(0, '127.0.0.1', () => { target.off('error', reject); resolve() })
    })
    try {
      const address = target.address()
      if (address === null || typeof address === 'string') throw new Error('fixture server unavailable')
      const settings = store()
      settings.update({ target: 'npm', npm: {
        registry: 'npmjs', proxy: { mode: 'custom', url: 'http://127.0.0.1:9' },
      } })
      const proxy = await startPluginDownloadProxy(settings, {})
      proxies.push(proxy)
      const token = proxy.pluginProxyCredentials.password
      const credentials = Buffer.from(`npm:${token}`).toString('base64')
      await expect(request(proxy, `127.0.0.1:${address.port}`, `Basic ${credentials}`))
        .resolves.toMatch(/^HTTP\/1\.1 502/u)
    } finally {
      await new Promise<void>((resolve) => { target.close(() => { resolve() }) })
    }
  })

  it('preserves ALL_PROXY and NO_PROXY semantics for an existing plugin configuration', async () => {
    const target = createServer((socket) => { socket.on('error', () => {}); socket.end() })
    await new Promise<void>((resolve, reject) => {
      target.once('error', reject)
      target.listen(0, '127.0.0.1', () => { target.off('error', reject); resolve() })
    })
    try {
      const address = target.address()
      if (address === null || typeof address === 'string') throw new Error('fixture server unavailable')
      const proxy = await startPluginDownloadProxy(store(), {
        ALL_PROXY: 'http://127.0.0.1:9',
        NO_PROXY: `127.0.0.1:${address.port}`,
      })
      proxies.push(proxy)
      const credentials = Buffer.from(`${proxy.pluginProxyCredentials.username}:${proxy.pluginProxyCredentials.password}`).toString('base64')
      await expect(request(proxy, `127.0.0.1:${address.port}`, `Basic ${credentials}`))
        .resolves.toMatch(/^HTTP\/1\.1 200/u)
    } finally {
      await new Promise<void>((resolve) => { target.close(() => { resolve() }) })
    }
  })
})
