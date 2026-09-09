/**
 * Browser half: the `file` resource provider over `remote.workspaceFiles`.
 *
 * `types.ts` is what the protocol publishes, `change-feed.ts` shares one Host
 * `changes` stream per session, `provider.ts` turns it and `stat` into a value
 * stream, and this module only wires them into `ctx.resources`.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-gateway/client'
// The `sessions` service face supplies the current Session for absolute addresses.
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-resources/client'
import { ChangeFeed } from './change-feed.ts'
import { createFileResourceProvider, type SessionLookup } from './provider.ts'

export type { SessionLookup } from './provider.ts'
export type { WorkspaceFileParams, WorkspaceFileResource } from './types.ts'

/** Required browser services: the resource model, the Remote carrier and its namespace, and the Session list. */
export const inject = ['resources', 'remote', 'remote.workspaceFiles', 'sessions']

/**
 * Client plugin body: register the `file` provider for this plugin's lifetime.
 * @param ctx - client root context carrying `resources`, the Remote face, and `sessions`.
 */
export function apply(ctx: ClientContext): void {
  // The current Session changes with navigation; absolute addresses read it on demand.
  const sessions: SessionLookup = {
    current: () => ctx.sessions.list.getSnapshot().current,
  }
  const changes = new ChangeFeed(ctx.remote)
  const provider = createFileResourceProvider(ctx.remote, changes, sessions)
  ctx.effect(() => {
    const release = ctx.resources.register(provider)
    // Teardown waits for every session stream still closing, so the plugin
    // leaves no Host stream behind.
    return async () => {
      release()
      await changes.settle()
    }
  }, 'workspace-files: file resource provider')
}
