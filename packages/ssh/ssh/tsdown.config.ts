import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { index: 'src/index.ts', protocol: 'src/protocol.ts', schemas: 'src/schemas.ts', helper: 'src/helper-entry.ts' },
  outDir: 'lib', format: ['esm'], platform: 'node', target: 'es2024', fixedExtension: false, dts: false, clean: false,
})
