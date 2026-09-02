import { existsSync, lstatSync, readdirSync } from 'node:fs'
import { basename, join, win32 } from 'node:path'
import type { ShortcutDetails } from 'electron'
import type { IconSurfaceResult } from './icon-protocol.js'

/** Only the current user's Desktop and Start Menu roots may be supplied by main. */
export interface IconShortcutOptions {
  desktop: string
  startMenu: string
  executable: string
  managedDirectory: string
  appId: string
  read(path: string): ShortcutDetails
  write(path: string, operation: 'update' | 'create', options: ShortcutDetails): boolean
}

const canonical = (path: string): string => win32.normalize(path.replace(/^"|"$/g, '')).toLowerCase()

/**
 * Update icon fields on verified shortcuts, preserving every launch field and external icon choice.
 * @param options - Main-process-owned user directories, installation identity, and native shell adapter.
 * @param icon - Generated ICO path or the current executable for the default icon.
 * @param create - Whether the user explicitly requested a missing Desktop shortcut.
 * @returns Per-shortcut outcomes, including skipped external customizations.
 */
export function updateIconShortcuts(options: IconShortcutOptions, icon: string, create = false): IconSurfaceResult[] {
  const results: IconSurfaceResult[] = []
  const ownsTarget = (link: ShortcutDetails): boolean => canonical(link.target) === canonical(options.executable)
    && (!link.appUserModelId || link.appUserModelId === options.appId)
  const ownsIcon = (link: ShortcutDetails): boolean => (link.iconIndex ?? 0) === 0 && (
    !link.icon || canonical(link.icon) === canonical(options.executable)
    || (canonical(win32.dirname(link.icon)) === canonical(options.managedDirectory)
      && /^[a-f0-9]{64}\.ico$/i.test(win32.basename(link.icon))))
  for (const [surface, root] of [['desktop', options.desktop], ['start-menu', options.startMenu]] as const) {
    let matched = 0
    let inspected = 0
    const walk = (directory: string, depth: number): void => {
      if (!existsSync(directory)) return
      const stat = lstatSync(directory)
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('icon.shortcut-directory')
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (++inspected > 2000) throw new Error('icon.shortcut-limit')
        if (entry.isSymbolicLink()) continue
        const path = join(directory, entry.name)
        if (entry.isDirectory() && depth < 4) { walk(path, depth + 1); continue }
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.lnk')) continue
        let link: ShortcutDetails
        try { link = options.read(path) } catch { continue }
        if (!ownsTarget(link)) continue
        matched++
        const name = basename(path).replace(/[\x00-\x1f]/g, '').slice(0, 120)
        if (!ownsIcon(link)) { results.push({ surface, name, status: 'external' }); continue }
        try {
          const updated = options.write(path, 'update', { ...link, icon, iconIndex: 0 })
          results.push({ surface, name, status: updated ? 'applied' : 'unavailable' })
        } catch { results.push({ surface, name, status: 'unavailable' }) }
      }
    }
    try {
      walk(root, 0)
      if (matched === 0) results.push({ surface, status: 'missing' })
    } catch { results.push({ surface, status: 'unavailable' }) }
  }
  if (create) {
    const path = join(options.desktop, 'DeepSeek Harness.lnk')
    try {
      const parent = lstatSync(options.desktop)
      if (!parent.isDirectory() || parent.isSymbolicLink()) throw new Error('icon.shortcut-directory')
      if (existsSync(path)) {
        // Never overwrite an unrelated shortcut or a user's own icon customization.
        if (lstatSync(path).isSymbolicLink() || !ownsTarget(options.read(path)) || !ownsIcon(options.read(path))) {
          results.push({ surface: 'desktop', status: 'external' })
          return results
        }
      } else {
        const success = options.write(path, 'create', {
          target: options.executable, cwd: win32.dirname(options.executable),
          icon, iconIndex: 0, appUserModelId: options.appId, description: 'DeepSeek Harness',
        })
        const missing = results.findIndex(result => result.surface === 'desktop' && result.status === 'missing')
        if (missing >= 0) results.splice(missing, 1)
        results.push({ surface: 'desktop', name: 'DeepSeek Harness.lnk', status: success ? 'applied' : 'unavailable' })
      }
    } catch { results.push({ surface: 'desktop', status: 'unavailable' }) }
  }
  return results
}
