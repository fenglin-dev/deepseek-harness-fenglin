import { defineConfig } from 'tsdown'

/**
 * The packer ships TWO entries: the library (`index`) and the `dsh-pack-vfs-image`
 * CLI (`bin`), the latter referenced by package.json `bin`. The root tsdown
 * builds only `src/index.ts`, so this override adds `src/bin.ts`.
 * Declarations come from `tsc -b` (dts: false), matching every package.
 */
export default defineConfig({
  entry: ['src/index.ts', 'src/bin.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
})
