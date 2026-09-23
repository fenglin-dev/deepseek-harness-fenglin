import { staticLinked } from '../tsdown.client.ts'

export default staticLinked(
  '@deepseek-ai/dsh-client-web',
  ['src/index.ts', 'src/apply-injections.ts'],
)
