/** Build preset dependencies with the packaged runtime; retain only portable, reviewed application state. */
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, open, readFile, readdir, realpath, rename, rm, writeFile, cp } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'
import { basename, delimiter, dirname, join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { parseBundledPluginManifest } from '../lib/bundled-plugin-installer.js'
import { seedBundledPlugin } from '../lib/bundled-plugin-seed.js'
import { deployPrebuiltProfile, readPrebuiltProfile, sealPrebuiltProfile } from '../lib/prebuilt-profile.js'
import { runHarnessInvocation, windowsTaskkillInvocation } from '../lib/harness-invocation.js'
import { HarnessSupervisor } from '../lib/supervisor.js'

async function smokeRelocatedProfile(home, harnessRoot, node, environment) {
  let supervisor
  let timer
  const logPath = join(home, 'qualification.log')
  try {
    const url = await new Promise((resolve, reject) => {
      supervisor = new HarnessSupervisor({
        launch: { command: node, args: [join(harnessRoot, 'lib/bin.js'), 'web', '--host', '127.0.0.1', '--port', '0', '--no-open'], cwd: harnessRoot },
        environment, logPath,
        onReady: resolve, onDiagnosticReady: () => reject(new Error('prebuilt smoke must use the normal Profile')),
        onState: () => {}, onFailure: failure => reject(new Error(failure.message)),
        ...(process.platform === 'win32' ? { terminateProcessTree: async (pid, force) => {
          const invocation = windowsTaskkillInvocation(pid, force, environment)
          await runHarnessInvocation({ command: invocation.command, args: [...invocation.args], environment }, {
            kind: 'prebuilt-smoke-stop', timeoutMs: 10_000, signal: new AbortController().signal, acceptedExitCodes: [0, 128],
          })
        } } : {}),
      })
      timer = setTimeout(() => reject(new Error('prebuilt relocated Harness readiness timed out')), 180_000)
      supervisor.start()
    })
    const exchange = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15_000) })
    const cookie = exchange.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
    const response = exchange.status >= 300 && exchange.status < 400
      ? await fetch(new URL('/', url), { headers: { cookie }, signal: AbortSignal.timeout(15_000) })
      : exchange
    if (!response.ok) throw new Error(`prebuilt relocated client returned HTTP ${response.status}`)
    await response.arrayBuffer()
    console.log('prebuilt-profile: relocated normal Harness and client HTTP passed')
  } catch (error) {
    let detail = ''
    try {
      const log = await readFile(logPath, 'utf8')
      detail = log.slice(-8_000).replace(/([?&]token=)[^&\s]+/gu, '$1[redacted]')
    } catch {}
    throw new Error(`prebuilt relocated smoke failed: ${error instanceof Error ? error.message : String(error)}${detail ? `\n--- qualification.log tail ---\n${detail}` : ''}`, { cause: error })
  } finally {
    clearTimeout(timer)
    await supervisor?.stop()
  }
}

async function signNativeResources(root, run) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) await signNativeResources(path, run)
    else if (entry.isFile()) {
      const file = await open(path, 'r')
      const magic = Buffer.alloc(4)
      try { await file.read(magic, 0, 4, 0) } finally { await file.close() }
      if (['cffaedfe', 'cefaedfe', 'feedfacf', 'feedface', 'cafebabe', 'bebafeca'].includes(magic.toString('hex'))) {
        await run('/usr/bin/codesign', ['--force', '--sign', '-', '--timestamp=none', path])
        await run('/usr/bin/codesign', ['--verify', '--strict', path])
      }
    }
  }
}

/** Keep the native terminal payload that can execute on the packaged target. */
export async function pruneForeignNodePtyPrebuilds(home, target) {
  if (!/^(?:darwin-(?:arm64|x64)|linux-x64|win32-x64)$/u.test(target)) {
    throw new Error(`invalid prebuilt target ${target}`)
  }
  const packageRoot = join(home, 'profiles/web/node_modules/node-pty')
  let prebuilds
  try { prebuilds = join(await realpath(packageRoot), 'prebuilds') } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }
  for (const entry of await readdir(prebuilds, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== target) {
      await rm(join(prebuilds, entry.name), { recursive: true, force: true })
    }
  }
  const conpty = join(await realpath(packageRoot), 'third_party/conpty')
  if (!target.startsWith('win32-')) {
    await rm(conpty, { recursive: true, force: true })
    return
  }
  const windowsTarget = `win10-${target.slice('win32-'.length)}`
  let versions
  try { versions = await readdir(conpty, { withFileTypes: true }) } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }
  for (const version of versions) {
    if (!version.isDirectory()) continue
    const directory = join(conpty, version.name)
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== windowsTarget) {
        await rm(join(directory, entry.name), { recursive: true, force: true })
      }
    }
  }
}

/** Build scripts provide a bounded child runner and the platform's packaged executables. */
export async function preparePrebuiltProfile({ destination: published, harnessRoot, node, pnpm, resources, target, nodeVersion, pnpmVersion, run }) {
  if (!/^desktop-prebuilt-(?:darwin-(?:arm64|x64)|linux-x64|win32-x64)$/u.test(basename(published))) throw new Error('invalid prebuilt output directory')
  const destination = await mkdtemp(join(dirname(published), 'prebuilt-build-'))
  const source = await readFile(join(resources, 'manifest.json'), 'utf8')
  const manifest = parseBundledPluginManifest(JSON.parse(source))
  const runtime = JSON.parse(await readFile(join(harnessRoot, 'package.json'), 'utf8'))
  const cleanEnvironment = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/KEY|SECRET|TOKEN|PASSWORD|^DSH_/iu.test(name)))
  const environment = home => ({ ...cleanEnvironment, DSH_HOME: home, DSH_PNPM_BIN: pnpm,
    DSH_PLUGIN_SNAPSHOT_BATCH: '1', DSH_DESKTOP_BUNDLED_PLUGINS_DIR: resources,
    PATH: `${join(node, '..')}${delimiter}${process.env.PATH ?? ''}` })
  const command = (home, args) => runHarnessInvocation({ command: node,
    args: [join(harnessRoot, 'lib/bin.js'), 'plugin', '--profile', 'web', ...args], environment: environment(home), cwd: harnessRoot,
  }, { kind: 'prebuilt-profile-prepare', timeoutMs: 20 * 60_000, signal: new AbortController().signal })
  for (const entry of manifest.plugins.filter(entry => entry.installPolicy === 'startup')) {
    await seedBundledPlugin({ entry, resourcesDirectory: resources, dshHome: destination,
      prepare: async () => { for (const name of entry.approvedBuilds ?? []) await command(destination, ['approve-build', name]) },
      install: archive => command(destination, ['add', '--save-exact', archive]),
    })
  }
  await pruneForeignNodePtyPrebuilds(destination, target)
  const workspace = parseYaml(await readFile(join(destination, 'profiles/web/pnpm-workspace.yaml'), 'utf8'))
  // Never deliver package-manager stores, logs, locks, snapshots, or user settings.
  for (const name of await readdir(destination)) {
    if (!['profiles', 'bundled-plugins', '.agent-presets'].includes(name)) {
      await rm(join(destination, name), { recursive: true, force: true })
    }
  }
  for (const name of await readdir(join(destination, 'profiles'))) {
    if (name !== 'web') await rm(join(destination, 'profiles', name), { recursive: true, force: true })
  }
  await rm(join(destination, 'profiles/web/cordis.patch.yml'), { force: true })
  // Fenglin: enable LiangShen lever + SSH row. Pet UI stays available;
  // default OFF is settings.yaml `pet.enabled`, not a Loader disable.
  await writeFile(join(destination, 'profiles', 'web', 'cordis.patch.yml'), `# Fenglin exclusive defaults on clean upstream.
- insert:
    - id: ui-attachment
      name: "@deepseek-ai/dsh-client-ui-attachment"
    - id: file-upload
      name: "@deepseek-ai/dsh-client-file-upload"
    - id: liangshen
      name: "@linxin666/dsh-liangshen"
    - id: web-ui-liangshen
      name: "@linxin666/dsh-web-all/liangshen"
      config:
        plugin: "@linxin666/dsh-liangshen"

- id: web-ui-liangshen
  name: "@linxin666/dsh-web-all/liangshen"
  config:
    plugin: "@linxin666/dsh-liangshen"
  disabled: false

- id: liangshen
  name: "@linxin666/dsh-liangshen"
  disabled: false

- id: web-ui-ssh
  name: "@linxin666/dsh-web-all/ssh"
  config:
    plugin: "@linxin666/dsh-ssh"
  disabled: false

# Desktop Web GUI needs host pluginManager for market install/uninstall.
- id: plugin-manager
  name: "@deepseek-ai/dsh-plugin-manager"
  disabled: false

- id: "@linxin666/dsh-web-all"
  name: "@linxin666/dsh-web-all"
  disabled: false

- id: web-ui-compat
  name: "@linxin666/dsh-web-all"
  disabled: false

- id: web-ui-task-board
  name: "@linxin666/dsh-web-all/task-board"
  config:
    plugin: "@linxin666/dsh-client-ui-task-board"
  disabled: false

- id: web-ui-skill-explorer
  name: "@linxin666/dsh-web-all/skill-explorer"
  config:
    plugin: "@linxin666/dsh-client-ui-skill-explorer"
  disabled: false

- id: web-ui-skin-center
  name: "@linxin666/dsh-web-all/skin-center"
  disabled: false

# Better Sidebar bottom workbench — official singleton owns dsh-better-sidebar.
- id: better-sidebar
  name: "dsh-better-sidebar"
  disabled: false

- id: web-ui-better-sidebar
  name: "dsh-better-sidebar"
  disabled: true

- id: mkt-music
  disabled: true
`)
  // Market hot-mount of bundled music fails loader lifecycle; keep official music row only.
  await mkdir(join(destination, 'profiles', 'web', '.dsh-market'), { recursive: true })
  await writeFile(join(destination, 'profiles', 'web', '.dsh-market', 'hot-1.yml'), `- id: 'mkt-music'
  name: 'file:///__DSH_HOME__/profiles/web/node_modules/dsh-music-huazai/lib/index.js'
  disabled: true
`)
  await writeFile(join(destination, 'profiles', 'web', '.dsh-market', 'state.json'), `{"disabled":["mkt-music"],"groups":{},"groupOrder":[],"region":"china","regionAuto":true}
`)
  await writeFile(join(destination, 'settings.yaml'), `ui-onboarding:
  welcomeNoticeVersion: 2026-08-19.1
pet:
  enabled: false
  decorationEnabled: false
  visible: false
dsh-better-sidebar:
  autoOpenSubagent: false
  autoOpenJobs: false
  bottomPanelAutoTerminal: false
`)
  // Desktop launch uses --patch on this file so UI rows stay available after
  // user/plugin-manager edits to cordis.patch.yml.
  await writeFile(join(destination, 'fenglin-ui-guard.yml'), await readFile(join(dirname(fileURLToPath(import.meta.url)), '..', 'bundled-plugins', 'fenglin-fixes', 'fenglin-ui-guard.yml'), 'utf8'))
  // Clear leftover blocked health rows so diagnostics stay quiet after first boot.
  await mkdir(join(destination, 'profile-health'), { recursive: true })
  await writeFile(join(destination, 'profile-health', 'web.json'), '{"schema":"dsh/profile-dependency-repair/v1","diagnosticSchema":"dsh/profile-diagnostic/v2","profile":"web","status":"repaired","conflicts":[],"quarantined":[],"diagnostic":null,"issues":[]}')
  // Ship a health-checked LiangShen preset and a lever client that can switch.
  const fenglinFixes = join(dirname(fileURLToPath(import.meta.url)), '..', 'bundled-plugins', 'fenglin-fixes')
  const presetDir = join(destination, '.agent-presets', 'liangshen')
  const presetSource = join(fenglinFixes, 'liangshen-agent.cordis.yml')
  if (existsSync(presetSource)) {
    await mkdir(presetDir, { recursive: true })
    const pluginPreset = join(destination, 'profiles', 'web', 'node_modules', '@linxin666', 'dsh-liangshen', 'presets', 'liangshen')
    if (existsSync(pluginPreset)) {
      for (const name of await readdir(pluginPreset)) {
        await cp(join(pluginPreset, name), join(presetDir, name), { recursive: true, force: true })
      }
    }
    await cp(presetSource, join(presetDir, 'agent.cordis.yml'), { force: true })
  }
  const leverClient = join(fenglinFixes, 'liangshen-client.js')
  const leverTarget = join(destination, 'profiles', 'web', 'node_modules', '@linxin666', 'dsh-liangshen', 'lib', 'client.js')
  if (existsSync(leverClient) && existsSync(dirname(leverTarget))) {
    await cp(leverClient, leverTarget, { force: true })
  }
  // Fenglin runtime libs: copy the live-verified patched bundles over extracted
  // profile packages so the Windows installer matches the tested local build.
  const runtimeLibs = join(fenglinFixes, 'runtime-libs')
  const runtimeCopies = [
    ['dsh-better-sidebar/lib/client.js', 'dsh-better-sidebar/lib/client.js'],
    ['dsh-better-sidebar/lib/client-terminal.js', 'dsh-better-sidebar/lib/client-terminal.js'],
    ['dsh-better-sidebar/lib/index.js', 'dsh-better-sidebar/lib/index.js'],
    ['dshmarket/lib/hot.js', 'dshmarket/lib/hot.js'],
    ['@linxin666/dsh-web-all/lib/client.js', 'dsh-web-all/lib/client.js'],
  ]
  for (const [from, to] of runtimeCopies) {
    const src = join(runtimeLibs, from)
    const dest = join(destination, 'profiles', 'web', 'node_modules', ...to.split('/'))
    if (existsSync(src) && existsSync(dirname(dest))) await cp(src, dest, { force: true })
  }
  // web-all ships its own lever; keep it from dual-mounting the same slot id.
  const { patchWebAllLiangShenClient } = await import(join(fenglinFixes, 'patch-web-all-liangshen-client.mjs'))
  const webAllClient = join(destination, 'profiles', 'web', 'node_modules', '@linxin666', 'dsh-web-all', 'lib', 'client.js')
  await patchWebAllLiangShenClient(webAllClient)
  // Better Sidebar: real session ids for terminal WS + skill entry UI ensure.
  const { patchBetterSidebarClient } = await import(join(fenglinFixes, 'patch-better-sidebar-client.mjs'))
  const betterSidebarRoot = join(destination, 'profiles', 'web', 'node_modules', 'dsh-better-sidebar')
  await patchBetterSidebarClient(betterSidebarRoot)
  // Only patch web-all client.js for lever visibility. Never rewrite the
  // plugin-bundle cordis.patch.yml — user-layer profiles/web/cordis.patch.yml
  // owns pet-off / liangshen-on overrides after bundle layers apply.
  // Seal after native signing. Builder must not rewrite these checksummed data resources.
  if (target.startsWith('darwin-')) await signNativeResources(destination, run)
  const sealed = await sealPrebuiltProfile(destination, {
    target, nodeVersion, pnpmVersion, runtimeVersion: runtime.version,
    pluginManifestSha256: createHash('sha256').update(source).digest('hex'),
  }, workspace?.allowBuilds ?? {}, harnessRoot)
  const verified = await readPrebuiltProfile(destination)
  if (verified === undefined) throw new Error('prebuilt Profile manifest was not written')
  const relocated = `${destination} relocated smoke`
  await mkdir(relocated, { recursive: true })
  try {
    await deployPrebuiltProfile(destination, relocated, verified, new AbortController().signal, () => {})
    await command(relocated, ['doctor'])
    await smokeRelocatedProfile(relocated, harnessRoot, node, environment(relocated))
    // Exercise the installed dependency graph without accessing a registry.
    const removable = manifest.plugins.find(entry => entry.installPolicy === 'startup')
    if (removable === undefined) throw new Error('prebuilt Profile has no startup plugins')
    await command(relocated, ['remove', removable.packageName, '--config.offline=true'])
  } finally {
    await rm(relocated, { recursive: true, force: true })
  }
  await rm(published, { recursive: true, force: true })
  await rename(destination, published)
  console.log(`prebuilt-profile: ${sealed.fingerprint}; ${sealed.files.length} resources verified after relocation`)
}
