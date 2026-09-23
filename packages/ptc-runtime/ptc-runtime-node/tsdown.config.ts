import { defineConfig } from 'tsdown'

/** Separate entry bundles keep the private process bootstrap self-contained. */
export default defineConfig([
  { entry: ['src/index.ts'], outDir: 'lib', format: ['esm'], platform: 'node', target: 'es2024', fixedExtension: false, dts: false, clean: false },
  { entry: { process: 'src/process-entry.ts' }, outDir: 'lib', format: ['esm'], platform: 'node', target: 'es2024', fixedExtension: false, dts: false, clean: false, noExternal: ['@deepseek-ai/dsh-subprocess/control'] },
])
