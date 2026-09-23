import { clientBundle } from '../../client/tsdown.client.ts'

export default clientBundle(
  '@deepseek-ai/dsh-custom-instructions',
  ['lib/types/index.js'],
  { hostPhase: true },
)
