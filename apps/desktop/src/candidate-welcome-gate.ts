/** Keep first-start welcome from hiding the renderer that validates a plugin candidate. */
export class CandidateWelcomeGate {
  #pendingUrl: string | undefined

  async serverReady(
    url: string,
    verifyingCandidate: boolean,
    actions: {
      loadClient(url: string): Promise<void>
      openWelcome(url: string): Promise<void>
    },
  ): Promise<void> {
    if (!verifyingCandidate) {
      this.#pendingUrl = undefined
      await actions.openWelcome(url)
      return
    }
    this.#pendingUrl = url
    await actions.loadClient(url)
  }

  async committed(openWelcome: (url: string) => Promise<void>): Promise<void> {
    const url = this.#pendingUrl
    this.#pendingUrl = undefined
    if (url !== undefined) await openWelcome(url)
  }

  rolledBack(): void {
    this.#pendingUrl = undefined
  }
}
