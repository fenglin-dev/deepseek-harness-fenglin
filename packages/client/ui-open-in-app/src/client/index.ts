/**
 * Browser half of open-in-app: one contribution to the official Session menu
 * whose submenu opens the session workspace directory (the summary's `cwd`)
 * in an installed application. Availability arrives once per page from the
 * host apps route; the last choice persists in the browser through the
 * controller's persisted snapshot store.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { OPEN_IN_APP_ICON_PREFIX } from '@deepseek-ai/dsh-host-open-in-app/shared'
import { OpenInAppController } from './controller.ts'
import { OpenInAppAction, type OpenInAppActionInjected } from './OpenInAppAction.tsx'
import { de, en, es, fr, ja, ko, NS, ptBR, ru, zh, type OpenInAppKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Session-header "open workspace in application" copy. */
    'open-in-app': OpenInAppKey
  }
}

export type { OpenInAppActionInjected, OpenInAppActionProps } from './OpenInAppAction.tsx'

/** Required services for locale registration and the header-slot contribution. */
export const inject = ['sessions', 'slots', 'locale']

/**
 * Client plugin body: register the dictionaries and the Session-menu item.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const controller = new OpenInAppController()
  void controller.load()
  ctx.effect(() => ctx.locale.register(NS, { zh, en, ja, ko, es, fr, de, 'pt-BR': ptBR, ru }), 'open-in-app: dictionaries')
  ctx.slots.inject('conversation.session.header.menu.item', () => ctx.slots.register({
    name: 'conversation.session.header.menu.item',
    id: 'open-in-app',
    order: -10,
    locale: NS,
    inject: (): OpenInAppActionInjected => ({
      hooks: {
        openInAppApps: controller.apps,
        openInAppChoice: controller.choice,
      },
      launch: (appId, path) => controller.launch(appId, path),
      choose: (appId) => { controller.choose(appId) },
      iconUrl: appId => `${OPEN_IN_APP_ICON_PREFIX}/${appId}`,
    }),
  }, OpenInAppAction))
}
