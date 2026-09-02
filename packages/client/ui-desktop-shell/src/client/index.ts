/** Electron-only desktop shell settings and Release notification plugin. */

import type { Context } from '@deepseek-ai/cordis'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { DesktopPreferencesRow } from './DesktopPreferencesRow.tsx'
import { readDesktopBridge } from './bridge.ts'
import { DesktopShellController } from './controller.ts'
import { en, zh, type DesktopShellKey } from './locales.ts'

export type { DesktopShellKey } from './locales.ts'
export { DesktopShellController } from './controller.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'desktop-shell': DesktopShellKey
  }
}

const NS = 'desktop-shell'
export const inject = ['slots', 'locale', 'connection']

export function apply(ctx: Context): void {
  const bridge = readDesktopBridge()
  if (bridge === null) return
  const connection = ctx.get('connection') as ConnectionHandle
  bridge.shell.reportReadiness('client')
  ctx.effect(() => {
    const reportGeneration = (): void => {
      if (connection.generation.getSnapshot() !== undefined) {
        bridge.shell.reportReadiness('event-dispatch')
      }
    }
    reportGeneration()
    return connection.generation.subscribe(reportGeneration)
  }, 'ui-desktop-shell: readiness reporting')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-desktop-shell: dictionaries')
  const controller = new DesktopShellController(bridge)
  ctx.effect(() => {
    controller.start()
    return () => { controller.dispose() }
  }, 'ui-desktop-shell: bridge state')
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item', id: 'desktop-shell', order: 75, locale: NS,
    inject: () => ({ controller, icons: bridge.icons }),
  }, DesktopPreferencesRow))
}
