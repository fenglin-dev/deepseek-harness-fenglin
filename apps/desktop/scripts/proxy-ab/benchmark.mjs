/** Portable pnpm proxy-policy benchmark; no application/Profile or global configuration writes. */
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { parseArgs } from 'node:util'

const directory = dirname(fileURLToPath(import.meta.url))
const proxyKey = /^(?:https?|all)_proxy$/iu

/**
 * Reproduce the old broad route versus the scoped route without patching pnpm.
 * @param {Record<string, string>} base - Isolated base environment.
 * @param {'before' | 'after'} variant - Proxy policy under test, not a client binary version.
 * @param {string} route - Endpoint-derived proxy URL or DIRECT.
 * @returns {Record<string, string>} Independent child environment.
 */
export function policyEnvironment(base, variant, route) {
  const env = { ...base }
  if (route === 'DIRECT' || Object.entries(base).some(([key, value]) => proxyKey.test(key) && value.trim())) return env
  if (variant === 'after') return { ...env, DSH_DESKTOP_CODEX_PROXY: route }
  env.HTTP_PROXY = route
  env.HTTPS_PROXY = route
  const bypassKey = Object.keys(env).find(key => key.toUpperCase() === 'NO_PROXY') ?? 'NO_PROXY'
  env[bypassKey] = [...new Set([...(env[bypassKey] ?? '').split(',').filter(Boolean), '127.0.0.1', 'localhost', '::1'])].join(',')
  return env
}

function median(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

/**
 * Keep failures out of speed claims and report success-rate percentage points separately.
 * @param {Array<{variant: string, cache: string, round: number, success: boolean, elapsedMs: number}>} results - Measured attempts.
 * @returns {object[]} Per-cache metrics with paired-success timing only.
 */
export function summarize(results) {
  return [...new Set(results.map(result => result.cache))].map((cache) => {
    const groups = ['before', 'after'].map((variant) => {
      const attempts = results.filter(result => result.cache === cache && result.variant === variant)
      const successes = attempts.filter(result => result.success)
      return { variant, attempts: attempts.length, successes: successes.length,
        successRate: attempts.length ? successes.length / attempts.length : null,
        successfulMedianMs: median(successes.map(result => result.elapsedMs)) }
    })
    const pairs = results.filter(result => result.cache === cache && result.variant === 'before' && result.success)
      .map(before => [before, results.find(after => after.cache === cache && after.variant === 'after' && after.round === before.round && after.success)])
      .filter(([, after]) => after)
    const oldMedian = median(pairs.map(([before]) => before.elapsedMs))
    const newMedian = median(pairs.map(([, after]) => after.elapsedMs))
    return { cache, groups, successRateGainPercentagePoints: groups.every(group => group.attempts > 0)
      ? (groups[1].successRate - groups[0].successRate) * 100 : null,
      pairedSuccesses: pairs.length, pairedMedianReductionPercent: oldMedian ? (oldMedian - newMedian) / oldMedian * 100 : null }
  })
}

function manifestArchive(manifest) {
  // One fixed regular-file ustar entry, not a general archive writer.
  const body = Buffer.from(JSON.stringify(manifest))
  const header = Buffer.alloc(512)
  header.write('package/package.json', 0)
  for (const [offset, length, value] of [[100, 8, 0o644], [108, 8, 0], [116, 8, 0], [124, 12, body.length], [136, 12, 0]]) {
    header.write(value.toString(8).padStart(length - 1, '0') + '\0', offset)
  }
  header.fill(32, 148, 156)
  header.write('0', 156)
  header.write('ustar\0', 257)
  header.write('00', 263)
  header.write([...header].reduce((sum, value) => sum + value, 0).toString(8).padStart(6, '0') + '\0 ', 148)
  return gzipSync(Buffer.concat([header, body, Buffer.alloc((512 - body.length % 512) % 512 + 1024)]))
}

async function listen(server, host) {
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, host, done) })
  return `http://${host}:${server.address().port}`
}

async function close(server) {
  const closed = new Promise(done => server.close(done))
  server.closeAllConnections()
  await closed
}

async function fixture() {
  const counts = { metadata: 0, archives: 0, proxy: 0 }
  const manifest = { name: '@odsh-proxy-benchmark/fixture', version: '1.0.0' }
  const archive = manifestArchive(manifest)
  let origin
  const registry = createServer((request, response) => {
    if (request.url === '/fixture.tgz') {
      counts.archives++
      response.end(archive)
    } else if (decodeURIComponent(request.url ?? '').toLowerCase() === '/@odsh-proxy-benchmark/fixture') {
      counts.metadata++
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify({ name: manifest.name, 'dist-tags': { latest: manifest.version }, versions: {
        [manifest.version]: { ...manifest, dist: { tarball: `${origin}/fixture.tgz`, integrity: `sha512-${createHash('sha512').update(archive).digest('base64')}` } },
      } }))
    } else {
      response.writeHead(404).end()
    }
  })
  const proxy = createServer((_, response) => { counts.proxy++; response.writeHead(502).end('controlled wrong-route fixture') })
  proxy.on('connect', (_, socket) => { counts.proxy++; socket.end('HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n') })
  try {
    // IPv4-mapped IPv6 remains loopback without matching the old exact bypass entries.
    origin = (await listen(registry, '127.0.0.1')).replace('127.0.0.1', '[::ffff:127.0.0.1]')
    const route = await listen(proxy, '127.0.0.1')
    return { registry: origin, route, counts, manifest, dispose: async () => { await Promise.all([close(registry), close(proxy)]) } }
  } catch (error) {
    await Promise.all([close(registry), close(proxy)])
    throw error
  }
}

function baseEnvironment(root, live) {
  const env = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && (/^(?:path|systemroot|windir|comspec|pathext|lang|lc_all)$/iu.test(key)
      || (live && /^(?:(?:https?|all|no)_proxy|npm_config_(?:https?_proxy|proxy|noproxy|cafile)|node_extra_ca_certs)$/iu.test(key)))) env[key] = value
  }
  return { ...env, HOME: root, USERPROFILE: root, APPDATA: root, LOCALAPPDATA: root,
    TMPDIR: root, TEMP: root, TMP: root, XDG_CONFIG_HOME: root, XDG_CACHE_HOME: root,
    DSH_HOME: join(root, 'dsh-home'), CI: '1', npm_config_userconfig: join(root, 'empty.npmrc'),
    npm_config_globalconfig: join(root, 'empty-global.npmrc'), npm_config_update_notifier: 'false' }
}

/**
 * Execute one script-free Node invocation and wait for close after deadline or cancellation.
 * @param {string} node - Exact runtime executable.
 * @param {string[]} args - Arguments without a shell.
 * @param {string} cwd - Isolated working directory.
 * @param {Record<string, string>} env - Explicit child environment.
 * @param {AbortSignal} signal - Cancellation signal.
 * @param {number} timeoutMs - Deadline for this invocation.
 * @returns {Promise<object>} Independent exit, timeout, cancellation and duration facts.
 */
export async function command(node, args, cwd, env, signal, timeoutMs) {
  const started = performance.now()
  const child = spawn(node, args, { cwd, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  let timedOut = false
  const retain = (chunk) => { output = (output + chunk.toString()).slice(-32768) }
  child.stdout.on('data', retain)
  child.stderr.on('data', retain)
  const kill = () => { child.kill('SIGKILL') }
  const timer = setTimeout(() => { timedOut = true; kill() }, timeoutMs)
  signal.addEventListener('abort', kill, { once: true })
  try {
    if (signal.aborted) kill()
    const exit = await new Promise((done, reject) => {
      child.once('error', reject)
      child.once('close', (exitCode, exitSignal) => done({ exitCode, signal: exitSignal }))
    })
    return { ...exit, timedOut, cancelled: signal.aborted, elapsedMs: Math.round(performance.now() - started), output }
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', kill)
  }
}

async function main() {
  const { values } = parseArgs({ options: {
    mode: { type: 'string', default: 'fixture' }, rounds: { type: 'string', default: '10' },
    cache: { type: 'string', default: 'both' }, node: { type: 'string', default: process.execPath },
    pnpm: { type: 'string', default: resolve(directory, '../../node_modules/pnpm/bin/pnpm.mjs') },
    'system-proxy': { type: 'string', default: 'DIRECT' }, output: { type: 'string', default: resolve('proxy-ab-reports') },
    help: { type: 'boolean', default: false },
  } })
  if (values.help) {
    console.log('node benchmark.mjs [--mode fixture|live] [--rounds 1..30] [--cache cold|warm|both] [--node /path/to/node] [--pnpm /path/to/pnpm.mjs] [--system-proxy http://host:port|DIRECT] [--output directory]\nLive mode downloads only is-number@7.0.0 from npm with scripts disabled. This compares environment policies, not two client builds. See GUIDE.zh.md.')
    return
  }
  const rounds = Number(values.rounds)
  if (!['fixture', 'live'].includes(values.mode) || !['cold', 'warm', 'both'].includes(values.cache)
    || !Number.isInteger(rounds) || rounds < 1 || rounds > 30) throw new Error('Invalid mode, cache, or rounds')
  if (values['system-proxy'] !== 'DIRECT') {
    const proxy = new URL(values['system-proxy'])
    if (!['http:', 'https:', 'socks4:', 'socks5:'].includes(proxy.protocol) || proxy.username || proxy.password
      || proxy.search || proxy.hash || (proxy.pathname && proxy.pathname !== '/')) throw new Error('Use a credential-free proxy origin or DIRECT')
  }
  const node = resolve(values.node)
  const pnpm = resolve(values.pnpm)
  const pnpmSha256 = createHash('sha256').update(await readFile(pnpm)).digest('hex')
  let pnpmImplementationSha256 = null
  for (const filename of ['pnpm.mjs', 'pnpm.cjs']) {
    try {
      pnpmImplementationSha256 = createHash('sha256').update(await readFile(resolve(dirname(pnpm), '../dist', filename))).digest('hex')
      break
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  await mkdir(resolve(values.output), { recursive: true })
  const reportDir = await mkdtemp(join(resolve(values.output), 'run-'))
  const root = await mkdtemp(join(tmpdir(), 'odsh-proxy-ab-'))
  const controller = new AbortController()
  const abort = () => controller.abort()
  process.once('SIGINT', abort)
  process.once('SIGTERM', abort)
  let local
  const report = { schema: 'odsh-proxy-policy-ab/v1', createdAt: new Date().toISOString(), mode: values.mode, stage: 'runtime-probe',
    platform: process.platform, arch: process.arch, pnpmSha256, pnpmImplementationSha256, rounds,
    limitations: 'Environment-policy benchmark, not full Desktop, PAC discovery, Codex, Git, or private-registry validation. No user .npmrc is loaded. Fixture gains are synthetic, not Internet speed gains.',
    results: [], cleanup: false }
  try {
    const env = baseEnvironment(root, values.mode === 'live')
    await writeFile(join(root, 'empty.npmrc'), '')
    await writeFile(join(root, 'empty-global.npmrc'), '')
    for (const [field, args] of [['nodeVersion', ['--version']], ['pnpmVersion', [pnpm, '--version']]]) {
      const result = await command(node, args, root, env, controller.signal, 15000)
      if (result.exitCode !== 0 || result.timedOut || result.cancelled || result.signal) throw new Error('Runtime version probe failed')
      report[field] = result.output.trim().match(/v?\d+\.\d+\.\d+/u)?.[0] ?? 'unknown'
    }
    if (values.mode === 'fixture') { report.stage = 'fixture-setup'; local = await fixture() }
    const manifest = local?.manifest ?? { name: 'is-number', version: '7.0.0' }
    const registry = local?.registry ?? 'https://registry.npmjs.org/'
    const route = local?.route ?? values['system-proxy']
    report.systemRoute = route === 'DIRECT' ? 'direct' : 'proxy (address omitted)'
    report.explicitProxyPresent = Object.entries(env).some(([key, value]) => proxyKey.test(key) && value.trim())
    report.packageManagerProxyEnvironmentPresent = Object.keys(env).some(key => /^npm_config_(?:https?_proxy|proxy)$/iu.test(key))
    report.package = `${manifest.name}@${manifest.version}`
    const caches = values.cache === 'both' ? ['cold', 'warm'] : [values.cache]
    report.expectedAttempts = rounds * caches.length * 2
    async function install(project, store, childEnv) {
      await mkdir(project, { recursive: true })
      await writeFile(join(project, 'package.json'), '{"private":true}')
      const result = await command(node, [pnpm, 'add', report.package, '--ignore-scripts', '--ignore-pnpmfile', '--save-exact',
        `--registry=${registry}`, `--store-dir=${store}`, `--cache-dir=${join(store, 'metadata')}`,
        '--fetch-retries=0', '--fetch-timeout=5000', '--reporter=append-only', '--config.manage-package-manager-versions=false'],
      project, childEnv, controller.signal, 20000)
      let verified = false
      try {
        const installed = JSON.parse(await readFile(join(project, 'node_modules', manifest.name, 'package.json'), 'utf8'))
        verified = installed.name === manifest.name && installed.version === manifest.version
      } catch { /* Missing or invalid installed manifest is independently reported as failure. */ }
      const { output, ...facts } = result
      return { ...facts, success: result.exitCode === 0 && !result.signal && !result.timedOut && !result.cancelled && verified,
        manifestVerified: verified, errorCodes: [...new Set(output.match(/\b(?:ERR_PNPM_[A-Z_0-9]+|UND_ERR_[A-Z_]+|ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN)\b/gu) ?? [])] }
    }
    for (const cache of caches) {
      for (let round = 1; round <= rounds && !controller.signal.aborted; round++) {
        for (const variant of round % 2 ? ['before', 'after'] : ['after', 'before']) {
          if (controller.signal.aborted) break
          const trial = join(root, `${cache}-${round}-${variant}`)
          const store = join(trial, 'store')
          if (cache === 'warm') {
            report.stage = 'warmup'
            const warmup = await install(join(trial, 'warmup'), store, env)
            if (!warmup.success) { report.warmupFailure = warmup; throw new Error('Warm-cache preparation failed; comparison stopped') }
          }
          const countsBefore = { ...local?.counts }
          report.stage = 'measured'
          const result = await install(join(trial, 'measured'), store, policyEnvironment(env, variant, route))
          const requests = local ? Object.fromEntries(Object.entries(local.counts).map(([key, value]) => [key, value - countsBefore[key]])) : undefined
          report.results.push({ cache, round, variant, ...result, ...(requests ? { requests } : {}) })
          console.log(`${cache} ${round}/${rounds} ${variant}: ${result.success ? 'PASS' : 'FAIL'} ${result.elapsedMs} ms ${result.errorCodes.join(',')}`)
        }
      }
    }
  } catch (error) {
    // Raw subprocess/config errors can contain private paths or proxy addresses.
    report.runnerError = controller.signal.aborted ? 'cancelled' : 'setup or execution failed; no raw details retained'
    report.runnerErrorCode = typeof error?.code === 'string' && /^[A-Z_]+$/u.test(error.code) ? error.code : 'UNCLASSIFIED'
    process.exitCode = 1
  } finally {
    try { await local?.dispose(); report.listenersClosed = true }
    catch { report.listenersClosed = false; process.exitCode = 1 }
    try { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); report.cleanup = true }
    catch { report.cleanup = false; process.exitCode = 1; console.error(`Temporary cleanup failed; inspect locally: ${root}`) }
    process.removeListener('SIGINT', abort)
    process.removeListener('SIGTERM', abort)
    report.cancelled = controller.signal.aborted
    report.completed = !report.runnerError && !report.cancelled && report.results.length === report.expectedAttempts
    if (report.cancelled) process.exitCode = 130
    report.summary = summarize(report.results)
    if (local) {
      const cold = report.results.filter(result => result.cache === 'cold')
      report.fixtureVerified = report.completed && cold.length > 0 ? cold.every(result => result.variant === 'before'
        ? !result.success && result.requests.proxy > 0
        : result.success && result.requests.proxy === 0 && result.requests.metadata > 0 && result.requests.archives > 0) : null
      if (report.fixtureVerified === false) process.exitCode = 1
    }
    await writeFile(join(reportDir, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
    const lines = ['# pnpm proxy-policy A/B', '', report.limitations, '', `Mode: ${report.mode}; cleanup: ${report.cleanup}`, '']
    for (const summary of report.summary) {
      lines.push(`## ${summary.cache}`, '')
      for (const group of summary.groups) lines.push(`- ${group.variant}: ${group.successes}/${group.attempts} successful; successful median ${group.successfulMedianMs ?? 'N/A'} ms`)
      lines.push(`- Success-rate gain: ${summary.successRateGainPercentagePoints ?? 'N/A'} percentage points`,
        `- Paired successes: ${summary.pairedSuccesses}; paired median time reduction: ${summary.pairedMedianReductionPercent === null ? 'N/A' : `${summary.pairedMedianReductionPercent.toFixed(2)}%`}`, '')
    }
    await writeFile(join(reportDir, 'summary.md'), lines.join('\n') + '\n', { flag: 'wx', mode: 0o600 })
    console.log(`Report: ${join(reportDir, 'report.json')}`)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch(() => { console.error('Benchmark could not start. Check arguments and runtime paths; run --help.'); process.exitCode = 1 })
}
