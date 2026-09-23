import type { UserConfig } from 'tsdown'
import { clientBundle } from '../../client/tsdown.client.ts'
import { profileWorkerBanner } from '../../tsdown.worker.ts'

const worker: UserConfig = {
  entry: { worker: 'src/worker/entry.ts' },
  outDir: 'lib',
  format: ['esm'],
  banner: profileWorkerBanner('esm'),
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  outputOptions: { inlineDynamicImports: true },
  deps: { neverBundle: specifier => (
    specifier === 'ws' || specifier === '@deepseek-ai/dsh-app-boot/worker/profile-resolution-bootstrap'
  ) },
}

/** Build the Host plugin and Worker during the Host pass, and the dynamic Client plugin during the Client pass. */
export default clientBundle(
  '@deepseek-ai/dsh-experimental-inspector',
  ['src/index.ts'],
  { hostPhase: true, companions: [worker] },
)
