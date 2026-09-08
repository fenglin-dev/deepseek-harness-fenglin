export const name = 'diagnostic-legacy-session-api'

export function apply() {}

// This inert helper preserves the real failure signature for the read-only
// diagnostic scanner. The exercise never invokes it or external services.
export function inspectLegacyEvents(session) {
  for (const event of session.events) void event
}
