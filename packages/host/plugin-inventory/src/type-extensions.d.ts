/**
 * Type extensions for upstream flaqai features not present in official 0.1.2-alpha.4.
 * These augment the official types to support the external tool management feature.
 */

// Extend ToolSubagent.Config with usageHint property
declare module '@deepseek-ai/dsh-tool-subagent' {
  interface Config {
    /**
     * Model-facing usage hint for this external tool instance.
     * Added by upstream flaqai for product-specific tool bindings (codex, claude-code).
     */
    usageHint?: string
  }
}

// Extend AgentPresets with external tool management methods
declare module '@deepseek-ai/dsh-agent-presets' {
  interface AgentPresets {
    /**
     * Register a projector that dynamically loads ToolSubagent plugins for external tools.
     * Added by upstream flaqai for product-specific tool bindings (codex, claude-code).
     * @param projector - Callback that receives (agent, toolId) and returns a dispose function
     * @returns Dispose function to unregister the projector
     */
    registerExternalToolProjector(
      projector: (agent: import('@deepseek-ai/dsh-agent').Agent, tool: string) => () => void
    ): () => void

    /**
     * Get the current state of external tools (codex, claude-code).
     * Added by upstream flaqai for product-specific tool bindings.
     * @returns Snapshot containing enablement state for each supported external tool
     */
    externalToolsState(): Promise<{
      readonly scope: 'complete-presets'
      readonly codex: boolean
      readonly claudeCode: boolean
    }>

    /**
     * Toggle an external tool's enablement state.
     * Added by upstream flaqai for product-specific tool bindings.
     * @param tool - External tool id ('codex' | 'claude-code')
     * @param enabled - Whether to enable or disable the tool
     * @returns Updated external tools snapshot
     */
    setExternalTool(
      tool: 'codex' | 'claude-code',
      enabled: boolean
    ): Promise<{
      readonly scope: 'complete-presets'
      readonly codex: boolean
      readonly claudeCode: boolean
    }>
  }
}