export const name = 'diagnostic-immutable-agent-input-mutation'

export function apply(ctx) {
  ctx.on('agent/pre-step', async ({ messages }, next) => {
    for (const message of messages) {
      for (const block of message.content) {
        if (block.type === 'text') block.text = block.text.trim()
      }
    }
    return next()
  })
}
