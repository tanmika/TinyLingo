import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/bin.ts'],
    format: ['esm'],
    outDir: 'dist',
    clean: true,
    sourcemap: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
  {
    entry: ['src/hook/entry.ts'],
    format: ['cjs'],
    outDir: 'dist/hook',
    sourcemap: true,
  },
]);
