import { Service, type Context } from '@deepseek-ai/cordis'

/** Destination published to the settings shell, with a revision that distinguishes repeated requests. */
export interface SettingsNavigationRequest {
  sectionId: string
  subsectionId?: string
  revision: number
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    settingsNavigation: SettingsNavigation
  }
}

/** Process-local navigation channel owned by the settings domain. */
export class SettingsNavigation extends Service {
  private request: SettingsNavigationRequest | undefined
  private revision = 0
  private readonly listeners = new Set<() => void>()

  constructor(ctx: Context) {
    super(ctx, 'settingsNavigation')
  }

  /**
   * Publish a destination and advance its revision so subscribers handle repeated destinations.
   *
   * @param request - Settings section and optional subsection to open.
   */
  open(request: Omit<SettingsNavigationRequest, 'revision'>): void {
    this.revision += 1
    this.request = { ...request, revision: this.revision }
    for (const listener of this.listeners) listener()
  }

  /**
   * Read the latest request without consuming it.
   *
   * @returns The latest navigation request, or `undefined` before the first request.
   */
  getSnapshot: () => SettingsNavigationRequest | undefined = () => this.request

  /**
   * Subscribe to requests published after registration.
   *
   * @param listener - Callback invoked after the current request changes.
   * @returns A disposer that removes the callback.
   */
  subscribe: (listener: () => void) => () => void = (listener) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
}
