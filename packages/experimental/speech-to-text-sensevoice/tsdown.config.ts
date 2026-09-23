import { defineConfig } from 'tsdown'

export default defineConfig(['index', 'worker'].map(name => ({ entry: [`src/${name}.ts`], outDir: 'lib', format: ['esm'], platform: 'node', target: 'es2024', fixedExtension: false, dts: false, clean: false })))
