/** Host settings-shell preferences stored in the active Profile. */
import type {} from '@deepseek-ai/dsh-settings'
import type { Volatile, Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** Runtime preferences projected to the browser. */
export interface Config {
  /** Last acknowledged welcome notice version. */
  welcomeNoticeVersion: Volatile<string | undefined>
  /** User-selected vertical order of settings sections. */
  sectionOrder: Volatile<string[]>
}

/** Live welcome preference. */
export const Config = z.object({
  welcomeNoticeVersion: z.string().volatile(),
  sectionOrder: z.array(z.string()).default([]).volatile(),
})

/** Keep the shell's navigation and welcome fields on its own form only. */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (child) => { child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)) })
}
