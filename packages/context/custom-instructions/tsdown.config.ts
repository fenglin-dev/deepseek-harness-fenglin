import { clientBundle } from '../../client/tsdown.client.ts'

export default clientBundle(
  '@deepseek-ai/dsh-custom-instructions',
  ['src/index.ts'],
  { hostPhase: true },
)
