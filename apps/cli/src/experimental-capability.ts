/** Guarded Profile composition for Desktop-owned experimental capability recipes. */
import { randomUUID } from 'node:crypto'
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { delimiter, dirname, join, win32 } from 'node:path'
import { loadOptionalPatches, resolveProfileDir } from '@deepseek-ai/dsh-app-boot'

export type ExperimentalCapabilityRecipe =
  | 'browser-use-playwright-visible'
  | 'browser-use-devtools-visible'
  | 'computer-use-native'
  | 'computer-use-mcp'

interface Recipe {
  readonly owner: 'browser-use' | 'computer-use'
  readonly yaml: string
}

export interface ChromiumDiscoveryOptions {
  readonly platform?: NodeJS.Platform
  readonly env?: Readonly<Record<string, string | undefined>>
  readonly exists?: (filename: string) => boolean
}

/**
 * Locate an already-installed system Chrome or Chromium without downloading a browser runtime.
 * @param options - Optional platform, environment, and filesystem observations used during discovery.
 * @returns Absolute executable path selected for the browser provider.
 * @throws When no supported executable exists in an explicit or standard location.
 */
export function resolveSystemChromiumExecutable(options: ChromiumDiscoveryOptions = {}): string {
  const platform = options.platform ?? process.platform
  const env = options.env ?? process.env
  const exists = options.exists ?? existsSync
  const explicit = env.CHROME_PATH?.trim()
  const candidates: string[] = explicit === undefined || explicit === '' ? [] : [explicit]

  if (platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    )
    if (env.HOME !== undefined) {
      candidates.push(
        join(env.HOME, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
        join(env.HOME, 'Applications/Chromium.app/Contents/MacOS/Chromium'),
      )
    }
  } else if (platform === 'win32') {
    for (const root of [env.LOCALAPPDATA, env.PROGRAMFILES, env['PROGRAMFILES(X86)']]) {
      if (root !== undefined) candidates.push(win32.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'))
    }
  } else if (platform === 'linux') {
    const pathDelimiter = platform === process.platform ? delimiter : ':'
    const directories = (env.PATH ?? '').split(pathDelimiter).filter(Boolean)
    for (const directory of directories) {
      for (const executable of ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser']) {
        candidates.push(join(directory, executable))
      }
    }
    candidates.push('/snap/bin/chromium')
  }

  const executable = candidates.find(candidate => exists(candidate))
  if (executable !== undefined) return executable
  throw new Error('dsh: no system Chrome or Chromium installation was found; install one or set CHROME_PATH')
}

function browserRecipe(provider: string, discovery: ChromiumDiscoveryOptions): Recipe {
  const executablePath = resolveSystemChromiumExecutable(discovery)
  return {
    owner: 'browser-use',
    yaml: [
      '- insert:',
      '    - id: community-desktop.experimental.browser-use',
      "      name: '@deepseek-ai/dsh-browser-use'",
      '    - id: community-desktop.experimental.browser-use-provider',
      `      name: '${provider}'`,
      '      config:',
      '        mode: launch',
      '        headless: false',
      `        executablePath: ${JSON.stringify(executablePath)}`,
    ].join('\n'),
  }
}

const RECIPES = {
  'computer-use-native': {
    owner: 'computer-use',
    yaml: [
      '- insert:',
      '    - id: community-desktop.experimental.computer-use',
      "      name: '@deepseek-ai/dsh-computer-use'",
      '    - id: community-desktop.experimental.computer-use-provider',
      "      name: '@deepseek-ai/dsh-experimental-computer-use-cua-driver-native'",
    ].join('\n'),
  },
  'computer-use-mcp': {
    owner: 'computer-use',
    yaml: [
      '- insert:',
      '    - id: community-desktop.experimental.computer-use',
      "      name: '@deepseek-ai/dsh-computer-use'",
      '    - id: community-desktop.experimental.computer-use-provider',
      "      name: '@deepseek-ai/dsh-experimental-computer-use-cua-driver-mcp'",
      '      config:',
      '        command: cua-driver',
      '        args: [mcp]',
    ].join('\n'),
  },
} as const satisfies Record<Exclude<ExperimentalCapabilityRecipe, 'browser-use-playwright-visible' | 'browser-use-devtools-visible'>, Recipe>

function resolveRecipe(recipeId: ExperimentalCapabilityRecipe, discovery: ChromiumDiscoveryOptions): Recipe {
  if (recipeId === 'browser-use-playwright-visible') {
    return browserRecipe('@deepseek-ai/dsh-experimental-browser-use-playwright-mcp', discovery)
  }
  if (recipeId === 'browser-use-devtools-visible') {
    return browserRecipe('@deepseek-ai/dsh-experimental-browser-use-chrome-devtools-mcp', discovery)
  }
  const recipe = (RECIPES as Partial<Record<string, Recipe>>)[recipeId]
  if (recipe === undefined) throw new Error('dsh: unsupported experimental capability recipe')
  return recipe
}

function replaceOwnedBlock(text: string, recipe: Recipe): string {
  const start = `# BEGIN community-desktop:${recipe.owner}`
  const end = `# END community-desktop:${recipe.owner}`
  const startIndex = text.indexOf(start)
  const endIndex = text.indexOf(end)
  if ((startIndex < 0) !== (endIndex < 0) || (startIndex >= 0 && endIndex < startIndex)) {
    throw new Error(`dsh: malformed community Desktop ${recipe.owner} composition block`)
  }
  const block = `${start}\n${recipe.yaml}\n${end}`
  if (startIndex < 0) {
    const base = text.replace(/(?:^|\n)\s*\[\]\s*$/u, '').trimEnd()
    return `${base}${base === '' ? '' : '\n\n'}${block}\n`
  }
  return `${text.slice(0, startIndex)}${block}${text.slice(endIndex + end.length)}`
}

function writeAtomic(filename: string, content: string): void {
  mkdirSync(dirname(filename), { recursive: true, mode: 0o700 })
  const temporary = `${filename}.${randomUUID()}.tmp`
  const descriptor = openSync(temporary, 'wx', 0o600)
  let open = true
  try {
    writeFileSync(descriptor, content)
    fsyncSync(descriptor)
    closeSync(descriptor)
    open = false
    renameSync(temporary, filename)
  } catch (error) {
    if (open) closeSync(descriptor)
    rmSync(temporary, { force: true })
    throw error
  }
}

/**
 * Replace only a community-owned capability block while preserving unrelated user YAML and comments.
 * @param profile - Profile whose patch receives the capability block.
 * @param recipeId - Closed Desktop recipe to compose.
 * @param browserDiscovery - Optional browser observations used by launch recipes.
 * @returns Whether the profile patch changed.
 */
export function configureExperimentalCapability(
  profile: string,
  recipeId: ExperimentalCapabilityRecipe,
  browserDiscovery: ChromiumDiscoveryOptions = {},
): boolean {
  const recipe = resolveRecipe(recipeId, browserDiscovery)
  const filename = join(resolveProfileDir(profile), 'cordis.patch.yml')
  const text = existsSync(filename) ? readFileSync(filename, 'utf8') : '[]\n'
  if (existsSync(filename)) loadOptionalPatches('dsh', filename)
  const after = replaceOwnedBlock(text, recipe)
  if (after === text) return false
  writeAtomic(filename, after)
  loadOptionalPatches('dsh', filename)
  return true
}
